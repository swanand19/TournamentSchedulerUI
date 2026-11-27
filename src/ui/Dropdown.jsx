import { useEffect, useId, useRef, useState } from "react";

// One choice from a list, shown as what is chosen ("Leaderboard / Most runs ▾"), its list opening just under it — the web
// side of the phone's components/Dropdown (2026-11-27, the user's pick A for a league's Stats tab). An option may carry a
// figure and a line on the right (a leaderboard's leader). Keyboard: Enter / Space / ↓ opens; ↑ ↓ Home End move; Enter
// picks; Escape or a click outside closes and returns focus to the button. Styles: .kc-dd in ui.css.

export default function Dropdown({ caption, options, value, onChange, shown, style }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef(null);
  const button = useRef(null);
  const list = useRef(null);
  const id = useId();
  const chosen = options.find((o) => o.key === value) ?? options[0];

  useEffect(() => {
    if (!open) return undefined;
    const outside = (e) => {
      if (!root.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    list.current?.focus();
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  const show = () => {
    setActive(Math.max(0, options.findIndex((o) => o.key === value)));
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    button.current?.focus();
  };
  const pick = (o) => {
    close();
    if (o.key !== value) onChange(o.key);
  };

  const onListKey = (e) => {
    const last = options.length - 1;
    const moves = { ArrowDown: Math.min(active + 1, last), ArrowUp: Math.max(active - 1, 0), Home: 0, End: last };
    if (e.key in moves) {
      e.preventDefault();
      setActive(moves[e.key]);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(options[active]);
    } else if (e.key === "Escape" || e.key === "Tab") {
      e.preventDefault();
      close();
    }
  };

  return (
    <div className="kc-dd" ref={root} style={style}>
      <button
        ref={button}
        type="button"
        className="kc-dd-btn kc-glass"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={`${caption}: ${chosen?.label ?? ""}. Change`}
        onClick={() => (open ? close() : show())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            show();
          }
        }}
      >
        <span className="kc-dd-text">
          <small>{caption}</small>
          <b>{shown ?? chosen?.label}</b>
        </span>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d={open ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
        </svg>
      </button>
      {open && (
        <ul
          ref={list}
          id={`${id}-list`}
          className="kc-dd-list"
          role="listbox"
          aria-label={caption}
          tabIndex={-1}
          aria-activedescendant={`${id}-${active}`}
          onKeyDown={onListKey}
        >
          {options.map((o, i) => (
            <li
              key={o.key}
              id={`${id}-${i}`}
              role="option"
              aria-selected={o.key === value}
              className={i === active ? "is-active" : undefined}
              onPointerEnter={() => setActive(i)}
              onClick={() => pick(o)}
            >
              <span className="kc-dd-tick" aria-hidden="true">
                {o.key === value && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.5l4.5 4.5L19 7" />
                  </svg>
                )}
              </span>
              <span className="kc-dd-label">{o.label}</span>
              {(o.figure || o.detail) && (
                <span className="kc-dd-right">
                  {o.figure && <b>{o.figure}</b>}
                  {o.detail && <small>{o.detail}</small>}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
