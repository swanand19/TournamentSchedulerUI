// Where the API is: VITE_API_BASE_URL, without a trailing slash.
//
// On the laptop the setting is usually "http://localhost:5080/api". Opened from another computer
// (a public link, a tester on the same Wi-Fi), "localhost" would be that computer, so nothing would
// load. When the setting names localhost and the page didn't, the API is taken to be on the same
// machine as the page: same port and path, the page's host name. A real address (production) is
// used as written.

const LOCAL = new Set(["localhost", "127.0.0.1", "[::1]"]);

function resolve(configured) {
  const base = (configured ?? "").replace(/\/+$/, "");
  if (typeof window === "undefined" || !base) return base;
  try {
    const url = new URL(base);
    const page = window.location.hostname;
    if (LOCAL.has(url.hostname) && !LOCAL.has(page)) {
      url.hostname = page;
      return url.toString().replace(/\/+$/, "");
    }
  } catch {
    // Not an absolute address (e.g. "/api"): it already follows the page.
  }
  return base;
}

export const API_BASE = resolve(import.meta.env.VITE_API_BASE_URL);
