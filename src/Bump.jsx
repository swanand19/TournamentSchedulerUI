import { useState } from "react";

/**
 * Renders `value` and replays a short drop-in (.score-bump in styles.css) whenever it changes.
 *
 * Meant for numbers that change rarely and matter when they do — a goal, a wicket. Never on first
 * render: opening a match that is already 2-1 shouldn't look like two goals just went in.
 */
export default function Bump({ value, children, style }) {
  const [prev, setPrev] = useState(value);
  const [changes, setChanges] = useState(0);

  if (value !== prev) {
    setPrev(value);
    setChanges(changes + 1);
  }

  return (
    // A new key remounts the span, which is what restarts the CSS animation.
    <span key={changes} className={changes > 0 ? "score-bump" : undefined} style={style}>
      {children ?? value}
    </span>
  );
}
