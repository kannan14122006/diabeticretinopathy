import { api } from "./api.js";
import { STAGES, gradeColor } from "./stages.js";
import { esc, pct } from "./util.js";

const $ = (id) => document.getElementById(id);
let currentFile = null;
let previewUrl = null;

export function initDiagnose() {
  const input = $("file-input");
  const zone = $("dropzone");

  input.addEventListener("change", () => input.files[0] && selectFile(input.files[0]));
  ["dragenter", "dragover"].forEach((e) =>
    zone.addEventListener(e, (ev) => { ev.preventDefault(); zone.classList.add("drag"); }));
  ["dragleave", "drop"].forEach((e) =>
    zone.addEventListener(e, (ev) => { ev.preventDefault(); zone.classList.remove("drag"); }));
  zone.addEventListener("drop", (ev) => {
    const file = ev.dataTransfer.files[0];
    if (file) selectFile(file);
  });

  $("analyze-btn").addEventListener("click", analyze);
  $("clear-btn").addEventListener("click", clear);
}

function selectFile(file) {
  if (!file.type.startsWith("image/") && !/\.(tiff?|png|jpe?g)$/i.test(file.name)) {
    showError("Please choose an image file.");
    return;
  }
  currentFile = file;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  $("preview").src = previewUrl;
  $("preview").hidden = false;
  document.querySelector(".dz-empty").hidden = true;
  $("file-meta").textContent = `${file.name} · ${(file.size / 1024).toFixed(0)} KB`;
  $("analyze-btn").disabled = false;
  $("clear-btn").disabled = false;
}

function clear() {
  currentFile = null;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  $("file-input").value = "";
  $("preview").hidden = true;
  $("preview").removeAttribute("src");
  document.querySelector(".dz-empty").hidden = false;
  $("file-meta").textContent = "";
  $("analyze-btn").disabled = true;
  $("clear-btn").disabled = true;
  $("visuals").hidden = true;
  $("result").innerHTML = `<div class="placeholder"><p>Choose an image to grade.</p></div>`;
}

async function analyze() {
  if (!currentFile) return;
  $("analyze-btn").disabled = true;
  $("visuals").hidden = true;
  $("result").innerHTML = `<div class="placeholder"><div class="spinner"></div><p>Preprocessing and grading the image… (the first run also downloads the 16 MB model)</p></div>`;
  try {
    renderResult(await api.predict(currentFile));
  } catch (err) {
    showError(err.message, err.status === 503);
  } finally {
    $("analyze-btn").disabled = !currentFile;
  }
}

function showError(message, notTrained = false) {
  $("result").innerHTML = `<div class="banner error"><div><strong>${notTrained ? "Model not available" : "Couldn't analyze the image"}</strong>${esc(message)}</div></div>`;
}

function renderResult(r) {
  const stage = STAGES[r.grade];
  const sorted = [...r.probabilities].sort((a, b) => b.probability - a.probability);
  const runnerUp = sorted[1];
  // Marker position on the 0-4 scale, centred on each segment.
  const markerLeft = ((r.expected_grade + 0.5) / 5) * 100;

  $("result").innerHTML = `
    <div class="verdict">
      <div class="grade-badge" style="--c:${gradeColor(r.grade)}">${r.grade}</div>
      <div>
        <div class="sub">Predicted severity level</div>
        <h2>${esc(stage.name)}</h2>
        <div class="sub">Confidence ${pct(r.confidence)} · next most likely: ${esc(STAGES[runnerUp.grade].name)} (${pct(runnerUp.probability)})</div>
      </div>
    </div>

    ${r.referable
      ? `<div class="banner refer"><div><strong>Referable DR: refer to an ophthalmologist</strong>${esc(stage.action)}</div></div>`
      : `<div class="banner ok"><div><strong>Non-referable</strong>${esc(stage.action)}</div></div>`}

    <div class="scale" aria-label="Severity scale">
      <div class="scale-track">
        ${STAGES.map((s) => `<div class="scale-seg ${s.grade === r.grade ? "on" : ""}" style="--c:${gradeColor(s.grade)}"></div>`).join("")}
        <div class="scale-marker" style="left:${markerLeft}%" title="Expected grade ${r.expected_grade.toFixed(2)}"></div>
      </div>
      <div class="scale-labels">
        ${STAGES.map((s) => `<span class="${s.grade === r.grade ? "on" : ""}">${s.grade} · ${esc(s.name.replace(" NPDR", ""))}</span>`).join("")}
      </div>
    </div>

    <div class="probs">
      ${r.probabilities.map((p) => `
        <div class="prob-row ${p.grade === r.grade ? "top" : ""}">
          <span><span class="swatch" style="--c:${gradeColor(p.grade)}"></span>${esc(STAGES[p.grade].name)}</span>
          <div class="bar"><span style="--c:${gradeColor(p.grade)};width:${(p.probability * 100).toFixed(1)}%"></span></div>
          <span class="num">${pct(p.probability)}</span>
        </div>`).join("")}
    </div>

    <div class="advice">
      <strong>Typical findings at this stage</strong>
      <ul>${stage.findings.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
      <p class="muted" style="margin-top:10px">Referable probability (grade ≥ 2): <strong>${pct(r.referable_probability)}</strong> · expected grade ${r.expected_grade.toFixed(2)} · model ${esc(r.arch)}${r.inference_ms != null ? ` · ${r.inference_ms} ms` : ""}</p>
    </div>`;

  $("visuals").innerHTML = `
    <h2>What the model looked at</h2>
    <p class="muted">The Grad-CAM heatmap marks the retina regions that pushed the model towards <strong>${esc(stage.name)}</strong>. Red is most influential. Lesions such as haemorrhages and exudates should usually light up.</p>
    <div class="triptych">
      <figure><img src="${r.images.original}" alt="Cropped fundus" /><figcaption><strong>Input</strong>Black border cropped, resized</figcaption></figure>
      <figure><img src="${r.images.processed}" alt="Preprocessed fundus" /><figcaption><strong>Preprocessed</strong>Local average colour subtracted, which brings out lesions</figcaption></figure>
      <figure><img src="${r.images.gradcam}" alt="Grad-CAM heatmap" /><figcaption><strong>Grad-CAM</strong>Regions that drove the prediction</figcaption></figure>
    </div>`;
  $("visuals").hidden = false;
}
