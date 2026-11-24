import { useRef, useState } from "react";

// Styles and the request runner shared by the lasting-team screens (kept out of parts.jsx so that file holds components only).

export const button = (theme, kind = "primary") => ({
  minHeight: 44,
  border: kind === "secondary" ? `1.5px solid ${theme.ink}33` : "none",
  borderRadius: 8,
  padding: "0.55rem 1.1rem",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
  background: kind === "primary" ? theme.accent : kind === "danger" ? "#b3261e" : "transparent",
  color: kind === "primary" ? theme.accentInk : kind === "danger" ? "#fff" : theme.ink,
});

export const input = {
  flex: "1 1 200px",
  minHeight: 44,
  padding: "0.6rem 0.8rem",
  borderRadius: 8,
  border: "1.5px solid #d8d4c8",
  fontSize: 14,
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
