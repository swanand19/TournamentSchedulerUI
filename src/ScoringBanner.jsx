import { useRef, useState } from "react";
import { requestScoring, respondToScoring, takeOverScoring } from "./api/scoringApi";
import ErrorBanner from "./ErrorBanner";

// Who is scoring this match, and what you can do about it — drawn from the match's `scoring`
// block, never decided here. One person scores a match at a time: others watch, a scorer can ask
// to take over (the active scorer gets Allow / Decline), and an owner can take over outright.
//
// `onChange(scoring)` hands the new block back so the screen can enable or disable its controls.
// While someone else scores, `onWatch` adds "Watch" (the watcher's screen); there the banner is
// shown with `watching`, so it doesn't talk about switched-off buttons.

const box = (tone) => ({
  background: tone === "ask" ? "var(--tint)" : "var(--glass)",
  border: `1px solid ${tone === "ask" ? "var(--ring)" : "var(--glass-line)"}`,
  color: "var(--on-page)",
  borderRadius: 18,
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
  borderRadius: 22,
  padding: "0.5rem 1rem",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  border: primary ? "none" : "1px solid var(--glass-line)",
  background: primary ? "var(--grad)" : "transparent",
  color: primary ? "var(--accent-ink)" : "var(--ink)",
});

export default function ScoringBanner({ sport, matchId, scoring, onChange, onWatch, watching }) {
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
          <strong>{active.name}</strong> is scoring this match.{" "}
          {watching ? "You are watching. Ask to score if you need to take over." : "The scoring buttons are off while they score."}
          {waiting && <> Waiting for {active.name} to answer {pending.by.name}'s request…</>}
        </span>
        {onWatch && (
          <button style={button(false)} disabled={busy} onClick={onWatch}>
            Watch
          </button>
        )}
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
