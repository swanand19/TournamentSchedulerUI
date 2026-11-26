import { useRef, useState } from "react";

// Styles and the request runner shared by the lasting-team screens (kept out of parts.jsx so that file holds components only).

/** The phone's pill buttons: the tinted primary, a glass (dark) or outlined (light) secondary, danger. */
export const button = (theme, kind = "primary") => ({
  minHeight: 44,
  border: kind === "secondary" ? "1px solid var(--glass-line)" : "1px solid transparent",
  borderRadius: 22,
  padding: "0 18px",
  fontWeight: "var(--w-strong)",
  fontSize: 15,
  cursor: "pointer",
  background: kind === "primary" ? theme.accentGradient : kind === "danger" ? "var(--danger-solid)" : "var(--glass)",
  color: kind === "primary" ? theme.accentInk : kind === "danger" ? "#fff" : theme.ink,
});

export const input = {
  flex: "1 1 200px",
  minHeight: 48,
  padding: "0 14px",
  borderRadius: 14,
  border: "1px solid var(--field-line)",
  fontSize: 15,
  boxSizing: "border-box",
};

export const label = (theme) => ({ display: "block", fontSize: 13, fontWeight: 600, color: theme.muted, marginBottom: 6 });

/** One request at a time per screen; the server's message lands in `error`. */
export function useRun() {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const run = async (what, action) => {
    if (inFlight.current) return undefined;
    inFlight.current = true;
    setBusy(what);
    setError("");
    try {
      return await action();
    } catch (e) {
      setError(e.message);
      return undefined;
    } finally {
      inFlight.current = false;
      setBusy("");
    }
  };
  return { busy, error, setError, run };
}

export const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
