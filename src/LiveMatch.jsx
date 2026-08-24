import { useState, useEffect } from "react";
import {
  getMatch, getMatchEvents, recordEvent, pauseClock, resumeClock,
  addTime, nextHalf, completeMatch, startPenalties,
} from "./api/matchesApi";
import PenaltyShootout from "./PenaltyShootout";

const EVENT_LABEL = {
  Goal: "⚽ Goal", YellowCard: "🟨 Yellow card", RedCard: "🟥 Red card",
  SubstitutionIn: "🔁 Sub", HalfStart: "▶ Half start", HalfEnd: "⏸ Half end",
  ExtraTimeAdded: "⏱ Time added", ClockPaused: "⏸ Paused", ClockResumed: "▶ Resumed",
  MatchCompleted: "🏁 Full time",
  PenaltyShootoutStarted: "🎯 Penalty shootout begins",
  PenaltyKick: "🎯 Penalty",
  MatchAbandoned: "🚫 Match abandoned",
};

function parseUtc(dateString) {
  if (!dateString) return null;
  const hasTz = /Z$|[+-]\d{2}:\d{2}$/.test(dateString);
  return new Date(hasTz ? dateString : dateString + "Z");
}

function formatStopwatch(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getHalfLabel(currentHalf) {
  if (currentHalf <= 2) return `HALF ${currentHalf}`;
  return `EXTRA TIME ${currentHalf - 2}`; // halves 3,4 → ET1, ET2
}

export default function LiveMatch({ matchId, onBack, onCompleted }) {
  const font = { display: "'Anton', sans-serif", body: "'Inter', sans-serif" };

  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionModal, setActionModal] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [selectedIncomingId, setSelectedIncomingId] = useState(null);
  const [addTimeMinutes, setAddTimeMinutes] = useState(1);
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [autoPausedHalf, setAutoPausedHalf] = useState(null);
  const [startingPenalties, setStartingPenalties] = useState(false);
  const [penaltyTakers, setPenaltyTakers] = useState(5);

  const refresh = async () => {
    try {
      const [m, evts] = await Promise.all([getMatch(matchId), getMatchEvents(matchId)]);
      setMatch(m);
      setEvents(evts);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, [matchId]);

  const startingPlayers = (team) =>
    (match?.matchPlayers || [])
      .filter((mp) => mp.teamId === team?.id && mp.squadStatus === "Starting")
      .map((mp) => team.players.find((p) => p.id === mp.playerId))
      .filter(Boolean);

  const benchPlayers = (team) =>
    (match?.matchPlayers || [])
      .filter((mp) => mp.teamId === team?.id && mp.squadStatus === "Bench")
      .map((mp) => team.players.find((p) => p.id === mp.playerId))
      .filter(Boolean);

  const findPlayerName = (playerId) => {
    if (!playerId || !match) return null;
    const all = [...(match.homeTeam?.players || []), ...(match.awayTeam?.players || [])];
    const p = all.find((pl) => pl.id === playerId);
    return p ? (p.jerseyNumber != null ? `#${p.jerseyNumber} ${p.name}` : p.name) : null;
  };

  const findTeamName = (teamId) => {
    if (!match) return null;
    if (teamId === match.homeTeamId) return match.homeTeamName;
    if (teamId === match.awayTeamId) return match.awayTeamName;
    return null;
  };

  const handleStartPenalties = async () => {
    setStartingPenalties(true); setError("");
    try { await startPenalties(matchId, penaltyTakers); await refresh(); }
    catch (e) { setError(e.message); }
    finally { setStartingPenalties(false); }
  };

  const isSecondYellow = (event, index) => {
    if (event.eventType !== "YellowCard" || !event.playerId) return false;
    const priorYellowsForPlayer = events
      .slice(0, index)
      .filter((e) => e.eventType === "YellowCard" && e.playerId === event.playerId).length;
    return priorYellowsForPlayer >= 1;
  };

  const describeEvent = (e, index) => {
    const teamName = findTeamName(e.teamId);
    const playerName = findPlayerName(e.playerId);
    const incomingName = findPlayerName(e.relatedPlayerId);

    if (e.eventType === "YellowCard" && isSecondYellow(e, index)) {
      return `🟨🟥 Second yellow — sent off — ${teamName ? teamName + ": " : ""}${playerName || ""}`;
    }
    if (e.eventType === "MatchAbandoned") {
      return `🚫 Match abandoned — ${teamName} win by forfeit (opponent had no eligible players remaining)`;
    }
    const label = EVENT_LABEL[e.eventType] || e.eventType;
    if (e.eventType === "SubstitutionIn" && playerName && incomingName) {
      return `${label} — ${teamName}: ${incomingName} on for ${playerName}`;
    }
    if (e.eventType === "PenaltyKick") {
      const outcome = e.penaltyScored ? "Scored" : "Missed";
      const icon = e.penaltyScored ? "⚽" : "❌";
      return `${icon} Penalty ${outcome} — ${teamName ? teamName + ": " : ""}${playerName || ""} (${e.penaltyHomeScoreAfter}-${e.penaltyAwayScoreAfter} on pens)`;
    }
    if (playerName) {
      return `${label} — ${teamName ? teamName + ": " : ""}${playerName}`;
    }
    return teamName ? `${label} — ${teamName}` : label;
  };

  const formatEventMinute = (e) =>
    e.stoppageMinute ? `${e.minuteOfMatch}+${e.stoppageMinute}'` : `${e.minuteOfMatch}'`;

  const openModal = (type) => {
    setActionModal(type);
    setSelectedTeamId(null);
    setSelectedPlayerId(null);
    setSelectedIncomingId(null);
  };

  const closeModal = () => setActionModal(null);

  const submitEvent = async (eventType) => {
    setBusy(true);
    setError("");
    try {
      await recordEvent(matchId, {
        eventType,
        teamId: selectedTeamId,
        playerId: selectedPlayerId,
        relatedPlayerId: selectedIncomingId,
      });
      closeModal();
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handlePause = async () => {
    setBusy(true); setError("");
    try { await pauseClock(matchId); await refresh(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const handleResume = async () => {
    setBusy(true); setError("");
    try {
      await resumeClock(matchId);
      setAutoPausedHalf(null);
      await refresh();
    }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const yellowCardCounts = events.reduce((acc, e) => {
    if (e.eventType === "YellowCard" && e.playerId) {
      acc[e.playerId] = (acc[e.playerId] || 0) + 1;
    }
    return acc;
  }, {});

  // Client-side clock display, computed from timestamps — no repeated API calls.
  useEffect(() => {
    if (!match || match.status === "Completed" || !match.halfStartedAt) return undefined;

    const compute = () => {
      const halfStartedAt = parseUtc(match.halfStartedAt).getTime();
      const pausedMs = match.pausedDurationMs || 0;
      const activePauseMs =
        match.status === "Paused" && match.pausedAt
          ? Date.now() - parseUtc(match.pausedAt).getTime()
          : 0;
      const elapsedMs = Date.now() - halfStartedAt - pausedMs - activePauseMs;
      const seconds = Math.max(0, Math.floor(elapsedMs / 1000));
      setDisplaySeconds(seconds);

      const halfLimitSeconds = ((match.minutesPerHalf || 0) + (match.extraMinutesAddedThisHalf || 0)) * 60;
      if (
        match.status === "InProgress" &&
        halfLimitSeconds > 0 &&
        seconds >= halfLimitSeconds &&
        autoPausedHalf !== match.currentHalf
      ) {
        setAutoPausedHalf(match.currentHalf);
        handlePause();
      }
    };

    compute();
    const interval = setInterval(compute, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match, autoPausedHalf]);

  const handleAddTime = async () => {
    setBusy(true); setError("");
    try { await addTime(matchId, addTimeMinutes); await refresh(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const handleNextHalf = async () => {
    const nextHalfNum = (match.currentHalf || 1) + 1;
    if (!window.confirm(`End this half and move to ${getHalfLabel(nextHalfNum)}?`)) return;
    setBusy(true); setError("");
    try {
      await nextHalf(matchId);
      setAutoPausedHalf(null);
      await refresh();
    }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const handleComplete = async () => {
    if (!window.confirm("End this match? This can't be undone.")) return;
    setBusy(true); setError("");
    try {
      await completeMatch(matchId);
      await refresh();
      onCompleted();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p style={{ color: "rgba(247,245,239,0.6)" }}>Loading match…</p>;
  if (!match) return <p style={{ color: "rgba(247,245,239,0.6)" }}>Match not found.</p>;

  const isLive = match.status === "InProgress";
  const isPaused = match.status === "Paused";
  const isDone = match.status === "Completed";

  const halfLength = match.minutesPerHalf || 0;
  const maxStoppage = Math.ceil(halfLength * 0.5);
  const stoppageRemaining = Math.max(0, maxStoppage - (match.extraMinutesAddedThisHalf || 0));
  const scoresLevel = match.homeScore === match.awayScore;
  const extraTimeApplicable = match.currentHalf <= 2
    ? (match.extraTimeAllowed && !match.drawAllowed && scoresLevel)
    : true;
  const maxHalves = extraTimeApplicable ? 4 : 2;
  const halvesRemaining = maxHalves - match.currentHalf;
  const isPenaltyShootout = match.status === "PenaltyShootout";
  const shouldOfferPenalties = isPaused && halvesRemaining <= 0 && scoresLevel && !match.drawAllowed && !isPenaltyShootout;
  const halfLengthSeconds = halfLength * 60;
  const priorHalvesSeconds = (match.currentHalf - 1) * halfLengthSeconds;
  const cappedHalfSeconds = Math.min(displaySeconds, halfLengthSeconds);
  const baseClockSeconds = priorHalvesSeconds + cappedHalfSeconds;
  const inStoppage = displaySeconds > halfLengthSeconds;
  const stoppageSecondsElapsed = inStoppage ? displaySeconds - halfLengthSeconds : 0;
  const addedMinutesThisHalf = match.extraMinutesAddedThisHalf || 0;
  const subsUsedByTeam = (teamId) =>
    events.filter((e) => e.eventType === "SubstitutionIn" && e.teamId === teamId).length;

  const subsRemainingByTeam = (teamId) => {
    if (match.maxSubstitutions == null) return null;
    return Math.max(0, match.maxSubstitutions - subsUsedByTeam(teamId));
  };

  const homeSubsRemaining = subsRemainingByTeam(match.homeTeamId);
  const awaySubsRemaining = subsRemainingByTeam(match.awayTeamId);

  const modalTeamOptions = [match.homeTeam, match.awayTeam].filter(Boolean);
  const modalPlayerPool = selectedTeamId
    ? (selectedTeamId === match.homeTeamId ? startingPlayers(match.homeTeam) : startingPlayers(match.awayTeam))
    : [];
  const modalBenchPool = selectedTeamId
    ? (selectedTeamId === match.homeTeamId ? benchPlayers(match.homeTeam) : benchPlayers(match.awayTeam))
    : [];

  return (
    <div>
      <button
        onClick={onBack}
        style={{ background: "rgba(247,245,239,0.1)", color: "#F7F5EF", border: "1px solid rgba(247,245,239,0.25)", borderRadius: 8, padding: "0.5rem 1rem", fontSize: 13, cursor: "pointer", marginBottom: 16 }}
      >
        ← Back to matches
      </button>

      {error && (
        <div style={{ background: "rgba(226,75,74,0.15)", border: "1px solid #e24b4a", padding: "0.8rem 1rem", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      {!isDone && isPaused && autoPausedHalf === match.currentHalf && halvesRemaining > 0 && (
        <div style={{ background: "rgba(242,169,59,0.15)", border: "1px solid #F2A93B", color: "#F7F5EF", padding: "0.8rem 1rem", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {getHalfLabel(match.currentHalf)} time is up. Add stoppage time if needed, or move to {getHalfLabel(match.currentHalf + 1)}.
        </div>
      )}
      {!isDone && isPaused && autoPausedHalf === match.currentHalf && halvesRemaining <= 0 && (
        <div style={{ background: "rgba(242,169,59,0.15)", border: "1px solid #F2A93B", color: "#F7F5EF", padding: "0.8rem 1rem", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {getHalfLabel(match.currentHalf)} time is up. This is the final half — add stoppage time if needed, or end the match.
        </div>
      )}
      {!isDone && isPaused && autoPausedHalf !== match.currentHalf && !isPenaltyShootout && (
        <div style={{ background: "rgba(66,133,244,0.12)", border: "1px solid rgba(66,133,244,0.4)", color: "#F7F5EF", padding: "0.8rem 1rem", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          Match is paused. Click Resume to continue {getHalfLabel(match.currentHalf)}.
        </div>
      )}

      {/* Scoreboard */}
      <div style={{ background: "#F7F5EF", color: "#1B1B1B", borderRadius: 14, padding: "1.5rem", marginBottom: 20, textAlign: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: isDone ? "#3b6d11" : "#8a4b1b", letterSpacing: "0.08em", marginBottom: 8 }}>
          {isDone ? "FULL TIME — MATCH SUMMARY" : isPenaltyShootout ? "🎯 PENALTY SHOOTOUT" : isPaused ? "⏸ PAUSED" : `● LIVE — ${getHalfLabel(match.currentHalf)}`}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
          <span style={{ fontSize: 18, fontWeight: 700, flex: 1, textAlign: "right" }}>{match.homeTeamName}</span>
          <span style={{ fontFamily: font.display, fontSize: 42, color: "#1B4332" }}>
            {match.homeScore} - {match.awayScore}
          </span>
          <span style={{ fontSize: 18, fontWeight: 700, flex: 1, textAlign: "left" }}>{match.awayTeamName}</span>
        </div>

        {match.penaltyHomeScore != null && (
          <div style={{ fontSize: 13, color: "#8a4b1b", fontWeight: 700, marginTop: 6 }}>
            🎯 {match.penaltyHomeScore} - {match.penaltyAwayScore} on penalties
            {match.penaltyWinnerTeamId && (
              <span> — {match.penaltyWinnerTeamId === match.homeTeamId ? match.homeTeamName : match.awayTeamName} win</span>
            )}
          </div>
        )}

        {match.forfeitWinnerTeamId && (
          <div style={{ fontSize: 13, color: "#a33", fontWeight: 700, marginTop: 6 }}>
            🚫 Match abandoned — {match.forfeitWinnerTeamId === match.homeTeamId ? match.homeTeamName : match.awayTeamName} win by forfeit
          </div>
        )}

        {!isDone && !isPenaltyShootout && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6 }}>
              <span style={{ fontFamily: "'Teko', sans-serif", fontSize: 28, color: "#8a8677", letterSpacing: "0.05em" }}>
                {formatStopwatch(baseClockSeconds)}
              </span>
              {addedMinutesThisHalf > 0 && (
                <span
                  style={{
                    fontFamily: "'Teko', sans-serif",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#8a4b1b",
                    background: "rgba(242,169,59,0.25)",
                    padding: "2px 8px",
                    borderRadius: 6,
                    animation: inStoppage ? "pulse 1.5s ease-in-out infinite" : "none",
                  }}
                >
                  +{addedMinutesThisHalf}'
                </span>
              )}
            </div>
            {inStoppage && (
              <div style={{ fontSize: 11, color: "rgba(138,134,119,0.7)", marginTop: 2 }}>
                stoppage: {formatStopwatch(stoppageSecondsElapsed)}
              </div>
            )}
          </div>
        )}
      </div>

      {isPenaltyShootout && (
        <PenaltyShootout matchId={matchId} match={match} onDecided={refresh} />
      )}

      {!isDone && !isPenaltyShootout && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {isLive && <button onClick={handlePause} disabled={busy} style={btnStyle("#8a4b1b")}>⏸ Pause</button>}
            {isPaused && <button onClick={handleResume} disabled={busy} style={btnStyle("#3b6d11")}>▶ Resume</button>}

            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="number" min={1} max={stoppageRemaining || 1}
                value={addTimeMinutes}
                onChange={(e) => setAddTimeMinutes(Math.max(1, Number(e.target.value) || 1))}
                style={{ width: 50, padding: "0.5rem", borderRadius: 6, border: "1.5px solid rgba(247,245,239,0.3)", background: "rgba(247,245,239,0.1)", color: "#F7F5EF", fontSize: 13, textAlign: "center" }}
              />
              <button onClick={handleAddTime} disabled={busy || stoppageRemaining <= 0} style={btnStyle(stoppageRemaining > 0 ? "#555" : "#555a")}>
                + Add time
              </button>
            </div>

            {halvesRemaining > 0 && (
              <button onClick={handleNextHalf} disabled={busy} style={btnStyle("#555")}>
                {match.currentHalf === 2 ? `Proceed to ${getHalfLabel(3)} →` : `Next half →`}
              </button>
            )}
            <button onClick={handleComplete} disabled={busy} style={btnStyle("#e24b4a")}>🏁 End match</button>
          </div>

          <p style={{ fontSize: 12, color: "rgba(247,245,239,0.55)", marginBottom: 20 }}>
            Stoppage time this half: {match.extraMinutesAddedThisHalf || 0} / {maxStoppage} min added
            {stoppageRemaining <= 0 && " — limit reached for this half"}
          </p>
          {halvesRemaining <= 0 && (
            <p style={{ fontSize: 12, color: "rgba(247,245,239,0.5)", marginBottom: 12 }}>
              Final half reached — end the match when ready.
            </p>
          )}
          {shouldOfferPenalties && (
            <div style={{ background: "rgba(66,133,244,0.12)", border: "1px solid rgba(66,133,244,0.4)", borderRadius: 10, padding: "1rem", marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: "#F7F5EF", marginBottom: 10 }}>Scores are level — go to a penalty shootout?</p>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label style={{ fontSize: 12, color: "rgba(247,245,239,0.7)" }}>
                  Takers per side
                  <input
                    type="number" min={1}
                    value={penaltyTakers}
                    onChange={(e) => setPenaltyTakers(Math.max(1, Number(e.target.value) || 1))}
                    style={{ display: "block", width: 60, marginTop: 4, padding: "0.4rem", borderRadius: 6, border: "1.5px solid rgba(247,245,239,0.3)", background: "rgba(247,245,239,0.1)", color: "#F7F5EF" }}
                  />
                </label>
                <button onClick={handleStartPenalties} disabled={startingPenalties} style={{ background: "#F2A93B", color: "#1B1B1B", border: "none", borderRadius: 8, padding: "0.6rem 1rem", fontWeight: 700, cursor: "pointer" }}>
                  {startingPenalties ? "Starting…" : "🎯 Start penalties"}
                </button>
              </div>
            </div>
          )}
          {match.maxSubstitutions != null && (
            <p style={{ fontSize: 12, color: "rgba(247,245,239,0.55)", marginBottom: 8 }}>
              Substitutions remaining — {match.homeTeamName}: {homeSubsRemaining} / {match.maxSubstitutions}
              {" · "}
              {match.awayTeamName}: {awaySubsRemaining} / {match.maxSubstitutions}
            </p>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
            <button onClick={() => openModal("Goal")} disabled={busy} style={eventBtnStyle}>⚽ Goal</button>
            <button onClick={() => openModal("YellowCard")} disabled={busy} style={eventBtnStyle}>🟨 Yellow</button>
            <button onClick={() => openModal("RedCard")} disabled={busy} style={eventBtnStyle}>🟥 Red</button>
            <button onClick={() => openModal("SubstitutionIn")} disabled={busy || (homeSubsRemaining === 0 && awaySubsRemaining === 0)} style={eventBtnStyle}>🔁 Substitution</button>
          </div>
        </>
      )}

      {actionModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
          <div style={{ background: "#F7F5EF", color: "#1B1B1B", borderRadius: 14, padding: "1.5rem", maxWidth: 420, width: "100%", maxHeight: "85vh", overflowY: "auto" }}>
            <h3 style={{ fontFamily: font.display, fontSize: 20, margin: "0 0 14px" }}>
              {EVENT_LABEL[actionModal]}
            </h3>

            <p style={{ fontSize: 12, color: "#8a8677", marginBottom: 6 }}>Team</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {modalTeamOptions.map((t) => {
                const remaining = subsRemainingByTeam(t.id);
                const disabled = actionModal === "SubstitutionIn" && remaining === 0;
                return (
                  <button
                    key={t.id}
                    onClick={() => { if (!disabled) { setSelectedTeamId(t.id); setSelectedPlayerId(null); setSelectedIncomingId(null); } }}
                    disabled={disabled}
                    style={{
                      flex: 1, padding: "0.5rem", borderRadius: 8, fontSize: 13, fontWeight: 600,
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.4 : 1,
                      background: selectedTeamId === t.id ? "#1B4332" : "#EDEAE0",
                      color: selectedTeamId === t.id ? "#F7F5EF" : "#1B1B1B",
                      border: "none",
                    }}
                  >
                    {t.name}{actionModal === "SubstitutionIn" && remaining !== null ? ` (${remaining} left)` : ""}
                  </button>
                );
              })}
            </div>

            {selectedTeamId && (
              <>
                <p style={{ fontSize: 12, color: "#8a8677", marginBottom: 6 }}>
                  {actionModal === "SubstitutionIn" ? "Player going off" : "Player"}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                  {modalPlayerPool.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPlayerId(p.id)}
                      style={{
                        padding: "0.5rem 0.7rem", borderRadius: 6, fontSize: 13, cursor: "pointer",
                        background: selectedPlayerId === p.id ? "#E3EEE6" : "#EDEAE0",
                        border: selectedPlayerId === p.id ? "1.5px solid #1B4332" : "1.5px solid transparent",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                      }}
                    >
                      <span>
                        {p.jerseyNumber != null && <strong>#{p.jerseyNumber} </strong>}{p.name}
                      </span>
                      {yellowCardCounts[p.id] >= 1 && <span title="Booked">🟨</span>}
                    </div>
                  ))}
                  {modalPlayerPool.length === 0 && <p style={{ fontSize: 12, color: "#8a8677" }}>No starting players available.</p>}
                </div>
              </>
            )}

            {actionModal === "SubstitutionIn" && selectedTeamId && (
              <>
                <p style={{ fontSize: 12, color: "#8a8677", marginBottom: 6 }}>Player coming on</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                  {modalBenchPool.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedIncomingId(p.id)}
                      style={{
                        padding: "0.5rem 0.7rem", borderRadius: 6, fontSize: 13, cursor: "pointer",
                        background: selectedIncomingId === p.id ? "#E3EEE6" : "#EDEAE0",
                        border: selectedIncomingId === p.id ? "1.5px solid #1B4332" : "1.5px solid transparent",
                      }}
                    >
                      {p.jerseyNumber != null && <strong>#{p.jerseyNumber} </strong>}{p.name}
                    </div>
                  ))}
                  {modalBenchPool.length === 0 && <p style={{ fontSize: 12, color: "#8a8677" }}>No bench players available.</p>}
                </div>
              </>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={closeModal} style={{ flex: 1, padding: "0.6rem", borderRadius: 8, background: "transparent", border: "1px solid #ccc", cursor: "pointer", fontSize: 13 }}>
                Cancel
              </button>
              <button
                onClick={() => submitEvent(actionModal)}
                disabled={
                  busy || !selectedTeamId || !selectedPlayerId ||
                  (actionModal === "SubstitutionIn" && (!selectedIncomingId || modalBenchPool.length === 0))
                }
                style={{ flex: 1, padding: "0.6rem", borderRadius: 8, background: "#639922", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13 }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <h3 style={{ fontFamily: font.display, fontSize: 20, marginBottom: 12 }}>
        {isDone ? "MATCH REVIEW" : "MATCH TIMELINE"}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {events
          .map((e, index) => ({ ...e, _index: index }))
          .slice()
          .reverse()
          .map((e) => (
            <div key={e.id} style={{ background: "#F7F5EF", color: "#1B1B1B", borderRadius: 8, padding: "0.6rem 0.9rem", fontSize: 13, display: "flex", gap: 10 }}>
              <span style={{ fontWeight: 700, color: "#8a8677", minWidth: 44 }}>{formatEventMinute(e)}</span>
              <span>{describeEvent(e, e._index)}</span>
            </div>
          ))}
        {events.length === 0 && <p style={{ fontSize: 13, color: "rgba(247,245,239,0.5)" }}>No events yet.</p>}
      </div>
    </div>
  );
}

const btnStyle = (color) => ({
  background: color, color: "#F7F5EF", border: "none", borderRadius: 8,
  padding: "0.6rem 1rem", fontSize: 13, fontWeight: 600, cursor: "pointer",
});

const eventBtnStyle = {
  flex: "1 1 120px", background: "#F2A93B", color: "#1B1B1B", border: "none",
  borderRadius: 10, padding: "0.9rem", fontSize: 14, fontWeight: 700, cursor: "pointer",
};