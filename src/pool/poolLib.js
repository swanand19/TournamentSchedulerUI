import { useCallback, useEffect, useRef, useState } from "react";
import { parseUtc } from "../footballClock";
import { LIVE_POLL_MS, useLive } from "../realtime/useLive";

// Helpers and hooks shared by the pool, draw and auction screens and the hall's TV board.

/** 1,250 — Indian grouping, as the phone app writes amounts. */
export const amount = (n) => (n ?? 0).toLocaleString("en-IN");
export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const initials = (name) =>
  (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

/**
 * A live auction or draw: loaded now, again on every nudge of the tournament's live line (bids,
 * sales, names landing), and every few seconds while the line is down. Each answer carries the
 * server's clock; `offset` turns the browser's clock into the server's, so every screen counts down
 * to the same moment. `set` takes an action's answer, and a slower poll can't overwrite it.
 * `topic` null (the public TV board) just polls.
 */
export function useLiveState(load, { tournamentId = null, ms = 4000, enabled = true } = {}) {
  const [state, setState] = useState({ data: null, error: "", offset: 0 });
  const ticket = useRef(0);

  const accept = useCallback((value) => {
    const server = parseUtc(value?.serverNow)?.getTime();
    setState({ data: value, error: "", offset: server ? server - Date.now() : 0 });
  }, []);

  const reload = useCallback(async () => {
    const mine = ++ticket.current;
    try {
      const value = await load();
      if (mine === ticket.current) accept(value);
    } catch (e) {
      if (mine === ticket.current) setState((s) => ({ ...s, error: e.message }));
    }
  }, [load, accept]);

  const set = useCallback(
    (value) => {
      ticket.current++;
      accept(value);
    },
    [accept]
  );

  const live = useLive(enabled && tournamentId ? { kind: "tournament", tournamentId } : null, reload);
  const every = live ? LIVE_POLL_MS : ms;

  useEffect(() => {
    if (!enabled) return undefined;
    reload();
    const timer = setInterval(() => !document.hidden && reload(), every);
    return () => clearInterval(timer);
  }, [reload, every, enabled]);

  return { ...state, set, reload, live };
}

/** The server's time now, ticking while `on`. */
export function useServerNow(offset, on, ms = 200) {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    if (!on) return undefined;
    const tick = () => setNow(Date.now() + offset);
    tick();
    const timer = setInterval(tick, ms);
    return () => clearInterval(timer);
  }, [offset, on, ms]);
  return now;
}

/** Runs one action at a time (a double click can't send two) and keeps its error to show beside it. */
export function useRun() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const running = useRef(false);
  const run = useCallback(async (fn) => {
    if (running.current) return null;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      return await fn();
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, []);
  return { busy, error, run, clear: () => setError("") };
}

export const sportClass = (sport) => (sport === "Cricket" ? "ck" : "fb");
