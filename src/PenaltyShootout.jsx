import { useState, useEffect } from "react";
import { getPenalties, recordPenaltyKick, endPenaltiesManually } from "./api/matchesApi";

export default function PenaltyShootout({ matchId, match, onDecided }) {
  const font = { display: "'Anton', sans-serif", body: "'Inter', sans-serif" };

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);

  const refresh = async () => {
    try {
      const d = await getPenalties(matchId);
      setData(d);
      if (d.outcome !== "InProgress") onDecided();
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    (async () => { setLoading(true); await refresh(); setLoading(false); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const eligiblePlayers = (team) => {
    if (!team || !match?.matchPlayers) return [];
    return match.matchPlayers
      .filter((mp) => mp.teamId === team.id && mp.squadStatus === "Starting")
      .map((mp) => team.players.find((p) => p.id === mp.playerId))
      .filter(Boolean);
  };

  const isAvailableTaker = (playerId, teamId) => {
    const list = teamId === match.homeTeamId ? data.homeAvailableTakerIds : data.awayAvailableTakerIds;
    return (list || []).includes(playerId);
  };

  const submitKick = async (scored) => {
    if (!selectedTeamId) return;
    setBusy(true); setError("");
    try {
      await recordPenaltyKick(matchId, { teamId: selectedTeamId, playerId: selectedPlayerId, scored });
      setSelectedPlayerId(null);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleManualEnd = async (winningTeamId) => {
    if (!window.confirm("End the shootout here and declare this team the winner?")) return;
    setBusy(true); setError("");
    try {
      await endPenaltiesManually(matchId, winningTeamId);
      onDecided();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading || !data) return <p style={{ color: "rgba(247,245,239,0.6)" }}>Loading shootout…</p>;

  const kickList = (teamId) => data.kicks.filter((k) => k.teamId === teamId);
  const teams = [match.homeTeam, match.awayTeam].filter(Boolean);

  return (
    <div>
      <div style={{ background: "#F7F5EF", color: "#1B1B1B", borderRadius: 14, padding: "1.5rem", marginBottom: 20, textAlign: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#8a4b1b", letterSpacing: "0.08em", marginBottom: 8 }}>
          🎯 PENALTY SHOOTOUT
        </div>
        <div style={{ fontFamily: font.display, fontSize: 42, color: "#1B4332" }}>
          {data.homeScore} - {data.awayScore}
        </div>
      </div>

      {error && (
        <div style={{ background: "rgba(226,75,74,0.15)", border: "1px solid #e24b4a", padding: "0.8rem 1rem", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        {teams.map((t) => (
          <div key={t.id} style={{ background: "#F7F5EF", color: "#1B1B1B", borderRadius: 12, padding: "1rem" }}>
            <h4 style={{ fontFamily: font.display, fontSize: 16, margin: "0 0 8px" }}>{t.name}</h4>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {kickList(t.id).map((k) => (
                <span key={k.id} style={{ fontSize: 20 }} title={k.isSuddenDeath ? "Sudden death" : `Round ${k.roundNumber}`}>
                  {k.scored ? "⚽" : "❌"}
                </span>
              ))}
              {kickList(t.id).length === 0 && <span style={{ fontSize: 12, color: "#8a8677" }}>No kicks yet</span>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: "rgba(247,245,239,0.06)", border: "1px solid rgba(247,245,239,0.15)", borderRadius: 12, padding: "1.2rem", marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: "rgba(247,245,239,0.7)", marginBottom: 8 }}>Team taking this kick</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {teams.map((t) => (
            <button
              key={t.id}
              onClick={() => { setSelectedTeamId(t.id); setSelectedPlayerId(null); }}
              style={{
                flex: 1, padding: "0.5rem", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none",
                background: selectedTeamId === t.id ? "#1B4332" : "rgba(247,245,239,0.15)",
                color: "#F7F5EF",
              }}
            >
              {t.name}
            </button>
          ))}
        </div>

        {selectedTeamId && (
          <>
            <p style={{ fontSize: 12, color: "rgba(247,245,239,0.7)", marginBottom: 8 }}>Taker</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                {eligiblePlayers(selectedTeamId === match.homeTeamId ? match.homeTeam : match.awayTeam).map((p) => {
                    const available = isAvailableTaker(p.id, selectedTeamId);
                    return (
                        <button
                          key={p.id}
                          onClick={() => available  && setSelectedPlayerId(p.id)}
                          disabled={!available}
                          title={!available ? "Already kicked — everyone else must kick once first" : ""}
                          style={{
                            padding: "0.4rem 0.7rem", borderRadius: 6, fontSize: 12, border: "none",
                            cursor: available ? "pointer" : "not-allowed",
                            opacity: available ? 1 : 0.35,
                            textDecoration: available ? "none" : "line-through",
                            background: selectedPlayerId === p.id ? "#F2A93B" : "rgba(247,245,239,0.12)",
                            color: selectedPlayerId === p.id ? "#1B1B1B" : "#F7F5EF",
                          }}
                        >
                          {p.jerseyNumber != null ? `#${p.jerseyNumber} ` : ""}{p.name}
                          {!available && " ✓"}
                        </button>
                    );
                })}
                {eligiblePlayers(selectedTeamId === match.homeTeamId ? match.homeTeam : match.awayTeam).length === 0 && (
                    <p style={{ fontSize: 12, color: "#8a8677" }}>No eligible players currently on the pitch for this team.</p>
                )}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => submitKick(true)} disabled={busy || !selectedPlayerId} style={{ flex: 1, background: "#639922", color: "#fff", border: "none", borderRadius: 8, padding: "0.7rem", fontWeight: 700, cursor: "pointer" }}>
                ⚽ Scored
              </button>
              <button onClick={() => submitKick(false)} disabled={busy || !selectedPlayerId} style={{ flex: 1, background: "#e24b4a", color: "#fff", border: "none", borderRadius: 8, padding: "0.7rem", fontWeight: 700, cursor: "pointer" }}>
                ❌ Missed
              </button>
            </div>
          </>
        )}
      </div>

      <p style={{ fontSize: 12, color: "rgba(247,245,239,0.5)", marginBottom: 8 }}>
        If the shootout can't reasonably continue, end it manually and declare a winner:
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        {teams.map((t) => (
          <button
            key={t.id}
            onClick={() => handleManualEnd(t.id)}
            disabled={busy}
            style={{ flex: 1, background: "rgba(247,245,239,0.1)", color: "#F7F5EF", border: "1px solid rgba(247,245,239,0.25)", borderRadius: 8, padding: "0.6rem", fontSize: 12, cursor: "pointer" }}
          >
            Declare {t.name} winner
          </button>
        ))}
      </div>
    </div>
  );
}