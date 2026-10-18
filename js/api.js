import { API_URL } from "./config.js";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, options) {
  let res;
  try {
    res = await fetch(API_URL + path, options);
  } catch {
    throw new ApiError(`Cannot reach the backend at ${API_URL}. Is it running?`, 0);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.detail || `Request failed (${res.status})`, res.status);
  return body;
}

export const api = {
  health: () => request("/api/health"),
  datasetStats: () => request("/api/dataset/stats"),
  metrics: () => request("/api/model/metrics"),
  predict: (file) => {
    const form = new FormData();
    form.append("file", file);
    return request("/api/predict", { method: "POST", body: form });
  },
};
