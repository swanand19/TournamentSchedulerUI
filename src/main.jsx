import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

// Browsers step a focused number field when the mouse wheel turns over it. On a long form that
// means scrolling past a field you just typed into silently rewrites it — which is how a cricket
// setup asked for 7-a-side after the scorer had typed 6. Dropping focus before the wheel's default
// action runs keeps the page scrolling and the number untouched, for every number field in the app.
document.addEventListener(
  "wheel",
  (e) => {
    const el = document.activeElement;
    if (el instanceof HTMLInputElement && el.type === "number" && e.target === el) el.blur();
  },
  { passive: true }
);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
