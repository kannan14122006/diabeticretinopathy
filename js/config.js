// Where predictions run.
//   Default: in the browser (onnxruntime-web). No backend needed, works on GitHub Pages.
//   Optional: a dr-backend server. Open the site with ?api=https://your-backend-url
//   (remembered in this browser). ?api=local switches back to in-browser mode.
function resolveApiUrl() {
  const fromQuery = new URLSearchParams(location.search).get("api");
  try {
    if (fromQuery === "local") localStorage.removeItem("dr_api_url");
    else if (fromQuery) localStorage.setItem("dr_api_url", fromQuery);
    return (localStorage.getItem("dr_api_url") || "").replace(/\/+$/, "");
  } catch {
    return fromQuery && fromQuery !== "local" ? fromQuery.replace(/\/+$/, "") : "";
  }
}

// Empty string = in-browser mode.
export const API_URL = resolveApiUrl();
