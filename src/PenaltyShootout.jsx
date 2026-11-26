import { font, footballTheme as theme } from "./theme";
import { useState, useEffect } from "react";
import Bump from "./Bump";
import { BallIcon, MissIcon, TargetIcon } from "./icons";
import { getPenalties, recordPenaltyKick, endPenaltiesManually } from "./api/matchesApi";
import ErrorBanner from "./ErrorBanner";

export default function PenaltyShootout({ matchId, match, onDecided }) {

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
      // Follow the shootout's own order rather than making the scorer remember it.
      if (d.nextTeamId) setSelectedTeamId(d.nextTeamId);
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

  if (loading || !data) return <p style={{ color: "rgba(var(--fg-rgb), 0.6)" }}>Loading shootout…</p>;

  const kickList = (teamId) => data.kicks.filter((k) => k.teamId === teamId);
  const teams = [match.homeTeam, match.awayTeam].filter(Boolean);

  return (
    <div>
      <div style={{ background: "var(--cream)", color: "var(--ink)", borderRadius: 14, padding: "1.5rem", marginBottom: 20, textAlign: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--warn-ink)", letterSpacing: "0.08em", marginBottom: 8 }}>
          <TargetIcon size={14} /> Penalty shootout
        </div>
        <div className="num" style={{ fontFamily: font.display, fontSize: 42, color: "var(--fb-deep)", display: "flex", justifyContent: "center", gap: 12 }}>
          <Bump value={data.homeScore} />
          <span style={{ opacity: 0.35 }}>–</span>
          <Bump value={data.awayScore} />
        </div>
      </div>

      <ErrorBanner message={error} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        {teams.map((t) => (
          <div key={t.id} style={{ background: "var(--cream)", color: "var(--ink)", borderRadius: 12, padding: "1rem" }}>
            <h4 style={{ fontFamily: font.display, fontSize: 16, margin: "0 0 8px" }}>{t.name}</h4>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {kickList(t.id).map((k) => (
                <span key={k.id} className="pop-in" style={{ fontSize: 20 }} title={k.isSuddenDeath ? "Sudden death" : `Round ${k.roundNumber}`}>
                  {k.scored ? <BallIcon size={20} /> : <MissIcon size={20} style={{ color: theme.dangerSolid }} />}
                  <span className="sr-only">{k.scored ? "scored" : "missed"}</span>
                </span>
              ))}
              {kickList(t.id).length === 0 && <span style={{ fontSize: 12, color: theme.muted }}>No kicks yet</span>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: "rgba(var(--fg-rgb), 0.06)", border: "1px solid rgba(var(--fg-rgb), 0.15)", borderRadius: 12, padding: "1.2rem", marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: "rgba(var(--fg-rgb), 0.7)", marginBottom: 8 }}>
          Team taking this kick
          {data.nextTeamId && (
            <span style={{ color: "var(--fb-accent)", fontWeight: 700 }}>
              {" — "}{(teams.find((t) => t.id === data.nextTeamId) || {}).name} are up
            </span>
          )}
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {teams.map((t) => {
            const isTurn = data.nextTeamId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setSelectedTeamId(t.id); setSelectedPlayerId(null); }}
                style={{
                  flex: 1, padding: "0.5rem", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
                  border: isTurn ? "1.5px solid var(--fb-accent)" : "1.5px solid transparent",
                  background: selectedTeamId === t.id ? "var(--fb-accent)" : "rgba(var(--fg-rgb), 0.15)",
                  color: "var(--on-page)",
                }}
              >
                {t.name}{isTurn ? " ●" : ""}
              </button>
            );
          })}
        </div>
        {data.nextTeamId && selectedTeamId && selectedTeamId !== data.nextTeamId && (
          <p style={{ fontSize: 12, color: "var(--fb-accent)", marginBottom: 10 }}>
            Out of turn — {(teams.find((t) => t.id === data.nextTeamId) || {}).name} are due to kick.
            Recording anyway is allowed if that's what happened on the pitch.
          </p>
        )}

        {selectedTeamId && (
          <>
            <p style={{ fontSize: 12, color: "rgba(var(--fg-rgb), 0.7)", marginBottom: 8 }}>Taker</p>
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
                            background: selectedPlayerId === p.id ? "var(--fb-accent)" : "rgba(var(--fg-rgb), 0.12)",
                            color: selectedPlayerId === p.id ? "var(--ink)" : "var(--on-page)",
                          }}
                        >
                          {p.jerseyNumber != null ? `#${p.jerseyNumber} ` : ""}{p.name}
                          {!available && " ✓"}
                        </button>
                    );
                })}
                {eligiblePlayers(selectedTeamId === match.homeTeamId ? match.homeTeam : match.awayTeam).length === 0 && (
                    <p style={{ fontSize: 12, color: theme.muted }}>No eligible players currently on the pitch for this team.</p>
                )}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => submitKick(true)} disabled={busy || !selectedPlayerId} style={{ flex: 1, background: theme.successSolid, color: "#fff", border: "none", borderRadius: 8, padding: "0.7rem", fontWeight: 700, cursor: "pointer" }}>
                <BallIcon /> Scored
              </button>
              <button onClick={() => submitKick(false)} disabled={busy || !selectedPlayerId} style={{ flex: 1, background: theme.dangerSolid, color: "#fff", border: "none", borderRadius: 8, padding: "0.7rem", fontWeight: 700, cursor: "pointer" }}>
                <MissIcon /> Missed
              </button>
            </div>
          </>
        )}
      </div>

      <p style={{ fontSize: 12, color: "rgba(var(--fg-rgb), 0.7)", marginBottom: 8 }}>
        If the shootout can't reasonably continue, end it manually and declare a winner:
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        {teams.map((t) => (
          <button
            key={t.id}
            onClick={() => handleManualEnd(t.id)}
            disabled={busy}
            style={{ flex: 1, background: "rgba(var(--fg-rgb), 0.1)", color: "var(--on-page)", border: "1px solid rgba(var(--fg-rgb), 0.25)", borderRadius: 8, padding: "0.6rem", fontSize: 12, cursor: "pointer" }}
          >
            Declare {t.name} winner
          </button>
        ))}
      </div>
    </div>
  );
}