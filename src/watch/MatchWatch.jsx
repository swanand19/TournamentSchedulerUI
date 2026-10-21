import { useCallback, useEffect, useState } from "react";
import { font, themeFor } from "../theme";
import Bump from "../Bump";
import ErrorBanner from "../ErrorBanner";
import ScoringBanner from "../ScoringBanner";
import { OpenPlayerContext } from "../playerContext";
import { TargetIcon, TrophyIcon } from "../icons";
import { getWatchMatch } from "../api/watchApi";
import { getCricketAwards, getCricketMatch } from "../api/cricketApi";
import { getMatch, getMatchEvents } from "../api/matchesApi";
import CricketScorecard from "../cricket/CricketScorecard";
import { formatStopwatch, periodSeconds, priorPeriodsMinutes } from "../footballClock";
import ActivityFeed from "./ActivityFeed";
import SideList from "./SideList";
import { useActivity } from "./useActivity";
import { usePoll } from "./usePoll";

// Watching a match (Round 2) — for everyone who can't score it, and for owners and scorers who
// chose "Watch" while someone else scores. Before the start: a preview with both squads (the XIs
// and the toss once a cricket match is set up). Once under way: Live (the scoreboard beside the
// match activity on a wide screen, one above the other on a phone) and the Scorecard (cricket) or
// Line-ups (football). Nothing here changes the match; it all polls, following the scorer.

const pill = (background, color) => ({
  display: "inline-flex",
  alignItems: "center",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.04em",
  padding: "0.25rem 0.6rem",
  borderRadius: 6,
  background,
  color,
});

function Board({ t, children }) {
  return (
    <div style={{ background: t.deck, border: `1px solid ${t.accentSoft}`, borderRadius: 16, padding: "1.1rem 1.25rem", color: t.onDark, display: "grid", gap: 10 }}>
      {children}
    </div>
  );
}

function Preview({ t, w, sport }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Board t={t}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span style={{ flex: 1, color: t.accent, fontSize: 13, fontWeight: 500 }}>
            {w.tournamentName} · Group {w.groupName} · Match {w.matchNumber}
          </span>
          <span style={pill(t.accentSoft, t.accent)}>Not started</span>
        </div>
        <h2 style={{ margin: 0, fontFamily: font.display, fontWeight: 400, fontSize: "clamp(1.6rem, 6vw, 2.4rem)", lineHeight: 1.1 }}>
          {w.home.name.toUpperCase()} <span style={{ color: t.accent }}>V</span> {w.away.name.toUpperCase()}
        </h2>
        {w.formatLine && <div style={{ fontSize: 14 }}>{w.formatLine}</div>}
        {w.tossLine && <div style={{ fontSize: 14, fontWeight: 600 }}>{w.tossLine}</div>}
        <div style={{ fontSize: 12, color: t.onDarkMuted }}>
          {sport === "cricket" ? "The live score opens here with the first ball." : "The live score opens here at kick-off."}
        </div>
      </Board>
      <div className="watch-sides">
        <SideList theme={t} side={w.home} sport={sport} />
        <SideList theme={t} side={w.away} sport={sport} />
      </div>
    </div>
  );
}

/** For owners and scorers only: who is scoring, and the way back to scoring when it's free. */
function WatchStrip({ t, sport, matchId, scoring, over, canScore, onOpenScoring, onChanged }) {
  if (!canScore || over || !scoring) return null;
  if (scoring.canScore) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: t.accentSoft, border: `1px solid ${t.accent}`, borderRadius: 10, padding: "0.8rem 1rem", fontSize: 14 }}>
        <span style={{ flex: "1 1 200px", fontWeight: 600 }}>
          {scoring.isActiveScorer ? "You are scoring this match." : "Nobody is scoring this match right now."}
        </span>
        <button onClick={onOpenScoring} style={{ minHeight: 44, background: t.accent, color: t.accentInk, border: "none", borderRadius: 8, padding: "0.5rem 1rem", fontWeight: 700, cursor: "pointer" }}>
          Open scoring
        </button>
      </div>
    );
  }
  return <ScoringBanner sport={sport} matchId={matchId} scoring={scoring} onChange={onChanged} watching />;
}

function inningsLabel(state) {
  if (state.status === "SuperOver") return "SUPER OVER";
  const live = state.current;
  if (!live) return state.status === "Completed" || state.status === "Abandoned" ? "RESULT" : state.status === "InningsBreak" ? "INNINGS BREAK" : "BEFORE THE FIRST BALL";
  const n = live.inningsNumber;
  return `${n}${n === 1 ? "ST" : n === 2 ? "ND" : n === 3 ? "RD" : "TH"} INNINGS`;
}

