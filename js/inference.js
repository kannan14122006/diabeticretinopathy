// In-browser DR grading with onnxruntime-web: no backend server needed.
// The ONNX graph (exported by dr-backend/deploy/export_onnx.py) already contains the
// lighting normalisation, disk mask, classifier and class activation maps, so this file
// only has to crop the black border and resize, mirroring app/preprocess.py.

const ORT_BASE = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/";
const MODEL_URL = new URL("../models/dr_model.onnx", import.meta.url).href;
const INFO_URL = new URL("../models/model_info.json", import.meta.url).href;
const MAX_DECODE_SIDE = 2048;

let loading = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Could not load the AI runtime. Check your internet connection."));
    document.head.appendChild(s);
  });
}

export function loadModel() {
  loading ??= (async () => {
    if (!window.ort) await loadScript(ORT_BASE + "ort.min.js");
    ort.env.wasm.wasmPaths = ORT_BASE;
    ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
    const infoRes = await fetch(INFO_URL);
    if (!infoRes.ok) throw new Error("Model files are missing from this site.");
    const info = await infoRes.json();
    const session = await ort.InferenceSession.create(MODEL_URL, { executionProviders: ["wasm"] });
    return { session, info };
  })().catch((err) => {
    loading = null; // allow a retry
    throw err;
  });
  return loading;
}

// ---------- preprocessing (mirrors app/preprocess.py) ----------

async function decodeImage(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This browser can't read that image. Please use a PNG or JPEG fundus photo.");
  }
  const scale = Math.min(1, MAX_DECODE_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return { data: ctx.getImageData(0, 0, w, h).data, w, h };
}

// Bounding box of pixels brighter than the black border (OpenCV RGB2GRAY fixed-point formula).
function cropBox({ data, w, h }, tol = 7) {
  let top = h, bottom = -1, left = w, right = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const gray = (data[i] * 4899 + data[i + 1] * 9617 + data[i + 2] * 1868 + 8192) >> 14;
      if (gray > tol) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  if (bottom < 0) return { x0: 0, y0: 0, cw: w, ch: h };
  return { x0: left, y0: top, cw: right - left + 1, ch: bottom - top + 1 };
}

// Area-averaging weights, equivalent to cv2.INTER_AREA when downscaling.
function areaWeights(nSrc, nDst) {
  const scale = nSrc / nDst;
  const out = [];
  for (let o = 0; o < nDst; o++) {
    const f0 = o * scale, f1 = (o + 1) * scale;
    const taps = [];
    for (let s = Math.floor(f0); s < Math.min(nSrc, Math.ceil(f1)); s++) {
      taps.push([s, (Math.min(s + 1, f1) - Math.max(s, f0)) / scale]);
    }
    out.push(taps);
  }
  return out;
}

// Crop + resize to size x size. Returns RGB uint8 (HWC) for display and float32 CHW for the model.
function cropResize(img, box, size) {
  const { data, w } = img;
  const { x0, y0, cw, ch } = box;
  const wx = areaWeights(cw, size);
  const wy = areaWeights(ch, size);

  const rows = new Float32Array(ch * size * 3); // horizontal pass
  for (let y = 0; y < ch; y++) {
    const rowBase = ((y0 + y) * w + x0) * 4;
    for (let ox = 0; ox < size; ox++) {
      let r = 0, g = 0, b = 0;
      for (const [sx, wt] of wx[ox]) {
        const i = rowBase + sx * 4;
        r += data[i] * wt;
        g += data[i + 1] * wt;
        b += data[i + 2] * wt;
      }
      const o = (y * size + ox) * 3;
      rows[o] = r;
      rows[o + 1] = g;
      rows[o + 2] = b;
    }
  }

  const rgb = new Uint8ClampedArray(size * size * 3);
  const chw = new Float32Array(3 * size * size);
  const plane = size * size;
  for (let oy = 0; oy < size; oy++) {
    for (let ox = 0; ox < size; ox++) {
      let r = 0, g = 0, b = 0;
      for (const [sy, wt] of wy[oy]) {
        const i = (sy * size + ox) * 3;
        r += rows[i] * wt;
        g += rows[i + 1] * wt;
        b += rows[i + 2] * wt;
      }
      const p = oy * size + ox;
      const vals = [Math.round(r), Math.round(g), Math.round(b)].map((v) => Math.min(255, Math.max(0, v)));
      for (let c = 0; c < 3; c++) {
        rgb[p * 3 + c] = vals[c];
        chw[c * plane + p] = vals[c];
      }
    }
  }
  return { rgb, chw };
}

