import { font, footballTheme as theme } from "./theme";
import { useState, useEffect } from "react";
import Bump from "./Bump";
import {
  getMatch, getMatchEvents, recordEvent, pauseClock, resumeClock,
  addTime, endPeriod, nextHalf, completeMatch, startPenalties,
} from "./api/matchesApi";
import PenaltyShootout from "./PenaltyShootout";
import Modal from "./Modal";
import ErrorBanner from "./ErrorBanner";
import {
  BallIcon, CardIcon, SwapIcon, PlayIcon, PauseIcon, StopIcon, TimerIcon, FlagIcon, TargetIcon,
  MissIcon, BanIcon,
} from "./icons";

const YELLOW_CARD = "#F4C430";

const EVENT_LABEL = {
  Goal: "Goal", YellowCard: "Yellow card", RedCard: "Red card",
  SubstitutionIn: "Substitution", HalfStart: "Period start", HalfEnd: "Period end",
  ExtraTimeStart: "Extra time begins",
  ExtraTimeAdded: "Time added", ClockPaused: "Play stopped", ClockResumed: "Play resumed",
  MatchCompleted: "Full time",
  PenaltyShootoutStarted: "Penalty shootout begins",
  PenaltyKick: "Penalty",
  MatchAbandoned: "Match abandoned",
};

// What the dialog's button does, so it can be answered without reading the rest of the dialog.
const CONFIRM_LABEL = {
  Goal: "Record goal",
  YellowCard: "Book player",
  RedCard: "Send off",
  SubstitutionIn: "Make substitution",
};

/** The icon for a timeline row or dialog title. A second yellow shows as the red it became. */
function eventIcon(e, secondYellow = false) {
  switch (e.eventType) {
    case "Goal": return <BallIcon />;
    case "YellowCard": return <CardIcon color={secondYellow ? theme.danger : YELLOW_CARD} />;
    case "RedCard": return <CardIcon color={theme.danger} />;
    case "SubstitutionIn": return <SwapIcon />;
    case "HalfStart":
    case "ClockResumed": return <PlayIcon />;
    case "HalfEnd": return <StopIcon />;
    case "ClockPaused": return <PauseIcon />;
    case "ExtraTimeStart":
    case "ExtraTimeAdded": return <TimerIcon />;
    case "MatchCompleted": return <FlagIcon />;
    case "PenaltyShootoutStarted": return <TargetIcon />;
    case "PenaltyKick": return e.penaltyScored ? <BallIcon /> : <MissIcon />;
    case "MatchAbandoned": return <BanIcon />;
    default: return null;
  }
}

// The coloured edge on a timeline row, so goals and cards stand out when reading the match back.
const EVENT_EDGE = {
  Goal: theme.accent,
  PenaltyKick: theme.accent,
  YellowCard: YELLOW_CARD,
  RedCard: theme.danger,
  MatchAbandoned: theme.danger,
};

const modalPanel = {
  background: theme.cream, color: theme.ink, borderRadius: 14, padding: "1.5rem",
};

// A selectable player in the event dialog: a real button, laid out like the row it replaced.
const pickRow = {
  width: "100%", textAlign: "left", color: theme.ink, padding: "0.5rem 0.7rem",
  borderRadius: 6, fontSize: 14, cursor: "pointer",
};

// Secondary text on the pitch: 5.9:1 (the 0.5–0.55 alphas it replaces were 3.8:1).
const ON_DARK_SOFT = "rgba(247,245,239,0.7)";

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
  return `EXTRA TIME ${currentHalf - 2}`; // periods 3,4 → ET1, ET2
}

// Regulation length of a given period — extra-time halves are usually shorter than regulation ones.
function periodMinutes(match, period) {
  if (period <= 2) return match.minutesPerHalf || 0;
  return match.extraTimeMinutesPerHalf || match.minutesPerHalf || 0;
}

function priorPeriodsMinutes(match) {
  let total = 0;
  for (let p = 1; p < match.currentHalf; p++) total += periodMinutes(match, p);
  return total;
}