function CricketBoard({ t, state }) {
  const live = state.current;
  const finished = state.status === "Completed" || state.status === "Abandoned";
  const opponent = live ? (live.battingTeamId === state.homeTeamId ? state.awayTeamName : state.homeTeamName) : null;
  const done = state.innings.filter((i) => i.status === "Completed");
  return (
    <Board t={t}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ flex: 1, fontFamily: font.condensed, fontSize: 19, letterSpacing: "0.12em", color: t.accent }}>{inningsLabel(state)}</span>
        {finished ? (
          <span style={pill("rgba(99,153,34,0.18)", "#B9DB94")}>Result</span>
        ) : live ? (
          <span style={pill(t.successSolid, "#FFFFFF")}><span className="live-dot" />LIVE</span>
        ) : (
          <span style={pill(t.accentSoft, t.accent)}>{state.status === "InningsBreak" ? "Break" : "Not started"}</span>
        )}
      </div>
      {live ? (
        <>
          <div style={{ fontFamily: font.display, fontSize: 24 }}>
            {live.battingTeamName.toUpperCase()}
            {opponent && <span style={{ fontFamily: font.body, fontSize: 12, fontWeight: 600, color: t.onDarkMuted, marginInlineStart: 8 }}>V {opponent.toUpperCase()}</span>}
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }} aria-live="polite">
            <span className="num" style={{ fontFamily: font.display, fontSize: "clamp(3rem, 10vw, 4.5rem)", lineHeight: 1 }}>
              {live.runs}
              <span style={{ color: t.accent }}>/</span>
              <Bump value={live.wickets} style={{ color: t.accent }} />
            </span>
            <span style={{ flex: 1 }} />
            <span style={{ textAlign: "right" }}>
              <span className="num" style={{ fontFamily: font.display, fontSize: 28 }}>
                {live.overs}
                {live.oversLimit ? <span style={{ fontSize: 18, color: t.onDarkMuted }}> / {live.oversLimit}</span> : null}
              </span>
              <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: t.onDarkMuted }}>OVERS · CRR {live.runRate.toFixed(2)}</span>
            </span>
          </div>
          {live.target != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: t.accent, color: t.accentInk, borderRadius: 8, padding: "8px 12px", fontWeight: 700, fontSize: 14 }}>
              <TargetIcon size={16} />
              <span style={{ flex: 1 }}>
                {live.runsRequired != null && live.runsRequired > 0
                  ? `Need ${live.runsRequired}${live.ballsRemaining != null ? ` off ${live.ballsRemaining}` : ""}`
                  : `Target ${live.target}`}
              </span>
              {live.requiredRunRate != null && <span>RRR {live.requiredRunRate.toFixed(2)}</span>}
            </div>
          )}
          {live.freeHitPending && <div style={{ color: t.accent, fontWeight: 700, fontSize: 14 }}>FREE HIT — next ball</div>}
        </>
      ) : (
        <div style={{ fontFamily: font.display, fontSize: 28, lineHeight: 1.1 }}>
          {state.homeTeamName.toUpperCase()} <span style={{ color: t.accent }}>V</span> {state.awayTeamName.toUpperCase()}
        </div>
      )}
      {done.length > 0 && (
        <div style={{ display: "grid", gap: 2 }}>
          {done.map((i) => (
            <span key={i.id} style={{ fontSize: 12, color: t.onDarkMuted }}>
              {i.isSuperOver ? "Super over · " : ""}
              {i.battingTeamName}: {i.scoreLine}
            </span>
          ))}
        </div>
      )}
      {!live && state.tossSummary && <span style={{ fontSize: 12, color: t.onDarkMuted }}>{state.tossSummary}.</span>}
      {state.resultSummary && <div style={{ fontFamily: font.display, fontSize: 22, color: t.accent }}>{state.resultSummary.toUpperCase()}</div>}
    </Board>
  );
}

