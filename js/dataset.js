import { api } from "./api.js";
import { STAGES, gradeColor } from "./stages.js";
import { emptyState, esc, gradeHex, kpi, renderChart, cssVar } from "./util.js";

export async function loadDataset() {
  const root = document.getElementById("dataset-content");
  root.innerHTML = `<div class="loading">Loading dataset statistics…</div>`;
  let s;
  try {
    s = await api.datasetStats();
  } catch (err) {
    root.innerHTML = err.status === 404
      ? emptyState("No dataset analysed yet", err.message,
          "python -m training.analyze_dataset --csv data/aptos/train.csv --images-dir data/aptos/train_images --name \"APTOS 2019\"")
      : emptyState("Couldn't load dataset statistics", err.message);
    return;
  }

  const w = s.image_size.width, h = s.image_size.height;
  root.innerHTML = `
    <div class="kpis">
      ${kpi("Dataset", esc(s.dataset))}
      ${kpi("Total images", s.total_images.toLocaleString())}
      ${kpi("Severity levels", s.num_classes, "ICDR grades 0–4")}
      ${kpi("Imbalance ratio", `${s.imbalance_ratio}×`, `${s.majority_class} vs ${s.minority_class}`)}
      ${kpi("Referable DR", `${s.binary.referable_percent}%`, `grade ≥ ${s.binary.referable_from_grade}`)}
    </div>

    <div class="grid cols-2">
      <div class="card">
        <h2>Images per severity level</h2>
        <div class="chart-box"><canvas id="ds-dist"></canvas></div>
      </div>
      <div class="card">
        <h2>Referable vs non-referable</h2>
        <div class="chart-box"><canvas id="ds-binary"></canvas></div>
      </div>
    </div>

    <div class="grid cols-2 section-gap">
      <div class="card">
        <h2>Class breakdown</h2>
        <div class="table-wrap"><table>
          <thead><tr><th>Grade</th><th>Stage</th><th class="num">Images</th><th class="num">Share</th></tr></thead>
          <tbody>${s.classes.map((c) => `
            <tr><td><span class="swatch" style="--c:${gradeColor(c.grade)}"></span>${c.grade}</td>
            <td>${esc(STAGES[c.grade].name)}</td><td class="num">${c.count.toLocaleString()}</td><td class="num">${c.percent}%</td></tr>`).join("")}
          </tbody>
        </table></div>
        <p class="muted section-gap">The classes are heavily imbalanced, so plain accuracy is misleading. Training uses inverse-frequency class weights, and the model is judged by quadratic kappa and macro F1 (survey §V-A).</p>
      </div>
      <div class="card">
        <h2>Image properties</h2>
        <p class="muted">Measured on a random sample of ${s.image_size.sampled} images.</p>
        <div class="table-wrap"><table>
          <thead><tr><th></th><th class="num">Min</th><th class="num">Median</th><th class="num">Mean</th><th class="num">Max</th></tr></thead>
          <tbody>
            <tr><td>Width (px)</td><td class="num">${w.min}</td><td class="num">${w.median}</td><td class="num">${w.mean.toFixed(0)}</td><td class="num">${w.max}</td></tr>
            <tr><td>Height (px)</td><td class="num">${h.min}</td><td class="num">${h.median}</td><td class="num">${h.mean.toFixed(0)}</td><td class="num">${h.max}</td></tr>
          </tbody>
        </table></div>
        <p class="muted section-gap">${s.image_size.unique_resolutions} distinct resolutions. Every image is cropped to the retina disk and resized to one input size before training.</p>
        <div class="chart-box" style="height:200px"><canvas id="ds-bright"></canvas></div>
      </div>
    </div>

    <div class="card section-gap">
      <h2>Sample images per level</h2>
      <div class="examples">
        ${STAGES.map((st) => `
          <div class="example-row">
            <h3><span class="swatch" style="--c:${gradeColor(st.grade)}"></span>${st.grade} · ${esc(st.name)}</h3>
            <div class="example-strip">
              ${(s.examples?.[st.grade] || []).map((src) => `<img src="${src}" alt="${esc(st.name)} example" loading="lazy" />`).join("") || `<span class="muted">No examples</span>`}
            </div>
          </div>`).join("")}
      </div>
    </div>
    <p class="muted section-gap">Generated ${new Date(s.generated_at).toLocaleString()}</p>`;

  const colors = s.classes.map((c) => gradeHex(c.grade));
  renderChart("ds-dist", {
    type: "bar",
    data: { labels: s.classes.map((c) => STAGES[c.grade].name), datasets: [{ data: s.classes.map((c) => c.count), backgroundColor: colors, borderRadius: 6 }] },
    options: {
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.raw.toLocaleString()} images (${s.classes[ctx.dataIndex].percent}%)` } } },
      scales: { y: { beginAtZero: true, title: { display: true, text: "Images" } }, x: { grid: { display: false } } },
    },
  });
  renderChart("ds-binary", {
    type: "doughnut",
    data: {
      labels: ["Non-referable (0–1)", "Referable (2–4)"],
      datasets: [{ data: [s.binary.non_referable, s.binary.referable], backgroundColor: [cssVar("--g0"), cssVar("--g4")], borderColor: cssVar("--surface"), borderWidth: 3 }],
    },
    options: { cutout: "62%", plugins: { legend: { position: "bottom" } } },
  });
  renderChart("ds-bright", {
    type: "bar",
    data: {
      labels: s.mean_brightness_by_class.map((b) => `Grade ${b.grade}`),
      datasets: [{ label: "Mean brightness (0–255)", data: s.mean_brightness_by_class.map((b) => b.mean), backgroundColor: colors, borderRadius: 4 }],
    },
    options: {
      indexAxis: "y",
      plugins: { legend: { display: false }, title: { display: true, text: "Mean image brightness by grade" } },
      scales: { x: { beginAtZero: true, max: 255 }, y: { grid: { display: false } } },
    },
  });
}
