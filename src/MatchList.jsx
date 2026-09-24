import { font, themeFor } from "./theme";
import { TargetIcon, PauseIcon, FlagIcon, PlayIcon, TrophyIcon } from "./icons";

// Status pill text with its icon; the icon never carries the meaning on its own.
const paused = (text) => <><PauseIcon size={12} /> {text}</>;
const target = (text) => <><TargetIcon size={12} /> {text}</>;
// A match is "live" — and so blocks another from starting — in these states. The two sports name
// their in-play states differently, so the set is the union of both.
const LIVE_STATUSES = ["InProgress", "Paused", "PenaltyShootout", "InningsBreak", "SuperOver"];

export default function MatchList({ matches, loading, tournamentStarted, starting, onStartTournament, onStartMatch, onEnterMatch, onBack, sport = "Football" }) {
  const isCricket = sport === "Cricket";
  const theme = themeFor(sport);

  const hasActiveMatch = matches.some((m) => LIVE_STATUSES.includes(m.status));

  const statusStyle = (status) => {
    if (status === "Completed") return { background: "rgba(99,153,34,0.15)", color: "#3b6d11" };
    if (status === "Abandoned") return { background: "rgba(226,75,74,0.15)", color: "#a33" };
    if (LIVE_STATUSES.includes(status))
      return { background: theme.accentSoft, color: theme.warnInk };
    return { background: "rgba(247,245,239,0.12)", color: "rgba(247,245,239,0.7)" };
  };

  // "Paused" covers three different situations, so the period tells them apart at a glance.
  const footballStatusLabel = (m) => {
    if (m.status === "InProgress") return "● LIVE";
    if (m.status === "PenaltyShootout") return target("PENALTIES");
    if (m.status === "Completed") return "FULL TIME";
    if (m.status === "Paused") {
      if (m.periodState !== "Ended") return paused("STOPPED");
      return m.currentHalf === 1 ? paused("HALF TIME")
        : m.currentHalf === 3 ? paused("ET BREAK")
        : paused("AWAITING RESULT");
    }
    return "NOT STARTED";
  };

  const cricketStatusLabel = (m) => {
    if (m.status === "InProgress") return "● LIVE";
    if (m.status === "InningsBreak") return paused("INNINGS BREAK");
    if (m.status === "SuperOver") return target("SUPER OVER");
    if (m.status === "Abandoned") return "ABANDONED";
    if (m.status === "Completed") return m.isDraw ? "DRAW" : m.isTie ? "TIE" : "RESULT";
    return "NOT STARTED";
  };

  const statusLabel = isCricket ? cricketStatusLabel : footballStatusLabel;

  const grouped = matches.reduce((acc, m) => {
    (acc[m.groupName] = acc[m.groupName] || []).push(m);
    return acc;
  }, {});

  return (
    <div>
      {onBack && (
        <button
          onClick={onBack}
          style={{ background: "rgba(247,245,239,0.1)", color: "#F7F5EF", border: "1px solid rgba(247,245,239,0.25)", borderRadius: 8, padding: "0.5rem 1rem", fontSize: 14, cursor: "pointer", marginBottom: 16 }}
        >
          ← Back to schedule
        </button>
      )}

      <h2 style={{ fontFamily: font.display, fontSize: 26, margin: "0 0 1rem" }}>MATCHES</h2>

      {!tournamentStarted && (
        <div style={{ background: "rgba(247,245,239,0.06)", border: "1px solid rgba(247,245,239,0.15)", borderRadius: 12, padding: "1.5rem", textAlign: "center", marginBottom: 20 }}>
          <p style={{ color: "rgba(247,245,239,0.75)", marginBottom: 16, fontSize: 14 }}>
            This tournament hasn't started yet. Starting it will generate matches from the active schedule.
          </p>
          <button
            onClick={onStartTournament}
            disabled={starting}
            style={{ background: theme.accent, color: theme.accentInk, border: "none", borderRadius: 10, padding: "0.9rem 1.6rem", fontWeight: 400, fontSize: 16, cursor: "pointer", fontFamily: font.display, letterSpacing: "0.03em" }}
          >
            {starting ? "STARTING…" : <><FlagIcon /> START TOURNAMENT</>}
          </button>
        </div>
      )}

      {tournamentStarted && loading && <p style={{ color: "rgba(247,245,239,0.6)" }}>Loading matches…</p>}

      {tournamentStarted && !loading && hasActiveMatch && (
        <div className="drop-in" style={{ background: theme.accentSoft, border: `1px solid ${theme.accent}`, color: theme.onDark, padding: "0.8rem 1rem", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          A match is currently in progress. Finish it before starting another.
        </div>
      )}

      {tournamentStarted && !loading && Object.entries(grouped).map(([groupName, groupMatches]) => (
        <div key={groupName} style={{ marginBottom: 24 }}>
          <h3 style={{ fontFamily: font.display, fontSize: 18, color: theme.accent, marginBottom: 10 }}>GROUP {groupName}</h3>
          <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {groupMatches.map((m, i) => {
              const st = statusStyle(m.status);
              const canStart = m.status === "NotStarted" && !hasActiveMatch;
              const isLive = LIVE_STATUSES.includes(m.status);
              return (
                // The live match is ringed in the accent so it can be found in a long list at a glance.
                <div key={m.id} style={{ "--i": i, background: theme.cream, color: theme.ink, borderRadius: 10, padding: "1rem", boxShadow: isLive ? `0 0 0 2px ${theme.accent}` : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontFamily: "'Teko', sans-serif", fontSize: 12, color: theme.muted, fontWeight: 600 }}>
                      M{String(m.matchNumber).padStart(2, "0")}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "0.25rem 0.6rem", borderRadius: 6, ...st }}>
                      {m.status === "InProgress" ? <><span className="live-dot" />LIVE</> : statusLabel(m)}
                    </span>
                  </div>
                  {/* Cricket scores are two lines of their own ("164/6 (20.0)"), so the sides
                      stack rather than sitting either end of a single score. */}
                  {isCricket ? (
                    <div className="num" style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
                      {[
                        { name: m.homeTeamName, line: m.homeLine, id: m.homeTeamId },
                        { name: m.awayTeamName, line: m.awayLine, id: m.awayTeamId },
                      ].map((side) => (
                        <div key={side.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, padding: "2px 0" }}>
                          <span style={{ opacity: m.winnerTeamId && m.winnerTeamId !== side.id ? 0.55 : 1 }}>
                            {m.winnerTeamId === side.id && <TrophyIcon size={14} title="Winner" style={{ color: theme.warnInk, marginInlineEnd: 4 }} />}
                            {side.name}
                          </span>
                          <span style={{ fontFamily: font.display, fontSize: 16, color: theme.deep, whiteSpace: "nowrap" }}>
                            {side.line ?? (m.status === "NotStarted" ? "" : "—")}
                          </span>
                        </div>
                      ))}
                      {m.status === "NotStarted" && (
                        <div style={{ textAlign: "center", fontFamily: font.display, fontSize: 14, color: theme.warnInk, marginTop: 4 }}>VS</div>
                      )}
                    </div>
                  ) : (
                    <div className="num" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
                      <span style={{ flex: 1 }}>{m.homeTeamName}</span>
                      {m.penaltyWinnerTeamId === m.homeTeamId && <TrophyIcon size={14} title="Won on penalties" style={{ color: theme.warnInk, marginInlineStart: 4 }} />}{m.status !== "NotStarted" ? (
                        <span style={{ fontFamily: font.display, fontSize: 18, color: theme.deep, margin: "0 10px" }}>
                          {m.homeScore} - {m.awayScore}
                        </span>
                      ) : (
                        <span style={{ fontFamily: font.display, fontSize: 14, color: theme.warnInk, margin: "0 10px" }}>VS</span>
                      )}
                      <span style={{ flex: 1, textAlign: "right" }}>
                        {m.penaltyWinnerTeamId === m.awayTeamId && <TrophyIcon size={14} title="Won on penalties" style={{ color: theme.warnInk, marginInlineEnd: 4 }} />}
                        {m.awayTeamName}
                      </span>
                    </div>
                  )}

                  {isCricket && m.resultSummary && (
                    <div style={{ textAlign: "center", fontSize: 11, color: theme.warnInk, fontWeight: 700, marginTop: -6, marginBottom: 10 }}>
                      {m.resultSummary}
                    </div>
                  )}
                  {!isCricket && m.penaltyHomeScore != null && (
                    <div style={{ textAlign: "center", fontSize: 11, color: theme.warnInk, fontWeight: 700, marginTop: -6, marginBottom: 10 }}>
                      <TargetIcon size={12} /> {m.penaltyHomeScore}-{m.penaltyAwayScore} on penalties
                    </div>
                  )}

                  {m.status === "NotStarted" && (
                    <button
                      onClick={() => onStartMatch(m.id)}
                      disabled={!canStart}
                      style={{
                        width: "100%",
                        background: theme.deep,
                        color: theme.cream,
                        border: "none",
                        borderRadius: 8,
                        padding: "0.6rem",
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: canStart ? "pointer" : "not-allowed",
                      }}
                    >
                      <PlayIcon size={14} /> Start match
                    </button>
                  )}

                  {isLive && (
                    <button
                      onClick={() => onEnterMatch(m.id)}
                      style={{ width: "100%", background: theme.accent, color: theme.accentInk, border: "none", borderRadius: 8, padding: "0.6rem", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                    >
                      <span className="live-dot" />Enter live match
                    </button>
                  )}
                  {(m.status === "Completed" || m.status === "Abandoned") && (
                    <button
                      onClick={() => onEnterMatch(m.id)}
                      style={{ width: "100%", background: "transparent", color: theme.deep, border: `1.5px solid ${theme.deep}`, borderRadius: 8, padding: "0.6rem", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                    >
                      View summary
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {tournamentStarted && !loading && matches.length === 0 && (
        <p style={{ color: "rgba(247,245,239,0.6)", fontSize: 14 }}>No matches found.</p>
      )}
    </div>
  );
}