function CreaseCard({ t, live }) {
  const batter = (b, striker) => {
    const sr = b.ballsFaced ? ((b.runs * 100) / b.ballsFaced).toFixed(1) : "0.0";
    return (
      <div key={b.playerId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", borderRadius: 8, background: striker ? "#EDEAE0" : "transparent" }}>
        <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 5, background: striker ? t.accent : "transparent", border: `1.5px solid ${striker ? t.accent : t.muted}` }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontWeight: 600, fontSize: 16 }}>{b.playerName}{striker ? " *" : ""}</span>
          <span style={{ fontSize: 12, color: t.muted }}>{b.ballsFaced}b · {b.fours}×4 · {b.sixes}×6 · SR {sr}</span>
        </span>
        <span className="num" style={{ fontFamily: font.display, fontSize: 24 }}>{b.runs}</span>
      </div>
    );
  };
  const b = live.bowler;
  return (
    <div style={{ background: t.cream, color: t.ink, borderRadius: 14, padding: 10, borderBottom: `2px solid ${t.deck}`, display: "grid", gap: 2 }}>
      {live.striker && batter(live.striker, true)}
      {live.nonStriker && batter(live.nonStriker, false)}
      {b && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px 4px", borderTop: "1px solid rgba(27,27,27,0.1)", marginTop: 4 }}>
          <span style={{ flex: 1, fontWeight: 600, fontSize: 16 }}>{b.playerName}</span>
          <span className="num" style={{ fontFamily: font.display, fontSize: 20 }}>{b.overs}-{b.maidens}-{b.runs}-{b.wickets}</span>
        </div>
      )}
      {live.partnershipBalls > 0 && (
        <div style={{ fontSize: 12, color: t.muted, padding: "2px 8px" }}>
          Partnership {live.partnershipRuns} ({live.partnershipBalls}b) · Extras {live.extrasTotal}
        </div>
      )}
    </div>
  );
}

function OverStrip({ t, live, ballsPerOver }) {
  const legal = live.thisOver.filter((b) => !b.display.startsWith("wd") && !b.display.startsWith("nb")).length;
  const runs = live.thisOver.reduce((n, b) => n + b.runs, 0);
  const overNumber = Math.floor(parseFloat(live.overs)) + (legal < ballsPerOver ? 1 : 0);
  const chip = (b) => {
    const background = b.isWicket ? t.dangerSolid : b.isBoundary ? t.accent : b.isExtra ? t.deckRaised : t.surfaceOnDark;
    return (
      <span key={b.sequenceNumber} className="num" title={b.isFreeHit ? "Free hit" : undefined} style={{ minWidth: 34, height: 34, padding: "0 6px", borderRadius: 17, display: "inline-flex", alignItems: "center", justifyContent: "center", background, color: b.isBoundary ? t.accentInk : t.onDark, fontFamily: font.display, fontSize: b.display.length > 2 ? 12 : 16, border: `1px solid ${b.isFreeHit ? t.accent : t.borderOnDark}` }}>
        {b.display}
      </span>
    );
  };
  return (
    <div style={{ background: t.deck, border: `1px solid ${t.borderOnDark}`, borderRadius: 12, padding: "10px 12px", color: t.onDark }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
        <span style={{ flex: 1, fontFamily: font.condensed, fontSize: 18, letterSpacing: "0.12em" }}>THIS OVER ({overNumber})</span>
        <span style={{ fontSize: 12, color: t.onDarkMuted, fontWeight: 600 }}>{runs} runs</span>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {live.thisOver.map(chip)}
        {Array.from({ length: Math.max(0, ballsPerOver - legal) }, (_, i) => (
          <span key={`e${i}`} style={{ width: 34, height: 34, borderRadius: 17, border: `1px dashed ${t.borderOnDark}` }} />
        ))}
      </div>
    </div>
  );
}

function PlayerOfMatch({ t, matchId }) {
  const load = useCallback(() => getCricketAwards(matchId), [matchId]);
  const { data } = usePoll(load, 0);
  const potm = data?.playerOfMatch;
  if (!potm) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: t.cream, color: t.ink, borderRadius: 14, padding: "12px 16px", borderBottom: `2px solid ${t.deck}` }}>
      <TrophyIcon size={22} style={{ color: t.warnInk }} />
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: t.muted }}>Player of the match</div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{potm.playerName} <span style={{ fontWeight: 400, color: t.muted }}>· {potm.teamName}</span></div>
        <div style={{ fontSize: 12, color: t.muted }}>{potm.summary}</div>
      </div>
    </div>
  );
}

function Activity({ t, sport, matchId }) {
  const a = useActivity(sport, matchId);
  return (
    <section style={{ display: "grid", gap: 12, alignContent: "start" }}>
      <div>
        <div style={{ color: t.accent, fontSize: 13, fontWeight: 500 }}>Newest first</div>
        <h3 style={{ margin: 0, fontSize: 19, fontWeight: 600 }}>{sport === "cricket" ? "Ball by ball" : "Match activity"}</h3>
      </div>
      {!a.loaded && <ErrorBanner message={a.error} />}
      {a.loaded ? (
        <ActivityFeed theme={t} sport={sport} items={a.items} hasMore={a.hasMore} loadingMore={a.loadingMore} moreError={a.moreError} onLoadMore={a.loadMore} />
      ) : (
        !a.error && <p style={{ color: t.onDarkMuted, fontSize: 14 }}>Loading…</p>
      )}
    </section>
  );
}

