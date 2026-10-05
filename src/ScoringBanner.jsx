import { useRef, useState } from "react";
import { requestScoring, respondToScoring, takeOverScoring } from "./api/scoringApi";
import ErrorBanner from "./ErrorBanner";

// Who is scoring this match, and what you can do about it — drawn from the match's `scoring`
// block, never decided here. One person scores a match at a time: others watch, a scorer can ask
// to take over (the active scorer gets Allow / Decline), and an owner can take over outright.
//
// `onChange(scoring)` hands the new block back so the screen can enable or disable its controls.

const box = (tone) => ({
  background: tone === "ask" ? "rgba(242,169,59,0.15)" : "rgba(247,245,239,0.08)",
  border: `1px solid ${tone === "ask" ? "#F2A93B" : "rgba(247,245,239,0.25)"}`,
  color: "#F7F5EF",
  borderRadius: 10,
  padding: "0.8rem 1rem",
  marginBottom: 14,
  fontSize: 14,
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
});

const button = (primary) => ({
  minHeight: 44,
  borderRadius: 8,
  padding: "0.5rem 1rem",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  border: primary ? "none" : "1px solid rgba(247,245,239,0.4)",
  background: primary ? "#F2A93B" : "transparent",
  color: primary ? "#1B1B1B" : "#F7F5EF",
});

export default function ScoringBanner({ sport, matchId, scoring, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  if (!scoring) return null;

  const run = async (fn) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      onChange(await fn());
    } catch (e) {
      setError(e.message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const active = scoring.activeScorer;
  const pending = scoring.pendingRequest;

  let content = null;
  if (scoring.canRespondToRequest && pending) {
    content = (
      <div className="drop-in" role="alert" style={box("ask")}>
        <span style={{ flex: "1 1 200px" }}>
          <strong>{pending.by.name}</strong> wants to take over scoring this match.
        </span>
        <button style={button(true)} disabled={busy} onClick={() => run(() => respondToScoring(sport, matchId, true))}>
          Allow
        </button>
        <button style={button(false)} disabled={busy} onClick={() => run(() => respondToScoring(sport, matchId, false))}>
          Decline
        </button>
      </div>
    );
  } else if (active && !scoring.isActiveScorer) {
    const waiting = pending && !scoring.canRequestScoring;
    content = (
      <div style={box()}>
        <span style={{ flex: "1 1 200px" }}>
          <strong>{active.name}</strong> is scoring this match. You can follow it here; the scoring buttons are off.
          {waiting && <> Waiting for {active.name} to answer {pending.by.name}'s request…</>}
        </span>
        {scoring.canRequestScoring && (
          <button style={button(true)} disabled={busy} onClick={() => run(() => requestScoring(sport, matchId))}>
            Ask to score
          </button>
        )}
        {scoring.canTakeOverScoring && (
          <button
            style={button(false)}
            disabled={busy}
            onClick={() => window.confirm(`${active.name} is scoring this match. Take over anyway?`) && run(() => takeOverScoring(sport, matchId))}
          >
            Take over
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <ErrorBanner message={error} />
      {content}
    </>
  );
}

/** Wraps a screen's scoring controls: everything inside is disabled while `locked`. */
export function ScoringControls({ locked, children }) {
  return (
    <fieldset disabled={locked} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, opacity: locked ? 0.55 : 1 }}>
      {children}
    </fieldset>
  );
}