export default function LiveMatch({ matchId, onBack, onCompleted }) {

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
  const [timeUpPeriod, setTimeUpPeriod] = useState(null);
  const [startingPenalties, setStartingPenalties] = useState(false);
  const [penaltyTakers, setPenaltyTakers] = useState(5);
  const [showAbandon, setShowAbandon] = useState(false);

  // Events already on the timeline when the match was opened. Anything logged after that drops into
  // place; the existing history doesn't replay every time the screen opens.
  const [initialEventIds, setInitialEventIds] = useState(null);

  const refresh = async () => {
    try {
      const [m, evts] = await Promise.all([getMatch(matchId), getMatchEvents(matchId)]);
      setMatch(m);
      setEvents(evts);
      return evts;
    } catch (e) {
      setError(e.message);
      return [];
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const evts = await refresh();
      setInitialEventIds(new Set(evts.map((e) => e.id)));
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

  const handleStartPenalties = async (takers) => {
    setStartingPenalties(true); setError("");
    try { await startPenalties(matchId, takers); await refresh(); }
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
      return `Second yellow — sent off — ${teamName ? teamName + ": " : ""}${playerName || ""}`;
    }
    if (e.eventType === "MatchAbandoned") {
      return `Match abandoned — ${teamName} win by forfeit (opponent had no eligible players remaining)`;
    }
    const label = EVENT_LABEL[e.eventType] || e.eventType;
    if (e.eventType === "SubstitutionIn" && playerName && incomingName) {
      return `${label} — ${teamName}: ${incomingName} on for ${playerName}`;
    }
    if (e.eventType === "Goal" && playerName) {
      const assist = incomingName ? ` (assist: ${incomingName})` : "";
      return `${label} — ${teamName ? teamName + ": " : ""}${playerName}${assist}`;
    }
    if (e.eventType === "PenaltyKick") {
      const outcome = e.penaltyScored ? "Scored" : "Missed";
      return `Penalty ${outcome} — ${teamName ? teamName + ": " : ""}${playerName || ""} (${e.penaltyHomeScoreAfter}-${e.penaltyAwayScoreAfter} on pens)`;
    }
    if (playerName) {
      return `${label} — ${teamName ? teamName + ": " : ""}${playerName}`;
    }
    return teamName ? `${label} — ${teamName}` : label;
  };

  const formatEventMinute = (e) =>
    e.stoppageMinute ? `${e.minuteOfMatch}+${e.stoppageMinute}'` : `${e.minuteOfMatch}'`;

  // Scorers under each side of the scorebug, the way a broadcast shows them: "Kane 23', 67'".
  const scorersFor = (teamId) => {
    const players = [...(match.homeTeam?.players || []), ...(match.awayTeam?.players || [])];
    const byPlayer = new Map();
    events.forEach((e) => {
      if (e.eventType !== "Goal" || e.teamId !== teamId) return;
      const name = players.find((p) => p.id === e.playerId)?.name || "Goal";
      if (!byPlayer.has(name)) byPlayer.set(name, []);
      byPlayer.get(name).push(formatEventMinute(e));
    });
    return [...byPlayer].map(([name, minutes]) => `${name} ${minutes.join(", ")}`);
  };

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
      const activePauseMs = match.pausedAt ? Date.now() - parseUtc(match.pausedAt).getTime() : 0;
      const elapsedMs = Date.now() - halfStartedAt - pausedMs - activePauseMs;
      const seconds = Math.max(0, Math.floor(elapsedMs / 1000));
      setDisplaySeconds(seconds);

      // Uses this period's own length, so extra-time halves aren't timed as full ones.
      const limitSeconds =
        (periodMinutes(match, match.currentHalf) + (match.extraMinutesAddedThisHalf || 0)) * 60;
      const pastLimit = limitSeconds > 0 && seconds >= limitSeconds;
      // Clears itself again when stoppage time is added, so the prompt tracks the real allowance.
      setTimeUpPeriod(pastLimit ? match.currentHalf : null);
    };

    compute();
    const interval = setInterval(compute, 1000);
    return () => clearInterval(interval);
  }, [match]);


  const handleAddTime = async () => {
    setBusy(true); setError("");
    try { await addTime(matchId, addTimeMinutes); await refresh(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  // Blowing the whistle on the current period. Doing this before regulation time is up is a
  // deliberate early finish, so it asks for confirmation; at or past time it is the normal action.
  const handleEndPeriod = async (early) => {
    const label = getHalfLabel(match.currentHalf);
    if (early && !window.confirm(
      `${label} still has time left. End it here?\n\n` +
      (match.currentHalf >= maxPeriods
        ? "This is the final period, so the match goes straight to its result."
        : `Play then moves on to ${getHalfLabel(match.currentHalf + 1)}.`)
    )) return;

    setBusy(true); setError("");
    try {
      await endPeriod(matchId);
      setTimeUpPeriod(null);
      await refresh();
    }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const handleNextHalf = async () => {
    setBusy(true); setError("");
    try {
      await nextHalf(matchId);
      setTimeUpPeriod(null);
      await refresh();
    }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const handleComplete = async () => {
    if (!window.confirm("Confirm the final result? This can't be undone.")) return;
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

  // Escape hatch for a match that can't be finished normally — abandoned, walkover, called off.
  // Null keeps the score as it stands; a team id awards the match to that side.
  const handleAbandon = async (awardWinnerTeamId) => {
    setShowAbandon(false);
    setBusy(true); setError("");
    try {
      await completeMatch(matchId, { force: true, awardWinnerTeamId });
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

  // Guard: without a completed setup there is no half, clock or squad to control.
  if (match.status === "NotStarted") {
    return (
      <div>
        <button
          onClick={onBack}
          style={{ background: "rgba(247,245,239,0.1)", color: "#F7F5EF", border: "1px solid rgba(247,245,239,0.25)", borderRadius: 8, padding: "0.5rem 1rem", fontSize: 14, cursor: "pointer", marginBottom: 16 }}
        >
          ← Back to matches
        </button>
        <p style={{ color: "rgba(247,245,239,0.7)", fontSize: 14 }}>
          {match.homeTeamName} vs {match.awayTeamName} hasn't kicked off yet — use “Start match” on the matches list to set up the squads first.
        </p>
      </div>
    );
  }

  const isDone = match.status === "Completed";
  const isPenaltyShootout = match.status === "PenaltyShootout";

  // The server owns the rules: it decides what is legal right now and the UI just renders it.
  // Deriving these client-side is what produced the "scores are level" prompt at the kick-off of
  // the second half — "paused" meant half time, an injury stoppage and full time all at once.
  const periodState = match.periodState;          // NotStarted | InPlay | Stopped | Ended
  const inPlay = periodState === "InPlay";
  const stoppedMidPeriod = periodState === "Stopped";
  const periodEnded = periodState === "Ended" && !isDone && !isPenaltyShootout;

  const maxPeriods = match.maxPeriods;
  const canEndPeriod = match.canEndPeriod;
  const canStartNextPeriod = match.canStartNextPeriod;
  const canStartPenalties = match.canStartPenalties;
  const canCompleteNormally = match.canCompleteNormally;
  const scoresLevel = match.scoresLevel;

  const halfLength = periodMinutes(match, match.currentHalf);
  const maxStoppage = match.maxStoppageThisPeriod;
  const stoppageRemaining = match.stoppageRemainingThisPeriod;

  const halfLengthSeconds = halfLength * 60;
  const priorHalvesSeconds = priorPeriodsMinutes(match) * 60;
  const cappedHalfSeconds = Math.min(displaySeconds, halfLengthSeconds);
  const baseClockSeconds = priorHalvesSeconds + cappedHalfSeconds;
  const inStoppage = displaySeconds > halfLengthSeconds;
  const stoppageSecondsElapsed = inStoppage ? displaySeconds - halfLengthSeconds : 0;
  const addedMinutesThisHalf = match.extraMinutesAddedThisHalf || 0;

  // Regulation plus any added time has run out, but the referee hasn't blown yet.
  const timeIsUp = !periodEnded && timeUpPeriod === match.currentHalf;

  // Both sides must field the same number of takers, so the smaller squad sets the ceiling.
  const maxTakers = Math.max(1, Math.min(
    startingPlayers(match.homeTeam).length,
    startingPlayers(match.awayTeam).length
  ));
  const effectivePenaltyTakers = Math.min(penaltyTakers, maxTakers);
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
        style={{ background: "rgba(247,245,239,0.1)", color: "#F7F5EF", border: "1px solid rgba(247,245,239,0.25)", borderRadius: 8, padding: "0.5rem 1rem", fontSize: 14, cursor: "pointer", marginBottom: 16 }}
      >
        ← Back to matches
      </button>

      <ErrorBanner message={error} />

      {timeIsUp && (
        <div className="drop-in" style={{ background: "rgba(242,169,59,0.15)", border: "1px solid #F2A93B", color: "#F7F5EF", padding: "0.8rem 1rem", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          <TimerIcon /> {getHalfLabel(match.currentHalf)} has run its full time. The clock keeps going until you
          blow the whistle — add stoppage time, or end {getHalfLabel(match.currentHalf)}.
        </div>
      )}
      {stoppedMidPeriod && !timeIsUp && (
        <div className="drop-in" style={{ background: "rgba(66,133,244,0.12)", border: "1px solid rgba(66,133,244,0.4)", color: "#F7F5EF", padding: "0.8rem 1rem", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          <PauseIcon /> Play is stopped — {getHalfLabel(match.currentHalf)} is still running. Resume when play restarts.
        </div>
      )}
      {periodEnded && canStartNextPeriod && (
        <div className="drop-in" style={{ background: "rgba(66,133,244,0.12)", border: "1px solid rgba(66,133,244,0.4)", color: "#F7F5EF", padding: "0.8rem 1rem", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          <StopIcon /> {getHalfLabel(match.currentHalf)} is over{match.currentHalf === 2 ? " — level at full time" : ""}.
          {" "}Next up: {getHalfLabel(match.currentHalf + 1)}.
        </div>
      )}
      {periodEnded && !canStartNextPeriod && (
        <div className="drop-in" style={{ background: "rgba(242,169,59,0.15)", border: "1px solid #F2A93B", color: "#F7F5EF", padding: "0.8rem 1rem", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          <FlagIcon /> {maxPeriods > 2 ? "End of extra time" : "Full time"} — {match.homeTeamName} {match.homeScore}-{match.awayScore} {match.awayTeamName}.
          {canStartPenalties && " Level with no draw allowed, so a shootout decides it."}
        </div>
      )}

      {/* Scoreboard */}
      <div style={{ background: theme.cream, color: theme.ink, borderRadius: 14, padding: "1.5rem clamp(1rem, 4vw, 1.5rem)", marginBottom: 20, textAlign: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: isDone ? theme.successInk : theme.warnInk, letterSpacing: "0.08em", marginBottom: 12 }}>
          {isDone ? "FULL TIME — MATCH SUMMARY"
            : isPenaltyShootout ? <><TargetIcon size={14} /> PENALTY SHOOTOUT</>
            : periodEnded ? (canStartNextPeriod ? <><StopIcon size={14} /> END OF {getHalfLabel(match.currentHalf)}</> : <><FlagIcon size={14} /> FULL TIME</>)
            : stoppedMidPeriod ? <><PauseIcon size={14} /> STOPPED — {getHalfLabel(match.currentHalf)}</>
            : <><span className="live-dot" />LIVE — {getHalfLabel(match.currentHalf)}</>}
        </div>
        <div className="scorebug">
          {[
            { id: match.homeTeamId, name: match.homeTeamName, align: "right" },
            null,
            { id: match.awayTeamId, name: match.awayTeamName, align: "left" },
          ].map((side) => side ? (
            <div key={side.id} style={{ textAlign: side.align, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700, overflowWrap: "anywhere" }}>{side.name}</div>
              {scorersFor(side.id).map((line) => (
                <div key={line} className="num" style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}><BallIcon size={12} /> {line}</div>
              ))}
            </div>
          ) : (
            <div key="score" className="scorebug-score num" style={{ fontFamily: font.display, fontSize: 48, lineHeight: 1, color: theme.deep, display: "flex", justifyContent: "center", gap: 14 }}>
              <Bump value={match.homeScore} />
              <span style={{ color: theme.muted, opacity: 0.5 }}>–</span>
              <Bump value={match.awayScore} />
            </div>
          ))}
        </div>

        {match.penaltyHomeScore != null && (
          <div className="num" style={{ fontSize: 14, color: theme.warnInk, fontWeight: 700, marginTop: 6 }}>
            <TargetIcon size={14} /> {match.penaltyHomeScore} - {match.penaltyAwayScore} on penalties
            {match.penaltyWinnerTeamId && (
              <span> — {match.penaltyWinnerTeamId === match.homeTeamId ? match.homeTeamName : match.awayTeamName} win</span>
            )}
          </div>
        )}

        {match.forfeitWinnerTeamId && (
          <div style={{ fontSize: 14, color: "#a33", fontWeight: 700, marginTop: 6 }}>
            <BanIcon size={14} /> Match abandoned — {match.forfeitWinnerTeamId === match.homeTeamId ? match.homeTeamName : match.awayTeamName} win by forfeit
          </div>
        )}

        {!isDone && !isPenaltyShootout && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {/* The match clock as a broadcast bug: light digits on the pitch colour. */}
              <span className="num" style={{ fontFamily: font.condensed, fontSize: 28, lineHeight: 1, color: theme.cream, background: stoppedMidPeriod ? theme.muted : theme.deep, transition: "background-color 200ms ease", borderRadius: 6, padding: "5px 12px 1px", letterSpacing: "0.05em" }}>
                {formatStopwatch(baseClockSeconds)}
              </span>
              {addedMinutesThisHalf > 0 && (
                <span
                  className={inStoppage ? "stoppage-pulse" : undefined}
                  style={{
                    fontFamily: font.condensed,
                    fontSize: 18,
                    fontWeight: 600, // Teko is loaded at 500/600; 700 was being faked
                    color: theme.warnInk,
                    background: "rgba(242,169,59,0.25)",
                    padding: "2px 8px",
                    borderRadius: 6,
                  }}
                >
                  +{addedMinutesThisHalf}'
                </span>
              )}
            </div>
            {inStoppage && (
              <div style={{ fontSize: 11, color: theme.muted, marginTop: 2 }}>
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
          {/* The period is over: this is the one decision to make, so it comes first. */}
          {periodEnded && (
            <div className="drop-in" style={{ background: "rgba(247,245,239,0.06)", border: "1px solid rgba(247,245,239,0.18)", borderRadius: 10, padding: "1rem", marginBottom: 20 }}>
              <p style={{ fontSize: 14, color: "rgba(247,245,239,0.85)", margin: "0 0 12px" }}>
                {canStartNextPeriod
                  ? `${getHalfLabel(match.currentHalf)} is complete. Kick off ${getHalfLabel(match.currentHalf + 1)} when both teams are ready.`
                  : canStartPenalties
                    ? "The teams can't be separated and this match doesn't allow a draw — a shootout settles it."
                    : "The result stands. Confirm it to close the match out."}
              </p>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {canStartNextPeriod && (
                  <button onClick={handleNextHalf} disabled={busy} style={btnStyle(theme.successSolid)}>
                    <PlayIcon /> Kick off {getHalfLabel(match.currentHalf + 1).toLowerCase()}
                  </button>
                )}
                {canCompleteNormally && (
                  <button onClick={handleComplete} disabled={busy} style={btnStyle(theme.successSolid)}>
                    <FlagIcon /> Confirm {scoresLevel ? "draw" : "result"}
                  </button>
                )}
              </div>

              {canStartPenalties && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(247,245,239,0.15)", display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                  <label style={{ fontSize: 14, color: ON_DARK_SOFT }}>
                    Takers per side (max {maxTakers})
                    <input
                      type="number" min={1} max={maxTakers}
                      value={effectivePenaltyTakers}
                      onChange={(e) => setPenaltyTakers(Math.min(maxTakers, Math.max(1, Number(e.target.value) || 1)))}
                      style={{ display: "block", width: 70, marginTop: 4, padding: "0.4rem", borderRadius: 6, border: "1.5px solid rgba(247,245,239,0.3)", background: "rgba(247,245,239,0.1)", color: theme.cream }}
                    />
                  </label>
                  <button onClick={() => handleStartPenalties(effectivePenaltyTakers)} disabled={startingPenalties || busy} style={{ ...btnStyle(theme.accent), color: theme.accentInk, fontWeight: 700 }}>
                    <TargetIcon /> {startingPenalties ? "Starting…" : "Start penalty shootout"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* The scoring pad sits right under the score: it's what the scorer reaches for most.
              Only a goal is filled — it's the main event. A goal needs the ball in play; cards and
              substitutions happen during the interval too. */}
          <div className="cols" style={{ "--cols": 4, "--cols-sm": 2, gap: 8, marginBottom: 10 }}>
            <button
              onClick={() => openModal("Goal")}
              disabled={busy || periodEnded}
              title={periodEnded ? "The ball is out of play between periods" : ""}
              style={{ ...eventBtnStyle, background: theme.accent, color: theme.accentInk, borderColor: "transparent" }}
            >
              <BallIcon size={18} /> Goal
            </button>
            <button onClick={() => openModal("YellowCard")} disabled={busy} style={eventBtnStyle}>
              <CardIcon size={18} color={YELLOW_CARD} /> Yellow card
            </button>
            <button onClick={() => openModal("RedCard")} disabled={busy} style={eventBtnStyle}>
              <CardIcon size={18} color={theme.danger} /> Red card
            </button>
            <button onClick={() => openModal("SubstitutionIn")} disabled={busy || (homeSubsRemaining === 0 && awaySubsRemaining === 0)} style={eventBtnStyle}>
              <SwapIcon size={18} /> Substitution
            </button>
          </div>
          {periodEnded && (
            <p style={{ fontSize: 14, color: ON_DARK_SOFT, margin: "0 0 6px" }}>
              Goals are locked between periods — cards and substitutions are still allowed.
            </p>
          )}
          {match.maxSubstitutions != null && (
            <p className="num" style={{ fontSize: 14, color: ON_DARK_SOFT, margin: "0 0 24px" }}>
              Substitutions left — {match.homeTeamName}: {homeSubsRemaining} / {match.maxSubstitutions}
              {" · "}
              {match.awayTeamName}: {awaySubsRemaining} / {match.maxSubstitutions}
            </p>
          )}

          {/* Clock controls — only while a period is actually being played. */}
          {!periodEnded && (
            <>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
                {inPlay && <button onClick={handlePause} disabled={busy} style={btnStyle(theme.warnInk)}><PauseIcon /> Stop play</button>}
                {stoppedMidPeriod && <button onClick={handleResume} disabled={busy} style={btnStyle(theme.successSolid)}><PlayIcon /> Resume</button>}

                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="number" min={1} max={stoppageRemaining || 1}
                    aria-label="Minutes of stoppage time to add"
                    value={addTimeMinutes}
                    onChange={(e) => setAddTimeMinutes(Math.max(1, Number(e.target.value) || 1))}
                    style={{ width: 50, padding: "0.5rem", borderRadius: 6, border: "1.5px solid rgba(247,245,239,0.3)", background: "rgba(247,245,239,0.1)", color: theme.cream, fontSize: 14, textAlign: "center" }}
                  />
                  <button onClick={handleAddTime} disabled={busy || stoppageRemaining <= 0} style={btnStyle("#555")}>
                    <TimerIcon /> Add time
                  </button>
                </div>

                {canEndPeriod && (
                  <button
                    onClick={() => handleEndPeriod(!timeIsUp)}
                    disabled={busy}
                    style={btnStyle(timeIsUp ? theme.successSolid : "#555")}
                  >
                    <StopIcon /> End {getHalfLabel(match.currentHalf).toLowerCase()}
                    {!timeIsUp && " early"}
                  </button>
                )}
              </div>

              <p className="num" style={{ fontSize: 14, color: ON_DARK_SOFT, margin: "0 0 24px" }}>
                Stoppage time this period: {addedMinutesThisHalf} / {maxStoppage} min added
                {stoppageRemaining <= 0 && " — limit reached"}
                {match.currentHalf > 2 && ` · extra-time halves are ${halfLength} min`}
              </p>
            </>
          )}

          {/* Always available, always deliberate — and last, set apart from the scoring pad,
              because it ends the match. */}
          <div style={{ borderTop: "1px solid rgba(247,245,239,0.15)", paddingTop: 16, marginBottom: 28 }}>
            <button onClick={() => setShowAbandon(true)} disabled={busy} style={{ ...btnStyle("transparent"), border: "1px solid rgba(226,75,74,0.6)", color: "#F4A3A3" }}>
              <BanIcon /> Abandon match…
            </button>
          </div>
        </>
      )}

      {showAbandon && (
        <Modal labelledBy="abandon-title" onClose={() => setShowAbandon(false)} panelStyle={modalPanel}>
          <h3 id="abandon-title" style={{ fontFamily: font.display, fontSize: 20, margin: "0 0 6px" }}>ABANDON MATCH</h3>
          <p style={{ fontSize: 14, color: theme.muted, margin: "0 0 16px", lineHeight: 1.5 }}>
            For a match that can't finish normally — called off, a walkover, or a side that can't
            continue. This closes the match and can't be undone.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[match.homeTeamId, match.awayTeamId].map((teamId) => (
              <button
                key={teamId}
                onClick={() => handleAbandon(teamId)}
                disabled={busy}
                style={{ background: theme.deep, color: theme.cream, border: "none", borderRadius: 8, padding: "0.75rem", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
              >
                Award the match to {findTeamName(teamId)}
              </button>
            ))}
            <button
              onClick={() => handleAbandon(null)}
              disabled={busy}
              className="num"
              style={{ background: "#EDEAE0", color: theme.ink, border: "none", borderRadius: 8, padding: "0.75rem", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Keep the score as it stands ({match.homeScore}–{match.awayScore})
            </button>
            <button
              onClick={() => setShowAbandon(false)}
              style={{ background: "transparent", color: theme.ink, border: "1px solid #ccc", borderRadius: 8, padding: "0.6rem", fontSize: 14, cursor: "pointer", marginTop: 4 }}
            >
              Keep playing
            </button>
          </div>
        </Modal>
      )}

      {actionModal && (
        <Modal labelledBy="event-title" onClose={closeModal} panelStyle={modalPanel}>
            <h3 id="event-title" style={{ fontFamily: font.display, fontSize: 20, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 }}>
              {eventIcon({ eventType: actionModal })} {EVENT_LABEL[actionModal].toUpperCase()}
            </h3>

            <p style={{ fontSize: 12, color: theme.muted, marginBottom: 6 }}>Team</p>
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
                      flex: 1, padding: "0.5rem", borderRadius: 8, fontSize: 14, fontWeight: 600,
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
                <p style={{ fontSize: 12, color: theme.muted, marginBottom: 6 }}>
                  {actionModal === "SubstitutionIn" ? "Player going off"
                    : actionModal === "Goal" ? "Scorer"
                    : "Player"}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                  {modalPlayerPool.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      aria-pressed={selectedPlayerId === p.id}
                      onClick={() => {
                        setSelectedPlayerId(p.id);
                        // A player can't assist their own goal, so drop the assist if it's now them.
                        if (actionModal === "Goal" && selectedIncomingId === p.id) setSelectedIncomingId(null);
                      }}
                      style={{
                        ...pickRow,
                        background: selectedPlayerId === p.id ? theme.tint : "#EDEAE0",
                        border: selectedPlayerId === p.id ? `1.5px solid ${theme.deep}` : "1.5px solid transparent",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                      }}
                    >
                      <span>
                        {p.jerseyNumber != null && <strong>#{p.jerseyNumber} </strong>}{p.name}
                      </span>
                      {yellowCardCounts[p.id] >= 1 && <CardIcon color={YELLOW_CARD} title="Booked" />}
                    </button>
                  ))}
                  {modalPlayerPool.length === 0 && <p style={{ fontSize: 12, color: theme.muted }}>No starting players available.</p>}
                </div>
              </>
            )}

            {actionModal === "SubstitutionIn" && selectedTeamId && (
              <>
                <p style={{ fontSize: 12, color: theme.muted, marginBottom: 6 }}>Player coming on</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                  {modalBenchPool.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      aria-pressed={selectedIncomingId === p.id}
                      onClick={() => setSelectedIncomingId(p.id)}
                      style={{
                        ...pickRow,
                        background: selectedIncomingId === p.id ? theme.tint : "#EDEAE0",
                        border: selectedIncomingId === p.id ? `1.5px solid ${theme.deep}` : "1.5px solid transparent",
                      }}
                    >
                      {p.jerseyNumber != null && <strong>#{p.jerseyNumber} </strong>}{p.name}
                    </button>
                  ))}
                  {modalBenchPool.length === 0 && <p style={{ fontSize: 12, color: theme.muted }}>No bench players available.</p>}
                </div>
              </>
            )}

            {/* Optional assist — the only way the assists leaderboard gets any data. */}
            {actionModal === "Goal" && selectedTeamId && (
              <>
                <p style={{ fontSize: 12, color: theme.muted, marginBottom: 6 }}>
                  Assisted by <span style={{ color: theme.muted }}>(optional)</span>
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                  <button
                    onClick={() => setSelectedIncomingId(null)}
                    style={{
                      padding: "0.4rem 0.7rem", borderRadius: 6, fontSize: 12, cursor: "pointer",
                      background: selectedIncomingId == null ? "#1B4332" : "#EDEAE0",
                      color: selectedIncomingId == null ? "#F7F5EF" : "#1B1B1B",
                      border: "none", fontWeight: 600,
                    }}
                  >
                    No assist
                  </button>
                  {modalPlayerPool
                    .filter((p) => p.id !== selectedPlayerId)
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedIncomingId(p.id)}
                        style={{
                          padding: "0.4rem 0.7rem", borderRadius: 6, fontSize: 12, cursor: "pointer",
                          background: selectedIncomingId === p.id ? "#F2A93B" : "#EDEAE0",
                          color: "#1B1B1B", border: "none",
                          fontWeight: selectedIncomingId === p.id ? 700 : 400,
                        }}
                      >
                        {p.jerseyNumber != null ? `#${p.jerseyNumber} ` : ""}{p.name}
                      </button>
                    ))}
                </div>
              </>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={closeModal} style={{ flex: 1, padding: "0.6rem", borderRadius: 8, background: "transparent", border: "1px solid #ccc", cursor: "pointer", fontSize: 14 }}>
                Cancel
              </button>
              <button
                onClick={() => submitEvent(actionModal)}
                disabled={
                  busy || !selectedTeamId || !selectedPlayerId ||
                  (actionModal === "SubstitutionIn" && (!selectedIncomingId || modalBenchPool.length === 0))
                }
                style={{ flex: 1, padding: "0.6rem", borderRadius: 8, background: theme.successSolid, color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14 }}
              >
                {CONFIRM_LABEL[actionModal]}
              </button>
            </div>
        </Modal>
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
            <div
              key={e.id}
              className={initialEventIds && !initialEventIds.has(e.id) ? "drop-in" : undefined}
              style={{
                background: theme.cream, color: theme.ink, borderRadius: 8, padding: "0.6rem 0.9rem", fontSize: 14, display: "flex", alignItems: "baseline", gap: 10,
                borderLeft: `4px solid ${isSecondYellow(e, e._index) ? theme.danger : EVENT_EDGE[e.eventType] || "transparent"}`,
              }}
            >
              <span className="num" style={{ fontWeight: 700, color: theme.muted, minWidth: 44 }}>{formatEventMinute(e)}</span>
              <span style={{ width: 16, flexShrink: 0 }}>{eventIcon(e, isSecondYellow(e, e._index))}</span>
              <span>{describeEvent(e, e._index)}</span>
            </div>
          ))}
        {events.length === 0 && (
          <p style={{ fontSize: 14, color: ON_DARK_SOFT }}>
            Nothing logged yet. Goals, cards and substitutions appear here as you record them.
          </p>
        )}
      </div>
    </div>
  );
}

const btnStyle = (color) => ({
  display: "inline-flex", alignItems: "center", gap: 6,
  background: color, color: theme.cream, border: "none", borderRadius: 8,
  padding: "0.6rem 1rem", fontSize: 14, fontWeight: 600, cursor: "pointer",
});

// Cards and substitutions are neutral; the Goal button overrides the fill as the one primary.
const eventBtnStyle = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  background: "rgba(247,245,239,0.1)", color: theme.cream, border: "1px solid rgba(247,245,239,0.25)",
  borderRadius: 10, padding: "0.9rem 0.6rem", fontSize: 16, fontWeight: 700, cursor: "pointer",
};