function CricketLive({ t, matchId, finished, canScore, onOpenScoring }) {
  const load = useCallback(() => getCricketMatch(matchId), [matchId]);
  const { data: state, error, reload } = usePoll(load, 5000);
  const live = state?.current;
  return (
    <div className="watch-grid">
      <div className="watch-board">
        <ErrorBanner message={error} />
        <WatchStrip t={t} sport="cricket" matchId={matchId} scoring={state?.scoring} over={finished} canScore={canScore} onOpenScoring={onOpenScoring} onChanged={reload} />
        {state ? <CricketBoard t={t} state={state} /> : <p style={{ color: t.onDarkMuted }}>Loading match…</p>}
        {live && <CreaseCard t={t} live={live} />}
        {live && <OverStrip t={t} live={live} ballsPerOver={state.rules.ballsPerOver} />}
        {finished && <PlayerOfMatch t={t} matchId={matchId} />}
      </div>
      <Activity t={t} sport="cricket" matchId={matchId} />
    </div>
  );
}

function useFootballClock(match) {
  const [now, setNow] = useState(() => Date.now());
  const running = !!match && match.status !== "Completed" && match.periodState === "InPlay" && !match.pausedAt;
  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);
  if (!match || !match.halfStartedAt) return null;
  return formatStopwatch(priorPeriodsMinutes(match) * 60 + periodSeconds(match, now));
}

function FootballBoard({ t, match, events }) {
  const clock = useFootballClock(match);
  const names = new Map([...(match.homeTeam?.players ?? []), ...(match.awayTeam?.players ?? [])].map((p) => [p.id, p.name]));
  const scorers = (teamId) => {
    const by = new Map();
    for (const e of events.filter((x) => x.eventType === "Goal" && x.teamId === teamId)) {
      const who = e.playerId ? names.get(e.playerId) ?? "Unknown" : "OG";
      by.set(who, [...(by.get(who) ?? []), e.stoppageMinute ? `${e.minuteOfMatch}+${e.stoppageMinute}'` : `${e.minuteOfMatch}'`]);
    }
    return [...by.entries()].map(([who, mins]) => `${who} ${mins.join(", ")}`);
  };
  const done = match.status === "Completed";
  const status = done ? (match.forfeitWinnerTeamId ? "Awarded" : "Full time")
    : match.status === "PenaltyShootout" ? "Penalties"
    : match.periodState === "Ended" ? (match.currentHalf === 1 ? "Half-time" : "Break")
    : match.status === "Paused" ? "Play stopped" : "Live";
  const isLive = status === "Live";
  return (
    <Board t={t}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, display: "grid", gap: 6 }}>
          <span style={{ fontFamily: font.condensed, fontSize: 19, letterSpacing: "0.12em", color: t.accent }}>{match.currentPeriodLabel?.toUpperCase()}</span>
          <span>
            {isLive ? <span style={pill(t.successSolid, "#FFFFFF")}><span className="live-dot" />LIVE</span>
              : <span style={pill(done ? "rgba(99,153,34,0.18)" : t.accentSoft, done ? "#B9DB94" : t.accent)}>{status}</span>}
          </span>
        </div>
        {!done && clock && (
          <span className="num" style={{ fontFamily: font.condensed, fontSize: 40, lineHeight: 1, color: isLive ? t.onDark : t.onDarkMuted }} aria-label={`Clock ${clock}`}>
            {clock}
          </span>
        )}
      </div>
      <div className="scorebug" aria-live="polite">
        <div style={{ textAlign: "right", fontFamily: font.display, fontSize: 22 }}>{match.homeTeamName.toUpperCase()}</div>
        <div className="scorebug-score num" style={{ fontFamily: font.display, fontSize: 56, display: "flex", gap: 12, background: t.deckRaised, borderRadius: 12, padding: "0 14px" }}>
          <Bump value={match.homeScore} style={{ color: t.accent }} />
          <span style={{ opacity: 0.5 }}>:</span>
          <Bump value={match.awayScore} />
        </div>
        <div style={{ textAlign: "left", fontFamily: font.display, fontSize: 22 }}>{match.awayTeamName.toUpperCase()}</div>
      </div>
      {match.penaltyHomeScore != null && match.penaltyAwayScore != null && (
        <div style={{ textAlign: "center", color: t.accent, fontWeight: 700, fontSize: 14 }}>Penalties {match.penaltyHomeScore}–{match.penaltyAwayScore}</div>
      )}
      <div style={{ display: "flex", gap: 12, fontSize: 12, color: t.onDarkMuted }}>
        <div style={{ flex: 1, display: "grid", gap: 2 }}>{scorers(match.homeTeamId).map((s) => <span key={s}>{s}</span>)}</div>
        <div style={{ flex: 1, display: "grid", gap: 2, textAlign: "right" }}>{scorers(match.awayTeamId).map((s) => <span key={s}>{s}</span>)}</div>
      </div>
    </Board>
  );
}

