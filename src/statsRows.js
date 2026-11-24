import { useState } from "react";

// Helpers for the stats tables (PlayerLines.jsx): which boards unfold, and which rows are open.

/** Which of a player's lines each football board unfolds into; the others don't unfold. */
export function footballUnfold(boardKey) {
  if (boardKey === "goals") return { kinds: ["goals"], noun: "goals" };
  if (boardKey === "assists") return { kinds: ["assists"], noun: "assists" };
  if (boardKey === "goalContributions") return { kinds: ["goals", "assists"], noun: "goals and assists" };
  return null;
}

/** Remembers which rows are open on one board. */
export function useOpenRows(boardKey) {
  const [open, setOpen] = useState({ board: boardKey, keys: new Set() });
  const keys = open.board === boardKey ? open.keys : new Set();
  const toggle = (key) =>
    setOpen(() => {
      const next = new Set(keys);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { board: boardKey, keys: next };
    });
  return [keys, toggle];
}
