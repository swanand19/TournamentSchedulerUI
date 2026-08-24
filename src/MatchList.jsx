export default function MatchList({ matches, loading, tournamentStarted, starting, onStartTournament, onStartMatch, onEnterMatch, onBack }) {
  const font = { display: "'Anton', sans-serif", body: "'Inter', sans-serif" };

  const hasActiveMatch = matches.some((m) => m.status === "InProgress" || m.status === "Paused" || m.status === "PenaltyShootout");

  const statusStyle = (status) => {
    if (status === "Completed") return { background: "rgba(99,153,34,0.15)", color: "#3b6d11" };
    if (status === "InProgress" || status === "Paused") return { background: "rgba(242,169,59,0.2)", color: "#8a4b1b" };
    return { background: "rgba(247,245,239,0.12)", color: "rgba(247,245,239,0.7)" };
  };

  const statusLabel = (status) => {
    if (status === "InProgress") return "● LIVE";
    if (status === "Paused") return "⏸ PAUSED";
    if (status === "PenaltyShootout") return "🎯 PENALTIES";
    if (status === "Completed") return "FULL TIME";
    return "NOT STARTED";
  };

  const grouped = matches.reduce((acc, m) => {
    (acc[m.groupName] = acc[m.groupName] || []).push(m);
    return acc;
  }, {});

  return (
    <div>
      {onBack && (
        <button
          onClick={onBack}
          style={{ background: "rgba(247,245,239,0.1)", color: "#F7F5EF", border: "1px solid rgba(247,245,239,0.25)", borderRadius: 8, padding: "0.5rem 1rem", fontSize: 13, cursor: "pointer", marginBottom: 16 }}
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
            style={{ background: "#F2A93B", color: "#1B1B1B", border: "none", borderRadius: 10, padding: "0.9rem 1.6rem", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: font.display, letterSpacing: "0.03em" }}
          >
            {starting ? "STARTING…" : "🏁 START TOURNAMENT"}
          </button>
        </div>
      )}

      {tournamentStarted && loading && <p style={{ color: "rgba(247,245,239,0.6)" }}>Loading matches…</p>}

      {tournamentStarted && !loading && hasActiveMatch && (
        <div style={{ background: "rgba(242,169,59,0.12)", border: "1px solid #F2A93B", color: "#F7F5EF", padding: "0.8rem 1rem", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          A match is currently in progress. Finish it before starting another.
        </div>
      )}

      {tournamentStarted && !loading && Object.entries(grouped).map(([groupName, groupMatches]) => (
        <div key={groupName} style={{ marginBottom: 24 }}>
          <h3 style={{ fontFamily: font.display, fontSize: 18, color: "#F2A93B", marginBottom: 10 }}>GROUP {groupName}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {groupMatches.map((m) => {
              const st = statusStyle(m.status);
              const canStart = m.status === "NotStarted" && !hasActiveMatch;
              return (
                <div key={m.id} style={{ background: "#F7F5EF", color: "#1B1B1B", borderRadius: 10, padding: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontFamily: "'Teko', sans-serif", fontSize: 12, color: "#8a8677", fontWeight: 600 }}>
                      M{String(m.matchNumber).padStart(2, "0")}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "0.25rem 0.6rem", borderRadius: 6, ...st }}>
                      {statusLabel(m.status)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
                    <span style={{ flex: 1 }}>{m.homeTeamName}</span>
                    {m.penaltyWinnerTeamId === m.homeTeamId && <span title="Won on penalties"> 🏆</span>}{m.status !== "NotStarted" ? (
                      <span style={{ fontFamily: font.display, fontSize: 18, color: "#1B4332", margin: "0 10px" }}>
                        {m.homeScore} - {m.awayScore}
                      </span>
                    ) : (
                      <span style={{ fontFamily: font.display, fontSize: 13, color: "#F2A93B", margin: "0 10px" }}>VS</span>
                    )}
                    <span style={{ flex: 1, textAlign: "right" }}>
                      {m.penaltyWinnerTeamId === m.awayTeamId && <span title="Won on penalties">🏆 </span>}
                      {m.awayTeamName}
                    </span>
                  </div>
                  {m.penaltyHomeScore != null && (
                    <div style={{ textAlign: "center", fontSize: 11, color: "#8a4b1b", fontWeight: 700, marginTop: -6, marginBottom: 10 }}>
                      🎯 {m.penaltyHomeScore}-{m.penaltyAwayScore} on penalties
                    </div>
                  )}

                  {m.status === "NotStarted" && (
                    <button
                      onClick={() => onStartMatch(m.id)}
                      disabled={!canStart}
                      style={{
                        width: "100%",
                        background: canStart ? "#1B4332" : "rgba(27,67,50,0.3)",
                        color: "#F7F5EF",
                        border: "none",
                        borderRadius: 8,
                        padding: "0.6rem",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: canStart ? "pointer" : "not-allowed",
                      }}
                    >
                      ▶ Start match
                    </button>
                  )}

                  {(m.status === "InProgress" || m.status === "Paused" || m.status === "PenaltyShootout") && (
                    <button
                      onClick={() => onEnterMatch(m.id)}
                      style={{ width: "100%", background: "#F2A93B", color: "#1B1B1B", border: "none", borderRadius: 8, padding: "0.6rem", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                    >
                      ● Enter live match
                    </button>
                  )}
                  {m.status === "Completed" && (
                    <button
                      onClick={() => onEnterMatch(m.id)}
                      style={{ width: "100%", background: "transparent", color: "#1B4332", border: "1.5px solid #1B4332", borderRadius: 8, padding: "0.6rem", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                    >
                      📋 View summary
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