function FootballLive({ t, matchId, finished, canScore, onOpenScoring }) {
  const load = useCallback(async () => {
    const [match, events] = await Promise.all([getMatch(matchId), getMatchEvents(matchId)]);
    return { match, events };
  }, [matchId]);
  const { data, error, reload } = usePoll(load, 5000);
  return (
    <div className="watch-grid">
      <div className="watch-board">
        <ErrorBanner message={error} />
        <WatchStrip t={t} sport="football" matchId={matchId} scoring={data?.match.scoring} over={finished} canScore={canScore} onOpenScoring={onOpenScoring} onChanged={reload} />
        {data ? <FootballBoard t={t} match={data.match} events={data.events} /> : <p style={{ color: t.onDarkMuted }}>Loading match…</p>}
      </div>
      <Activity t={t} sport="football" matchId={matchId} />
    </div>
  );
}

export default function MatchWatch({ sport, matchId, canScore, onBack, onOpenScoring, onOpenPlayer }) {
  const key = sport === "Cricket" ? "cricket" : "football";
  const t = themeFor(sport);
  const loadSides = useCallback(() => getWatchMatch(key, matchId), [key, matchId]);
  // Slow poll: the sides rarely change, but a preview has to notice when play starts.
  const { data: w, error } = usePoll(loadSides, 10000);
  const [tab, setTab] = useState("live");

  const tabs = [
    { key: "live", label: w?.phase === "Finished" ? "Match" : "Live" },
    { key: "more", label: key === "cricket" ? "Scorecard" : "Line-ups" },
  ];

  return (
    <OpenPlayerContext.Provider value={onOpenPlayer ?? null}>
      <div style={{ display: "grid", gap: 16, color: t.onDark }}>
        <div>
          <button
            onClick={onBack}
            style={{ minHeight: 44, background: "transparent", color: t.onDark, border: `1px solid ${t.borderOnDark}`, borderRadius: 8, padding: "0.5rem 1rem", fontWeight: 600, cursor: "pointer" }}
          >
            ← Back to matches
          </button>
        </div>
        <ErrorBanner message={w ? "" : error} />
        {!w ? (
          !error && <p style={{ color: t.onDarkMuted }}>Loading match…</p>
        ) : w.phase === "Preview" ? (
          <Preview t={t} w={w} sport={key} />
        ) : (
          <>
            <div role="tablist" style={{ display: "flex", gap: 8, borderBottom: `1px solid ${t.borderOnDark}` }}>
              {tabs.map((x) => {
                const on = tab === x.key;
                return (
                  <button
                    key={x.key}
                    role="tab"
                    aria-selected={on}
                    onClick={() => setTab(x.key)}
                    style={{ background: "transparent", color: on ? t.accent : t.onDarkMuted, border: "none", borderBottom: `3px solid ${on ? t.accent : "transparent"}`, padding: "0.6rem 1rem", minHeight: 44, fontSize: 15, cursor: "pointer", fontFamily: font.display, letterSpacing: "0.04em" }}
                  >
                    {x.label.toUpperCase()}
                  </button>
                );
              })}
            </div>
            {tab === "live" ? (
              key === "cricket" ? (
                <CricketLive t={t} matchId={matchId} finished={w.phase === "Finished"} canScore={canScore} onOpenScoring={onOpenScoring} />
              ) : (
                <FootballLive t={t} matchId={matchId} finished={w.phase === "Finished"} canScore={canScore} onOpenScoring={onOpenScoring} />
              )
            ) : key === "cricket" ? (
              <CricketScorecard matchId={matchId} />
            ) : (
              <div className="watch-sides">
                <SideList theme={t} side={w.home} sport={key} />
                <SideList theme={t} side={w.away} sport={key} />
              </div>
            )}
          </>
        )}
      </div>
    </OpenPlayerContext.Provider>
  );
}
