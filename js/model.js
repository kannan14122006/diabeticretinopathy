import { api } from "./api.js";
import { STAGES, gradeColor } from "./stages.js";
import { cssVar, emptyState, esc, fmt, kpi, pct, renderChart } from "./util.js";

export async function loadModel() {
  const root = document.getElementById("model-content");
  root.innerHTML = `<div class="loading">Loading model metrics…</div>`;
  let m;
  try {
    m = await api.metrics();
  } catch (err) {
    root.innerHTML = err.status === 404
      ? emptyState("No trained model yet", err.message,
          "python -m training.train --csv data/aptos/train.csv --images-dir data/aptos/train_images --epochs 15")
      : emptyState("Couldn't load model metrics", err.message);
    return;
  }

  const b = m.best;
  const cm = b.confusion_matrix;
  const rowMax = cm.map((row) => Math.max(1, row.reduce((a, v) => a + v, 0)));

  root.innerHTML = `
    <div class="kpis">
      ${kpi("Quadratic kappa", fmt(b.quadratic_kappa), "primary metric")}
      ${kpi("Accuracy", pct(b.accuracy))}
      ${kpi("Macro F1", pct(b.macro_f1))}
      ${kpi("Macro AUC", b.macro_auc_ovr == null ? "–" : pct(b.macro_auc_ovr), "one-vs-rest")}
      ${kpi("Referable sensitivity", pct(b.referable.sensitivity), "grade ≥ 2 detected")}
      ${kpi("Referable specificity", pct(b.referable.specificity))}
    </div>

    <div class="grid cols-2">
      <div class="card">
        <h2>Confusion matrix</h2>
        <p class="muted">Rows show the true grade and columns the predicted grade. Colour shows the row-normalised rate.</p>
        <div class="table-wrap">
          <table class="confusion">
            <thead><tr><th class="axis">true ↓ / pred →</th>${STAGES.map((s) => `<th class="axis">${s.grade}</th>`).join("")}</tr></thead>
            <tbody>${cm.map((row, i) => `
              <tr><th class="axis">${i} · ${esc(STAGES[i].name.replace(" NPDR", ""))}</th>
              ${row.map((v, j) => {
                const rate = v / rowMax[i];
                const base = i === j ? cssVar("--ok") : cssVar("--bad");
                return `<td class="cell" title="${v} of ${rowMax[i]} (${(rate * 100).toFixed(1)}%)" style="background:color-mix(in srgb, ${base} ${Math.round(rate * 85)}%, var(--surface-2))">${v}</td>`;
              }).join("")}</tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <h2>Per-level results</h2>
        <div class="table-wrap"><table>
          <thead><tr><th>Stage</th><th class="num">Precision</th><th class="num">Recall</th><th class="num">F1</th><th class="num">Support</th></tr></thead>
          <tbody>${b.per_class.map((c) => `
            <tr><td><span class="swatch" style="--c:${gradeColor(c.grade)}"></span>${esc(STAGES[c.grade].name)}</td>
            <td class="num">${pct(c.precision)}</td><td class="num">${pct(c.recall)}</td><td class="num">${pct(c.f1)}</td><td class="num">${c.support}</td></tr>`).join("")}
          </tbody>
        </table></div>
        <h3 class="section-gap">Referable DR (binary screening)</h3>
        <div class="table-wrap"><table><tbody>
          <tr><td>Accuracy</td><td class="num">${pct(b.referable.accuracy)}</td></tr>
          <tr><td>Sensitivity (recall)</td><td class="num">${pct(b.referable.sensitivity)}</td></tr>
          <tr><td>Specificity</td><td class="num">${pct(b.referable.specificity)}</td></tr>
          <tr><td>AUC</td><td class="num">${b.referable.auc == null ? "–" : pct(b.referable.auc)}</td></tr>
        </tbody></table></div>
      </div>
    </div>

    <div class="grid cols-2 section-gap">
      <div class="card"><h2>Loss</h2><div class="chart-box"><canvas id="m-loss"></canvas></div></div>
      <div class="card"><h2>Validation kappa &amp; accuracy</h2><div class="chart-box"><canvas id="m-score"></canvas></div></div>
    </div>

    <div class="card section-gap">
      <h2>Training setup</h2>
      <div class="table-wrap"><table><tbody>
        <tr><td>Architecture</td><td>${esc(m.arch)} (ImageNet pre-trained, transfer learning)</td></tr>
        <tr><td>Input size</td><td>${m.image_size} × ${m.image_size}</td></tr>
        <tr><td>Dataset</td><td>${esc(m.dataset)}: ${m.train_images} train / ${m.val_images} validation (stratified)</td></tr>
        <tr><td>Best epoch</td><td>${b.epoch} of ${m.epochs}</td></tr>
        <tr><td>Trained</td><td>${new Date(m.trained_at).toLocaleString()}</td></tr>
      </tbody></table></div>
    </div>`;

  const epochs = m.history.map((h) => h.epoch);
  const line = (label, data, color, dash) => ({ label, data, borderColor: color, backgroundColor: color, tension: 0.3, pointRadius: 3, borderDash: dash ? [6, 4] : [] });
  renderChart("m-loss", {
    type: "line",
    data: { labels: epochs, datasets: [line("Train loss", m.history.map((h) => h.train_loss), cssVar("--accent")), line("Val loss", m.history.map((h) => h.val_loss), cssVar("--muted"), true)] },
    options: { interaction: { mode: "index", intersect: false }, scales: { x: { title: { display: true, text: "Epoch" } } } },
  });
  renderChart("m-score", {
    type: "line",
    data: { labels: epochs, datasets: [line("Quadratic kappa", m.history.map((h) => h.val_kappa), cssVar("--g2")), line("Accuracy", m.history.map((h) => h.val_accuracy), cssVar("--g0"), true)] },
    options: { interaction: { mode: "index", intersect: false }, scales: { y: { min: 0, max: 1 }, x: { title: { display: true, text: "Epoch" } } } },
  });
}
