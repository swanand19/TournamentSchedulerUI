import { useEffect, useRef, useState } from "react";
import { isLive, onLiveChange, subscribe } from "./live";

// A screen's hold on the live line. `onNudge` runs when the topic changes (bunched: several nudges
// within half a second make one call). Answers whether the line is open, so the screen can poll
// slowly while it is (LIVE_POLL_MS) and at its usual pace while it isn't. `topic` null = off (a
// public page, which has no session).

export const LIVE_POLL_MS = 60_000;

const BUNCH_MS = 500;

export function useLive(topic, onNudge) {
  const [live, setLive] = useState(isLive);
  const latest = useRef(onNudge);
  useEffect(() => {
    latest.current = onNudge;
  });

  const key = topic ? JSON.stringify(topic) : null;
  useEffect(() => {
    if (!key) return undefined;
    let timer = null;
    const unsubscribe = subscribe(JSON.parse(key), () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        if (!document.hidden) latest.current?.();
      }, BUNCH_MS);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [key]);

  useEffect(() => onLiveChange(setLive), []);

  // Nudges that arrived while the tab was hidden were skipped: catch up when it's shown again.
  useEffect(() => {
    if (!key) return undefined;
    const shown = () => {
      if (!document.hidden && isLive()) latest.current?.();
    };
    document.addEventListener("visibilitychange", shown);
    return () => document.removeEventListener("visibilitychange", shown);
  }, [key]);

  return !!topic && live;
}
