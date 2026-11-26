import { useEffect, useRef, useState } from "react";
import Modal from "../Modal";
import { sportClass } from "./poolLib";

// Small controls shared by the pool, draw and auction screens and the hall's TV board.

export function Toggle({ on, onChange, label, disabled }) {
  return <button type="button" className="tog" role="switch" aria-checked={!!on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)} />;
}

export function Seg({ options, value, onChange, label, disabled }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.key} type="button" aria-pressed={o.key === value} disabled={disabled || o.disabled} onClick={() => o.key !== value && onChange(o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Opt({ on, onPick, title, detail, disabled }) {
  return (
    <button type="button" className="opt" role="radio" aria-checked={!!on} disabled={disabled} onClick={onPick}>
      <span className="radio" />
      <span className="stack" style={{ gap: 4 }}>
        <b>{title}</b>
        {detail && <span className="small muted">{detail}</span>}
      </span>
    </button>
  );
}

export function Banner({ message, onDark }) {
  if (!message) return null;
  return (
    <div role="alert" className="small" style={{ background: onDark ? "color-mix(in srgb, var(--danger) 16%, transparent)" : "var(--danger-tint)", color: onDark ? "var(--danger-ink)" : "var(--danger-ink)", borderRadius: 8, padding: "10px 12px", fontWeight: 600 }}>
      {message}
    </div>
  );
}

/**
 * The spin window (plan 9.3): the names in the pot run past and slow down until the server's landing
 * moment, on every screen at once. The name itself is never known here before it lands (the server
 * keeps it), so the window only ever stops on the landed card, which replaces it. One long ease-out
 * that lasts past the landing, so it never comes to rest on a wrong name. Reduced motion: a still line.
 */
export function Reel({ names, startsAt, landsAt, now, row = 120, fontSize = 52 }) {
  const strip = useRef(null);
  const [reduced] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const list = names.length ? names : ["…"];
  // About 48 names go by; the strip repeats the pot to fill them.
  const shown = Array.from({ length: 48 }, (_, i) => list[i % list.length]);

  useEffect(() => {
    const el = strip.current;
    if (!el || reduced) return undefined;
    const total = Math.max(800, landsAt - startsAt + 2200);
    const done = Math.min(1, Math.max(0, (now - startsAt) / total));
    const distance = (shown.length - 2) * row;
    const animation = el.animate(
      [{ transform: "translateY(0)" }, { transform: `translateY(-${distance}px)` }],
      { duration: total, easing: "cubic-bezier(0.33, 1, 0.68, 1)", fill: "forwards" }
    );
    animation.currentTime = done * total;
    return () => animation.cancel();
    // Started once per spin; `now` only places a late joiner part-way through.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startsAt, landsAt, row, reduced]);

  if (reduced) {
    return (
      <div className="reel" style={{ height: row }} aria-live="polite">
        <div className="strip" style={{ position: "static" }}>
          <div className="disp" style={{ height: row, fontSize: fontSize * 0.6 }}>Drawing a name…</div>
        </div>
      </div>
    );
  }
  return (
    <div className="reel" style={{ height: row }} aria-label="Drawing a name">
      <div className="strip" ref={strip} aria-hidden="true">
        {shown.map((n, i) => (
          <div key={i} className="disp" style={{ height: row, fontSize }}>
            {n}
          </div>
        ))}
      </div>
    </div>
  );
}

/** A dialog in the pool screens' look. Rendered outside the page, so it takes the sport for its colours. */
export function Dialog({ id, title, sport, onClose, width = 480, children }) {
  return (
    <Modal labelledBy={id} onClose={onClose} panelStyle={{ maxWidth: width }}>
      <div className={`pl ${sportClass(sport)}`} style={{ gap: 0 }}>
        <section className="card" style={{ boxShadow: "0 30px 80px rgba(0,0,0,.45)" }}>
          <div className="between">
            <h3 id={id} className="h3 disp">{title}</h3>
            <button className="btn ghost sm" onClick={onClose} aria-label="Close">✕</button>
          </div>
          {children}
        </section>
      </div>
    </Modal>
  );
}
