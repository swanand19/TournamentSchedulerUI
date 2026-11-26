// Dark or light (2026-11-26). The web app follows the device unless the person picks one on their
// profile; the pick is kept in this browser only (the phone keeps its own). index.html applies the
// same rule before the first paint, so a page never flashes the other theme while the app loads.
import { useSyncExternalStore } from "react";

const KEY = "tournamentScheduler.appearance";
const CHOICES = ["system", "dark", "light"];
const darkQuery = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
const listeners = new Set();

function readChoice() {
  try {
    const stored = localStorage.getItem(KEY);
    return CHOICES.includes(stored) ? stored : "system";
  } catch {
    return "system"; // storage blocked: follow the device
  }
}

let choice = readChoice();

function modeOf(c) {
  if (c === "dark" || c === "light") return c;
  return darkQuery?.matches === false ? "light" : "dark";
}

function apply() {
  const mode = modeOf(choice);
  document.documentElement.dataset.mode = mode;
  // The browser's own bar (phones) takes the page's ground.
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", mode === "dark" ? "#0b1020" : "#ffffff");
  listeners.forEach((l) => l());
}

darkQuery?.addEventListener("change", () => {
  if (choice === "system") apply();
});
apply();

/** "system" | "dark" | "light". */
export function setAppearance(next) {
  choice = CHOICES.includes(next) ? next : "system";
  try {
    if (choice === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // Not remembered across reloads; it still applies now.
  }
  apply();
}

function subscribe(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const snapshot = () => `${choice}|${modeOf(choice)}`;

/** { choice: "system" | "dark" | "light", mode: "dark" | "light" } */
export function useAppearance() {
  const [c, mode] = useSyncExternalStore(subscribe, snapshot).split("|");
  return { choice: c, mode };
}
