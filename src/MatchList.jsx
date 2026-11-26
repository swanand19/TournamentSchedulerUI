import { themeFor } from "./theme";
import { useEffect, useState } from "react";
import { TargetIcon, FlagIcon, TrophyIcon } from "./icons";
import { BracketIcon, EyeIcon } from "./ui/icons";
import { getKnockout } from "./api/knockoutApi";
import ChampionBanner from "./ChampionBanner";

// A tournament's Matches tab (2026-11-26, the canvas's "Web · Matches" boards): the filter, each match
// being played featured at the top (Watch / Open live scorer), then the groups and the knockouts as
// grids of match cards. A card opens what its match allows the person: the scorer's screens for
// someone who may score (set up, score, the summary), the viewer for everyone else.

// A match is "live" — and so blocks another with the same team from starting — in these states. The
// two sports name their in-play states differently, so the set is the union of both.
const LIVE_STATUSES = ["InProgress", "Paused", "PenaltyShootout", "InningsBreak", "SuperOver"];

// As on the phone's Matches tab: upcoming until it starts, completed once it's over (or abandoned),
// live in between.
const FILTERS = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
];
const phaseOf = (m) => (m.status === "NotStarted" ? "upcoming" : m.status === "Completed" || m.status === "Abandoned" ? "completed" : "live");

/** The status words on a card. "Paused" covers three football situations, so the period tells them apart. */
function statusWords(m, isCricket) {
  if (m.status === "InProgress") return "Live";
  if (m.status === "NotStarted") return "Upcoming";
  if (m.status === "Abandoned") return "Abandoned";
  if (isCricket) {
    if (m.status === "InningsBreak") return "Innings break";
    if (m.status === "SuperOver") return "Super over";
    if (m.status === "Completed") return m.isDraw ? "Draw" : m.isTie ? "Tie" : "Result";
  } else {
    if (m.status === "PenaltyShootout") return "Penalties";
    if (m.status === "Completed") return "Full time";
    if (m.status === "Paused") {
      if (m.periodState !== "Ended") return "Stopped";
      return m.currentHalf === 1 ? "Half time" : m.currentHalf === 3 ? "Extra-time break" : "Awaiting result";
    }
  }
  return "";
}

/** "Match 3, Group A" / "Match 4, Semi-final 1". */
const matchLabel = (m) => `Match ${m.matchNumber}${m.roundLabel ? `, ${m.roundLabel}` : m.groupName ? `, Group ${m.groupName}` : ""}`;

function Sides({ m, isCricket }) {
  const sides = [
    { name: m.homeTeamName, id: m.homeTeamId, fig: isCricket ? m.homeLine : m.homeScore, pens: m.penaltyWinnerTeamId === m.homeTeamId },
    { name: m.awayTeamName, id: m.awayTeamId, fig: isCricket ? m.awayLine : m.awayScore, pens: m.penaltyWinnerTeamId === m.awayTeamId },
  ];
  const started = m.status !== "NotStarted";
  return sides.map((s, i) => {
    const won = (m.winnerTeamId != null && m.winnerTeamId === s.id) || (m.penaltyWinnerTeamId != null && s.pens);
    const lost = (m.winnerTeamId != null || m.penaltyWinnerTeamId != null) && !won;
    return (
      <div key={i} className="kc-side-line" style={{ opacity: lost ? 0.6 : 1 }}>
        <b>
          {won && <TrophyIcon size={14} title="Winner" style={{ color: "var(--deep)", marginInlineEnd: 6 }} />}
          {s.name}
        </b>
        <span className="fig">{started ? s.fig ?? "—" : ""}</span>
      </div>
    );
  });
}

