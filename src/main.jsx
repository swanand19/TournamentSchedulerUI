import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import AuthGate from "./auth/AuthGate.jsx";
import LiveTournament from "./live/LiveTournament.jsx";
import LegalPage from "./legal/LegalPage.jsx";
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

// A public tournament's page (/live/<code>, phase 6E) is for anyone with the link, signed in or not,
// and so are the privacy policy and the account deletion page (Google Play links to them); everything
// else is the app, behind sign-in.
const path = window.location.pathname;
const isPublicPage = path.startsWith("/live/");
const isLegalPage = ["/privacy", "/delete-account"].includes(path.replace(/\/+$/, ""));

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {isLegalPage ? (
      <LegalPage />
    ) : isPublicPage ? (
      <LiveTournament />
    ) : (
      <AuthGate>
        <App />
      </AuthGate>
    )}
  </StrictMode>
);