// ---------- visualisation ----------

function toDataUrl(rgbAt, size) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const out = ctx.createImageData(size, size);
  for (let p = 0; p < size * size; p++) {
    const [r, g, b] = rgbAt(p);
    out.data[p * 4] = r;
    out.data[p * 4 + 1] = g;
    out.data[p * 4 + 2] = b;
    out.data[p * 4 + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.9);
}

const jet = (t) => [1.5 - Math.abs(4 * t - 3), 1.5 - Math.abs(4 * t - 2), 1.5 - Math.abs(4 * t - 1)]
  .map((v) => Math.round(255 * Math.min(1, Math.max(0, v))));

// ReLU + min-max normalise one class map, then bilinear upsample (cv2.resize INTER_LINEAR geometry).
function heatmap(cams, dims, grade, size) {
  const [, , h, w] = dims;
  const off = grade * h * w;
  const cam = Array.from(cams.slice(off, off + h * w), (v) => Math.max(0, v));
  const min = Math.min(...cam);
  const range = Math.max(...cam) - min + 1e-8;
  const norm = cam.map((v) => (v - min) / range);

  const out = new Float32Array(size * size);
  const sy = h / size, sx = w / size;
  for (let y = 0; y < size; y++) {
    const fy = Math.min(h - 1, Math.max(0, (y + 0.5) * sy - 0.5));
    const y0 = Math.floor(fy), y1 = Math.min(h - 1, y0 + 1), dy = fy - y0;
    for (let x = 0; x < size; x++) {
      const fx = Math.min(w - 1, Math.max(0, (x + 0.5) * sx - 0.5));
      const x0 = Math.floor(fx), x1 = Math.min(w - 1, x0 + 1), dx = fx - x0;
      out[y * size + x] =
        norm[y0 * w + x0] * (1 - dx) * (1 - dy) + norm[y0 * w + x1] * dx * (1 - dy) +
        norm[y1 * w + x0] * (1 - dx) * dy + norm[y1 * w + x1] * dx * dy;
    }
  }
  return out;
}

// ---------- public API (same response shape as the backend's /api/predict) ----------

export async function predictInBrowser(file) {
  const started = performance.now();
  const { session, info } = await loadModel();
  const size = info.image_size;

  const img = await decodeImage(file);
  const { rgb, chw } = cropResize(img, cropBox(img), size);

  const out = await session.run({ image: new ort.Tensor("float32", chw, [1, 3, size, size]) });
  const probs = Array.from(out.probs.data);
  const grade = probs.indexOf(Math.max(...probs));
  const heat = heatmap(out.cams.data, out.cams.dims, grade, size);
  const proc = out.processed.data;
  const plane = size * size;

  const refFrom = info.referable_from_grade ?? 2;
  return {
    grade,
    label: info.classes[grade],
    confidence: probs[grade],
    probabilities: probs.map((p, i) => ({ grade: i, label: info.classes[i], probability: p })),
    expected_grade: probs.reduce((acc, p, i) => acc + p * i, 0),
    referable: grade >= refFrom,
    referable_probability: probs.slice(refFrom).reduce((a, b) => a + b, 0),
    arch: info.arch,
    filename: file.name,
    images: {
      original: toDataUrl((p) => [rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]], size),
      processed: toDataUrl((p) => [proc[p], proc[plane + p], proc[2 * plane + p]], size),
      gradcam: toDataUrl((p) => {
        const c = jet(heat[p]);
        return [0, 1, 2].map((k) => Math.round(0.55 * rgb[p * 3 + k] + 0.45 * c[k]));
      }, size),
    },
    inference_ms: Math.round(performance.now() - started),
  };
}

export async function browserHealth() {
  const { info } = await loadModel();
  return {
    status: "ok",
    model_loaded: true,
    model_error: null,
    arch: info.arch,
    image_size: info.image_size,
    device: "in-browser",
    checkpoint_epoch: info.epoch,
    checkpoint_val_kappa: info.val_kappa,
    classes: info.classes,
    referable_from_grade: info.referable_from_grade,
  };
}
