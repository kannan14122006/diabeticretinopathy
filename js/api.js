import { API_URL } from "./config.js";
import { browserHealth, predictInBrowser } from "./inference.js";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(url, options) {
  let res;
  try {
    res = await fetch(url, options);
  } catch {
    throw new ApiError(API_URL ? `Cannot reach the backend at ${API_URL}. Is it running?` : "Network error. Check your connection.", 0);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.detail || `Request failed (${res.status})`, res.status);
  return body;
}

// Turn in-browser failures into ApiErrors so the views handle both modes alike.
const wrap = (fn) => async (...args) => {
  try {
    return await fn(...args);
  } catch (err) {
    throw err instanceof ApiError ? err : new ApiError(err.message || String(err), 500);
  }
};

const remote = {
  mode: "server",
  health: () => request(`${API_URL}/api/health`),
  datasetStats: () => request(`${API_URL}/api/dataset/stats`),
  metrics: () => request(`${API_URL}/api/model/metrics`),
  predict: (file) => {
    const form = new FormData();
    form.append("file", file);
    return request(`${API_URL}/api/predict`, { method: "POST", body: form });
  },
};

const browser = {
  mode: "browser",
  health: wrap(browserHealth),
  datasetStats: () => request(new URL("../data/dataset_stats.json", import.meta.url)),
  metrics: () => request(new URL("../data/metrics.json", import.meta.url)),
  predict: wrap(predictInBrowser),
};

export const api = API_URL ? remote : browser;
