import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const backdrop = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
  alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
  overscrollBehavior: "contain",
};

/**
 * A dialog over the scoring console.
 *
 * Rendered into <body> so the app behind it can be made `inert`: Tab stays inside the dialog and
 * screen readers only hear the dialog. Focus moves to the panel itself rather than its first
 * button, because in the abandon dialog the first button ends the match. It returns to whatever
 * opened the dialog when it closes. Escape and a click on the backdrop both close it.
 */
export default function Modal({ labelledBy, onClose, panelStyle, children }) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  // Whatever had focus when the dialog was asked for, captured on the first render. Reading it
  // inside the effect instead picks up the panel itself whenever the effect re-runs, as it does
  // under StrictMode.
  const [trigger] = useState(() => document.activeElement);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const app = document.getElementById("root");
    app?.setAttribute("inert", "");
    panelRef.current?.focus();

    const onKey = (e) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      app?.removeAttribute("inert");

      // The trigger is usually disabled for the moment the dialog's action is saving, and a
      // disabled button can't take focus, so wait (up to a second) for it to come back. Don't
      // pull focus away if the user has already moved it somewhere.
      const restore = (tries) => {
        if (!(trigger instanceof HTMLElement) || !trigger.isConnected) return;
        const idle = document.activeElement === document.body || document.activeElement === null;
        if (!idle) return;
        if (trigger.disabled && tries > 0) {
          setTimeout(() => restore(tries - 1), 50);
          return;
        }
        trigger.focus();
      };
      restore(20);
    };
  }, [trigger]);

  return createPortal(
    <div className="modal-backdrop" style={backdrop} onClick={() => onCloseRef.current()}>
      <div
        ref={panelRef}
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        style={{ maxWidth: 420, width: "100%", maxHeight: "85vh", overflowY: "auto", ...panelStyle }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
