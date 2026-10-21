import { useCallback, useEffect, useRef, useState } from "react";

// Loads something now and again every `ms` while the tab is visible — how the watcher's screen
// follows the scorer. Only the newest answer may land, so a slow reply never overwrites a newer one.
// `load` must be stable (useCallback); a new one means a fresh load.

export function usePoll(load, ms, enabled = true) {
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

  useEffect(() => {
    if (!enabled) return undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the first load, as Home does
    run();
    if (!ms) return undefined;
    const timer = setInterval(() => {
      if (!document.hidden) run();
    }, ms);
    return () => clearInterval(timer);
  }, [run, ms, enabled]);

  return { data, error, reload: run };
}
