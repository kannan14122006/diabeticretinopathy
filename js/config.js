// Backend base URL.
// Override without editing code: open the site with ?api=https://your-backend-url
// (the choice is remembered in this browser). Default is a backend running locally.
const DEFAULT_API_URL = "http://localhost:8000";

function resolveApiUrl() {
  const fromQuery = new URLSearchParams(location.search).get("api");
  try {
    if (fromQuery) localStorage.setItem("dr_api_url", fromQuery);
    return (fromQuery || localStorage.getItem("dr_api_url") || DEFAULT_API_URL).replace(/\/+$/, "");
  } catch {
    return (fromQuery || DEFAULT_API_URL).replace(/\/+$/, "");
  }
}

export const API_URL = resolveApiUrl();