export default function MatchList({ tournamentId, matches, loading, tournamentStarted, starting, onStartTournament, onStartMatch, onEnterMatch, onWatchMatch, onOpenKnockouts, canScore = true, onBack, sport = "Football" }) {
  const isCricket = sport === "Cricket";
  const theme = themeFor(sport);

  // The champion is the server's word (the knockout stage's), asked for only once a knockout match is
  // over — and again whenever the list changes, so it appears as the final ends.
  const knockoutsOver = matches.filter((m) => m.stage === "Knockout" && m.status === "Completed").length;
  const [champion, setChampion] = useState(null);
  useEffect(() => {
    if (!tournamentId || knockoutsOver === 0) return undefined;
    let current = true;
    getKnockout(tournamentId)
      .then((stage) => current && setChampion(stage?.championName ?? null))
      .catch(() => {}); // the banner is extra: the list stands without it
    return () => {
      current = false;
    };
  }, [tournamentId, knockoutsOver]);

  // Several matches can be played at once, but a team only in one: a match waits while either side is
  // playing elsewhere. (The server has the last word when the match is set up.)
  const playing = new Map();
  for (const m of matches.filter((x) => LIVE_STATUSES.includes(x.status))) {
    if (m.homeTeamId != null) playing.set(m.homeTeamId, m.homeTeamName);
    if (m.awayTeamId != null) playing.set(m.awayTeamId, m.awayTeamName);
  }
  const busyTeam = (m) => playing.get(m.homeTeamId) ?? playing.get(m.awayTeamId) ?? null;

  const [filter, setFilter] = useState("all");
  const shown = filter === "all" ? matches : matches.filter((m) => phaseOf(m) === filter);
  const count = (key) => (key === "all" ? matches.length : matches.filter((m) => phaseOf(m) === key).length);
  const live = shown.filter((m) => LIVE_STATUSES.includes(m.status));

  // The groups, then the knockout matches in their own section (they have no group). The live ones
  // are featured above instead.
  const KNOCKOUT = "knockout:";
  const grouped = shown
    .filter((m) => !LIVE_STATUSES.includes(m.status))
    .reduce((acc, m) => {
      const key = m.stage === "Knockout" ? KNOCKOUT : m.groupName;
      (acc[key] = acc[key] || []).push(m);
      return acc;
    }, {});
  const sections = Object.entries(grouped).sort(([a], [b]) => (a === KNOCKOUT) - (b === KNOCKOUT));
  const hasKnockouts = matches.some((m) => m.stage === "Knockout");

  /** What a card does when clicked, and the caption under it when it can't. */
  const actionOf = (m) => {
    if (!canScore) return { open: () => onWatchMatch(m.id) };
    if (m.status === "NotStarted") {
      // A knockout match whose sides aren't known yet shows where they come from ("Group A winner").
      if (m.homeTeamId == null || m.awayTeamId == null) return { note: "Waiting for its teams" };
      const busy = busyTeam(m);
      if (busy) return { note: `${busy} is playing now` };
      return { open: () => onStartMatch(m.id), note: isCricket ? "Set up the toss and XIs" : "Set up and kick off" };
    }
    return { open: () => onEnterMatch(m.id) };
  };

  return (
    <div>
      {onBack && (
        <button type="button" className="kc-btn sm sec" onClick={onBack} style={{ marginBottom: 16 }}>
          ← Back to schedule
        </button>
      )}

      {knockoutsOver > 0 && <ChampionBanner name={champion} theme={theme} />}

      {!tournamentStarted && (
        <div className="kc-pane lined flush" style={{ padding: "22px 24px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <p className="kc-grow" style={{ margin: 0, flexBasis: 260 }}>
            This tournament hasn't started yet. Starting it makes its matches from the active schedule.
          </p>
          <button type="button" className="kc-btn pri" onClick={onStartTournament} disabled={starting}>
            <FlagIcon /> {starting ? "Starting…" : "Start tournament"}
          </button>
        </div>
      )}

      {tournamentStarted && loading && !matches.length && <p className="kc-cap">Loading matches…</p>}

      {tournamentStarted && matches.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div className="kc-seg filter" role="group" aria-label="Show matches">
            {FILTERS.map((f) => (
              <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                {f.label} <i>{count(f.key)}</i>
              </button>
            ))}
          </div>
          <span className="kc-grow" />
          {hasKnockouts && onOpenKnockouts && (
            <button type="button" className="kc-link kc-desk-only" onClick={onOpenKnockouts}>
              <BracketIcon size={18} /> See the bracket
            </button>
          )}
        </div>
      )}

      {tournamentStarted && matches.length > 0 && shown.length === 0 && (
        <p className="kc-sub" style={{ marginTop: 18 }}>
          {filter === "live" ? "No match is being played right now." : filter === "upcoming" ? "No matches left to play." : "No matches have finished yet."}
        </p>
      )}

      {/* Each match being played, featured: the score and the two ways in. */}
      {tournamentStarted &&
        live.map((m) => (
          <div key={m.id} className="kc-match featured drop-in" style={{ marginTop: 20 }}>
            <div style={{ minWidth: 0 }}>
              <span className="kc-status" style={{ marginBottom: 6 }}>
                <span className="kc-dot" aria-hidden="true" /> {statusWords(m, isCricket)} · {matchLabel(m)}
              </span>
              <Sides m={m} isCricket={isCricket} />
              {!isCricket && m.penaltyHomeScore != null && (
                <span className="kc-cap">
                  <TargetIcon size={12} /> {m.penaltyHomeScore}–{m.penaltyAwayScore} on penalties
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" className="kc-btn sec" onClick={() => onWatchMatch(m.id)}>
                <EyeIcon /> Watch
              </button>
              {canScore && (
                <button type="button" className="kc-btn pri" onClick={() => onEnterMatch(m.id)}>
                  Open live scorer
                </button>
              )}
            </div>
          </div>
        ))}

      {tournamentStarted &&
        sections.map(([groupName, groupMatches]) => (
          <section key={groupName}>
            <div className="kc-sechd">
              <h2 className="kc-h2">{groupName === KNOCKOUT ? "Knockouts" : `Group ${groupName}`}</h2>
              {groupName === KNOCKOUT && onOpenKnockouts ? (
                <button type="button" className="kc-link" onClick={onOpenKnockouts}>
                  Bracket
                </button>
              ) : (
                <span className="kc-cap">
                  {groupMatches.length} {groupMatches.length === 1 ? "match" : "matches"}
                </span>
              )}
            </div>
            <div className="kc-matches stagger">
              {groupMatches.map((m, i) => {
                const act = actionOf(m);
                const done = m.status === "Completed" || m.status === "Abandoned";
                const Tag = act.open ? "button" : "div";
                return (
                  <Tag
                    key={m.id}
                    type={act.open ? "button" : undefined}
                    className={`kc-match${act.open ? " pressable" : ""}`}
                    style={{ "--i": i, cursor: act.open ? "pointer" : "default" }}
                    onClick={act.open}
                    aria-label={act.open ? `${matchLabel(m)}: ${m.homeTeamName} v ${m.awayTeamName}` : undefined}
                  >
                    <span className="lab">
                      <span>{matchLabel(m)}</span>
                      <span className={done ? "res" : undefined}>{statusWords(m, isCricket)}</span>
                    </span>
                    <Sides m={m} isCricket={isCricket} />
                    {isCricket && m.resultSummary && <span className="won">{m.resultSummary}</span>}
                    {!isCricket && m.penaltyHomeScore != null && (
                      <span className="won">
                        <TargetIcon size={12} /> {m.penaltyHomeScore}–{m.penaltyAwayScore} on penalties
                      </span>
                    )}
                    {!done && act.note && <span className="kc-cap" style={{ marginTop: 2 }}>{act.note}</span>}
                    {!canScore && !done && m.status === "NotStarted" && <span className="kc-cap" style={{ marginTop: 2 }}>Match preview</span>}
                  </Tag>
                );
              })}
            </div>
          </section>
        ))}

      {tournamentStarted && !loading && matches.length === 0 && <p className="kc-sub">No matches yet.</p>}
    </div>
  );
}
