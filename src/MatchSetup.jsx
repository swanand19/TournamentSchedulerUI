import { font, footballTheme as theme } from "./theme";
import { useState, useEffect } from "react";
import { getMatch, setupAndStartMatch } from "./api/matchesApi";
import ErrorBanner from "./ErrorBanner";

const STATUS_CYCLE = ["Bench", "Starting", "Unavailable"];

export default function MatchSetup({ matchId, onBack, onStarted }) {

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [maxPlayersPerSide, setMaxPlayersPerSide] = useState(5);
  const [minPlayersPerSide, setMinPlayersPerSide] = useState(1);
  const [minutesPerHalf, setMinutesPerHalf] = useState(20);
  const [extraTimeAllowed, setExtraTimeAllowed] = useState(false);
  const [extraTimeMinutesPerHalf, setExtraTimeMinutesPerHalf] = useState(10);
  const [drawAllowed, setDrawAllowed] = useState(true);
  const [maxSubstitutions, setMaxSubstitutions] = useState(3);
  const [rollingSubsAllowed, setRollingSubsAllowed] = useState(false);

  const [squadStatus, setSquadStatus] = useState({}); // playerId -> status
  const effectiveExtraTimeMinutes = Math.min(extraTimeMinutesPerHalf, minutesPerHalf) || Math.ceil(minutesPerHalf / 2);
  const effectiveMinPlayers = Math.min(Math.max(1, minPlayersPerSide), maxPlayersPerSide);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getMatch(matchId);
        setMatch(data);
        const initial = {};
        [...(data.homeTeam?.players || []), ...(data.awayTeam?.players || [])].forEach((p) => {
          initial[p.id] = "Bench";
        });
        setSquadStatus(initial);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [matchId]);

  const cycleStatus = (playerId) => {
    setSquadStatus((prev) => {
      const current = prev[playerId] || "Bench";
      const nextIdx = (STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length;
      return { ...prev, [playerId]: STATUS_CYCLE[nextIdx] };
    });
  };

  const countStarting = (players) =>
    (players || []).filter((p) => squadStatus[p.id] === "Starting").length;

  const badgeStyle = (status) => {
    if (status === "Starting") return { background: "rgba(99,153,34,0.18)", color: "#3b6d11", border: "1.5px solid #639922" };
    if (status === "Unavailable") return { background: "rgba(226,75,74,0.1)", color: "#a33", border: "1.5px solid transparent" };
    return { background: "#EDEAE0", color: "#1B1B1B", border: "1.5px solid transparent" };
  };

  const handleSubmit = async () => {
    if (!match) return;
    setError("");

    const homeStarting = countStarting(match.homeTeam?.players);
    const awayStarting = countStarting(match.awayTeam?.players);
    if (homeStarting !== maxPlayersPerSide || awayStarting !== maxPlayersPerSide) {
      setError(`Each team needs exactly ${maxPlayersPerSide} starting players selected (currently ${homeStarting} / ${awayStarting}).`);
      return;
    }

    const homePlayerIds = new Set((match.homeTeam?.players || []).map((p) => p.id));
    const squad = Object.entries(squadStatus).map(([playerId, status]) => ({
      playerId: Number(playerId),
      teamId: homePlayerIds.has(Number(playerId)) ? match.homeTeamId : match.awayTeamId,
      squadStatus: status,
    }));

    if (drawAllowed && extraTimeAllowed) {
      setError("Draw allowed and Allow extra time can't both be enabled — a draw-allowed match ends at full time, so extra time never applies. Uncheck one.");
      return;
    }

    setSubmitting(true);
    try {
      await setupAndStartMatch(matchId, {
        maxPlayersPerSide,
        minPlayersPerSide: effectiveMinPlayers,
        minutesPerHalf,
        extraTimeAllowed,
        extraTimeMinutesPerHalf: extraTimeAllowed ? effectiveExtraTimeMinutes : null,
        drawAllowed,
        maxSubstitutions,
        rollingSubsAllowed,
        squad,
      });
      onStarted();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p style={{ color: "rgba(247,245,239,0.6)" }}>Loading match…</p>;
  if (!match) return <p style={{ color: "rgba(247,245,239,0.6)" }}>Match not found.</p>;

  const renderTeamSquad = (team) => (
    <div style={{ background: "#F7F5EF", color: "#1B1B1B", borderRadius: 12, padding: "1.2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h4 style={{ fontFamily: font.display, fontSize: 18, margin: 0 }}>⚽ {team?.name}</h4>
        <span style={{ fontSize: 12, color: theme.muted }}>
          Starting: {countStarting(team?.players)} / {maxPlayersPerSide}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {(team?.players || []).map((p) => (
          // A button so the squad can be set from the keyboard; each press cycles the status.
          <button
            type="button"
            key={p.id}
            onClick={() => cycleStatus(p.id)}
            aria-label={`${p.jerseyNumber != null ? `#${p.jerseyNumber} ` : ""}${p.name}: ${squadStatus[p.id] || "Bench"}. Press to change.`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              textAlign: "left",
              padding: "0.5rem 0.7rem",
              borderRadius: 6,
              fontSize: 14,
              cursor: "pointer",
              userSelect: "none",
              ...badgeStyle(squadStatus[p.id]),
            }}
          >
            <span>
              {p.jerseyNumber != null && <strong>#{p.jerseyNumber} </strong>}
              {p.name}
            </span>
            <span style={{ fontWeight: 700, fontSize: 11 }}>{squadStatus[p.id] || "Bench"}</span>
          </button>
        ))}
        {(!team?.players || team.players.length === 0) && (
          <p style={{ fontSize: 14, color: theme.muted }}>No players on this team.</p>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <button
        onClick={onBack}
        style={{ background: "rgba(247,245,239,0.1)", color: "#F7F5EF", border: "1px solid rgba(247,245,239,0.25)", borderRadius: 8, padding: "0.5rem 1rem", fontSize: 14, cursor: "pointer", marginBottom: 16 }}
      >
        ← Back to matches
      </button>

      <h2 style={{ fontFamily: font.display, fontSize: 24, margin: "0 0 4px" }}>MATCH SETUP</h2>
      <p style={{ color: "rgba(247,245,239,0.7)", fontSize: 14, marginBottom: 20 }}>
        {match.homeTeamName} vs {match.awayTeamName}
      </p>

      <ErrorBanner message={error} />

      <div style={{ background: "rgba(247,245,239,0.06)", border: "1px solid rgba(247,245,239,0.15)", borderRadius: 12, padding: "1.5rem", marginBottom: 20 }}>
        <h3 style={{ fontFamily: font.display, fontSize: 18, margin: "0 0 14px" }}>MATCH RULES</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          <label style={{ fontSize: 14, color: "rgba(247,245,239,0.8)" }}>
            Players per side
            <input
              type="number" min={1} max={11}
              value={maxPlayersPerSide}
              onChange={(e) => setMaxPlayersPerSide(Math.max(1, Number(e.target.value) || 1))}
              style={{ display: "block", width: "100%", marginTop: 4, padding: "0.5rem", borderRadius: 6, border: "1.5px solid rgba(247,245,239,0.3)", background: "rgba(247,245,239,0.1)", color: "#F7F5EF" }}
            />
          </label>
          <label style={{ fontSize: 14, color: "rgba(247,245,239,0.8)" }}>
            Minutes per half
            <input
              type="number" min={1}
              value={minutesPerHalf}
              onChange={(e) => setMinutesPerHalf(Math.max(1, Number(e.target.value) || 1))}
              style={{ display: "block", width: "100%", marginTop: 4, padding: "0.5rem", borderRadius: 6, border: "1.5px solid rgba(247,245,239,0.3)", background: "rgba(247,245,239,0.1)", color: "#F7F5EF" }}
            />
          </label>
          <label style={{ fontSize: 14, color: "rgba(247,245,239,0.8)" }}>
            Max substitutions
            <input
              type="number" min={0}
              value={maxSubstitutions}
              onChange={(e) => setMaxSubstitutions(Math.max(0, Number(e.target.value) || 0))}
              style={{ display: "block", width: "100%", marginTop: 4, padding: "0.5rem", borderRadius: 6, border: "1.5px solid rgba(247,245,239,0.3)", background: "rgba(247,245,239,0.1)", color: "#F7F5EF" }}
            />
          </label>
          <label style={{ fontSize: 14, color: "rgba(247,245,239,0.8)" }}>
            Abandon below … players
            <input
              type="number" min={1} max={maxPlayersPerSide}
              value={effectiveMinPlayers}
              onChange={(e) => setMinPlayersPerSide(Math.min(maxPlayersPerSide, Math.max(1, Number(e.target.value) || 1)))}
              style={{ display: "block", width: "100%", marginTop: 4, padding: "0.5rem", borderRadius: 6, border: "1.5px solid rgba(247,245,239,0.3)", background: "rgba(247,245,239,0.1)", color: "#F7F5EF" }}
            />
            <span style={{ fontSize: 11, color: "rgba(247,245,239,0.7)", display: "block", marginTop: 4 }}>
              Red cards taking a side under this hand the match to the opponent (Law 3 uses 7 for 11-a-side).
            </span>
          </label>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 18 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "rgba(247,245,239,0.85)", cursor: "pointer" }}>
            <input type="checkbox" checked={extraTimeAllowed} 
              onChange={(e) => {
                setExtraTimeAllowed(e.target.checked);
                if (e.target.checked) setDrawAllowed(false);
              }}
            />
            Allow extra time
          </label>
          {extraTimeAllowed && (
            <label style={{ fontSize: 14, color: "rgba(247,245,239,0.8)", display: "block", marginTop: 8 }}>
              Extra time half length (minutes) -max {minutesPerHalf} (regulation half length)
              <input
                type="number" min={1} max={minutesPerHalf}
                value={effectiveExtraTimeMinutes}
                onChange={(e) => setExtraTimeMinutesPerHalf(Math.min(minutesPerHalf, Math.max(1, Number(e.target.value) || 1 )))}
                style={{ display: "block", width: 120, marginTop: 4, padding: "0.5rem", borderRadius: 6, border: "1.5px solid rgba(247,245,239,0.3)", background: "rgba(247,245,239,0.1)", color: "#F7F5EF" }}
              />
            </label>
          )}
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "rgba(247,245,239,0.85)", cursor: "pointer" }}>
            <input type="checkbox" checked={drawAllowed} 
              onChange={(e) => {
                setDrawAllowed(e.target.checked);
                if (e.target.checked) setExtraTimeAllowed(false);
              }} 
            />
            Draw allowed — uncheck to require penalties on a tie
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "rgba(247,245,239,0.85)", cursor: "pointer" }}>
            <input type="checkbox" checked={rollingSubsAllowed} onChange={(e) => setRollingSubsAllowed(e.target.checked)} />
            Rolling substitutions allowed
          </label>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
        {renderTeamSquad(match.homeTeam)}
        {renderTeamSquad(match.awayTeam)}
      </div>

      <p style={{ fontSize: 12, color: "rgba(247,245,239,0.7)", marginBottom: 16 }}>
        Tap a player to cycle: Bench → Starting → Unavailable
      </p>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{ width: "100%", background: theme.successSolid, color: "#F7F5EF", border: "none", borderRadius: 10, padding: "1rem", fontWeight: 400, fontSize: 16, cursor: "pointer", fontFamily: font.display, letterSpacing: "0.03em" }}
      >
        {submitting ? "STARTING MATCH…" : "▶ START MATCH"}
      </button>
    </div>
  );
}