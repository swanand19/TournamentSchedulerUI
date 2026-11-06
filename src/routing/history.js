// The browser history, kept as the app's own Back buttons expect. Every entry this app makes carries
// its place (`idx`), and the paths are remembered per tab, so an in-app "Back" to the screen just
// before is the browser's Back, not a new entry: Back and Forward then walk the same trail.
// Storage can be missing (private windows, blocked site data); without it the trail is just this page load's.

const KEY = "ts.history";

function readTrail() {
  try {
    const trail = JSON.parse(sessionStorage.getItem(KEY));
    return Array.isArray(trail) ? trail : [];
  } catch {
    return [];
  }
}

function writeTrail(trail) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(trail));
  } catch {
    // The trail only saves a history entry or two; nothing breaks without it.
  }
}

let index = 0;

/** Once, before anything else: adopts the entry the page was loaded on (a fresh one starts a new trail). */
export function startHistory() {
  const idx = window.history.state?.idx;
  if (Number.isInteger(idx)) {
    index = idx;
  } else {
    index = 0;
    window.history.replaceState({ idx: 0 }, "", window.location.href);
    writeTrail([]);
  }
  const trail = readTrail();
  trail[index] = window.location.pathname;
  writeTrail(trail);
}

/** Shows `path` in the address bar: a new entry, the one before (when that's where we're going), or in place. */
export function showPath(path, { replace = false } = {}) {
  if (path === window.location.pathname) return;
  const trail = readTrail();
  if (replace) {
    window.history.replaceState({ idx: index }, "", path);
    trail[index] = path;
  } else if (index > 0 && trail[index - 1] === path) {
    window.history.back(); // the popstate handler moves `index`
    return;
  } else {
    index += 1;
    trail.length = index;
    trail[index] = path;
    window.history.pushState({ idx: index }, "", path);
  }
  writeTrail(trail);
}

/** Calls `handler(pathname)` when Back or Forward lands on another entry. Answers the unsubscribe. */
export function onHistoryMove(handler) {
  const listener = (e) => {
    index = Number.isInteger(e.state?.idx) ? e.state.idx : 0;
    handler(window.location.pathname);
  };
  window.addEventListener("popstate", listener);
  return () => window.removeEventListener("popstate", listener);
}
