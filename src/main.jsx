import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import AuthGate from "./auth/AuthGate.jsx";
import LiveTournament from "./live/LiveTournament.jsx";
import LegalPage from "./legal/LegalPage.jsx";
import TvBoard from "./pool/TvBoard.jsx";
import PublicTeam from "./clubs/PublicTeam.jsx";
import PublicLeague from "./leagues/PublicLeague.jsx";
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
// /live/<code>/tv: the auction or team draw for a big screen in the hall (plan 4.7), the same public read.
const tvCode = /^\/live\/([^/]+)\/tv\/?$/.exec(path)?.[1];
const isLegalPage = ["/privacy", "/delete-account"].includes(path.replace(/\/+$/, ""));
// /team/<code>: a lasting team's public page (C-15), names and results only.
const teamCode = /^\/team\/([^/]+)\/?$/.exec(path)?.[1];
// /leagues/<code>: a league's public page (2026-11-24), every season and its all-time stats.
const leagueCode = /^\/leagues\/([^/]+)\/?$/.exec(path)?.[1];

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {isLegalPage ? (
      <LegalPage />
    ) : teamCode ? (
      <PublicTeam code={teamCode} />
    ) : leagueCode ? (
      <PublicLeague code={leagueCode} />
    ) : tvCode ? (
      <TvBoard code={tvCode} />
    ) : isPublicPage ? (
      <LiveTournament />
    ) : (
      <AuthGate>
        <App />
      </AuthGate>
    )}
  </StrictMode>
);
