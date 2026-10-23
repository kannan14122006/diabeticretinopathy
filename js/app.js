import { api } from "./api.js";
import { initDiagnose } from "./diagnose.js";
import { loadDataset } from "./dataset.js";
import { loadModel } from "./model.js";
import { LESIONS, STAGES, gradeColor } from "./stages.js";
import { esc, themeCharts } from "./util.js";

const VIEWS = ["diagnose", "dataset", "model", "stages"];
const loaders = { dataset: loadDataset, model: loadModel };
const loaded = new Set();

function show(view) {
  if (!VIEWS.includes(view)) view = "diagnose";
  for (const v of VIEWS) document.getElementById(`view-${v}`).hidden = v !== view;
  document.querySelectorAll(".tabs a").forEach((a) => a.classList.toggle("active", a.dataset.view === view));
  if (loaders[view] && !loaded.has(view)) {
    loaded.add(view);
    loaders[view]();
  }
}

function renderStages() {
  document.getElementById("stages-content").innerHTML = `
    <div class="stage-list">
      ${STAGES.map((s) => `
        <article class="card stage" style="--c:${gradeColor(s.grade)}">
          <div class="grade-badge" style="--c:${gradeColor(s.grade)}">${s.grade}</div>
          <div>
            <h2>${esc(s.name)}
              <span class="tag group">${esc(s.group)}</span>
              <span class="tag ${s.referable ? "refer" : "norefer"}">${s.referable ? "Referable" : "Non-referable"}</span>
            </h2>
            <p>${esc(s.summary)}</p>
            <ul>${s.findings.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
            <p class="muted"><strong>Action:</strong> ${esc(s.action)}</p>
          </div>
        </article>`).join("")}
    </div>
    <div class="card section-gap">
      <h2>Lesions the model learns to detect</h2>
      <p class="muted">Microaneurysms and haemorrhages appear as red lesions. Hard and soft exudates appear as bright lesions.</p>
      <div class="lesions">
        ${LESIONS.map((l) => `<div class="lesion"><div class="kind">${esc(l.kind)}</div><strong>${esc(l.name)}</strong><p style="margin:4px 0 0">${esc(l.text)}</p></div>`).join("")}
      </div>
    </div>`;
}

async function pollHealth() {
  const pill = document.getElementById("api-status");
  const text = pill.querySelector(".text");
  try {
    const h = await api.health();
    pill.className = `status-pill ${h.model_loaded ? "ok" : "warn"}`;
    text.textContent = h.model_loaded ? `Model ready · ${h.arch} · ${h.device}` : "API up · model not trained";
    pill.title = h.model_error || (api.mode === "browser" ? "AI runs in your browser. Images never leave this device." : "Backend connected");
  } catch (err) {
    pill.className = "status-pill bad";
    text.textContent = api.mode === "browser" ? "Model failed to load" : "API offline";
    pill.title = err.message;
  }
}

document.querySelectorAll("[data-refresh]").forEach((btn) =>
  btn.addEventListener("click", () => loaders[btn.dataset.refresh]()));

themeCharts();
initDiagnose();
renderStages();
window.addEventListener("hashchange", () => show(location.hash.slice(1)));
show(location.hash.slice(1));
pollHealth(); // in browser mode this also starts downloading the model in the background
setInterval(pollHealth, api.mode === "browser" ? 60000 : 15000);
