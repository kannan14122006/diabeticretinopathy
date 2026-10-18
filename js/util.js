export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const pct = (v, digits = 1) => (v == null ? "–" : `${(v * 100).toFixed(digits)}%`);

export const fmt = (v, digits = 3) => (v == null ? "–" : Number(v).toFixed(digits));

export const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export const gradeHex = (g) => cssVar(`--g${g}`);

export function kpi(label, value, hint = "") {
  return `<div class="kpi"><div class="label">${esc(label)}</div><div class="value">${value}</div>${
    hint ? `<div class="hint">${esc(hint)}</div>` : ""
  }</div>`;
}

export function emptyState(title, message, command) {
  return `<div class="card empty-state">
    <h2>${esc(title)}</h2>
    <p class="muted">${esc(message)}</p>
    ${command ? `<p>Run this in the <code>dr-backend</code> folder:</p><pre>${esc(command)}</pre>` : ""}
  </div>`;
}

// Chart.js defaults that follow the light/dark theme.
export function themeCharts() {
  if (!window.Chart) return;
  Chart.defaults.color = cssVar("--muted");
  Chart.defaults.borderColor = cssVar("--border");
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  Chart.defaults.maintainAspectRatio = false;
}

const charts = new Map();
export function renderChart(canvasId, config) {
  charts.get(canvasId)?.destroy();
  const el = document.getElementById(canvasId);
  if (!el || !window.Chart) return;
  charts.set(canvasId, new Chart(el, config));
}
