import { useCallback, useEffect, useRef, useState } from "react";
import { LIVE_POLL_MS, useLive } from "../realtime/useLive";

// Loads something now and again every `ms` while the tab is visible — how the watcher's screen
// follows the scorer. Only the newest answer may land, so a slow reply never overwrites a newer one.
// `load` must be stable (useCallback); a new one means a fresh load. With a live `topic`
// (realtime/useLive.js) it also loads when nudged, and polls only slowly while the line is open.

export function usePoll(load, ms, enabled = true, topic = null) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const ticket = useRef(0);

  const run = useCallback(async () => {
    const mine = ++ticket.current;
    try {
      const value = await load();
      if (mine !== ticket.current) return;
      setData(value);
      setError("");
    } catch (e) {
      if (mine === ticket.current) setError(e.message);
    }
  }, [load]);

  const live = useLive(enabled ? topic : null, run);
  const every = ms && live ? Math.max(ms, LIVE_POLL_MS) : ms;

  useEffect(() => {
    if (!enabled) return undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the first load, as Home does
    run();
  }, [run, enabled]);

  useEffect(() => {
    if (!enabled || !every) return undefined;
    const timer = setInterval(() => {
      if (!document.hidden) run();
    }, every);
    return () => clearInterval(timer);
  }, [run, every, enabled]);

  return { data, error, reload: run };
}
