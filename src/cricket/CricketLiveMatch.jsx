import { useEffect, useRef, useState } from "react";
import { font, cricketTheme as theme } from "../theme";
import {
  getCricketMatch,
  startInnings,
  recordBall,
  undoBall,
  setBatter,
  setBowler,
  replacePlayer,
  endInnings,
  reduceOvers,
  enforceFollowOn,
  startSuperOver,
  completeCricketMatch,
} from "../api/cricketApi";
import CricketScorecard from "./CricketScorecard";
import Bump from "../Bump";
import Modal from "../Modal";
import ErrorBanner from "../ErrorBanner";
import { BackIcon, OutIcon, UndoIcon } from "../ui/icons";
import ScoringBanner from "../ScoringBanner";
import { ScoringControls } from "../ScoringControls";
import { claimScoring } from "../api/scoringApi";
import { LIVE_POLL_MS, useLive } from "../realtime/useLive";

// The scoring console.
//
// Every call answers with the whole match state — including what is legal next — so this screen
// never decides a rule. It draws whatever the engine says is possible: which batters may come in,
// which bowlers may take the next over, which dismissals are on, whether the innings can be
// declared. If a button is missing, the engine said so.

// The phone's surfaces (2026-11-26): content on panes, the pad on glass; in light, open sections.
const panel = {
  background: theme.cream,
  borderRadius: 22,
  padding: "16px 20px",
  marginBottom: 14,
};

const lightPanel = panel;

const button = (background, color) => ({
  background,
  color,
  border: "1px solid transparent",
  borderRadius: 22,
  minHeight: 44,
  padding: "0 18px",
  fontWeight: "var(--w-strong)",
  fontSize: 15,
  cursor: "pointer",
});

const ghostButton = {
  background: "var(--glass)",
  color: theme.ink,
  border: "1px solid var(--glass-line)",
  borderRadius: 22,
  minHeight: 44,
  padding: "0 18px",
  fontSize: 15,
  fontWeight: 500,
  cursor: "pointer",
};

const select = {
  minHeight: 44,
  padding: "0 12px",
  borderRadius: 14,
  border: "1px solid var(--field-line)",
  fontSize: 15,
  background: "var(--field)",
  color: theme.ink,
  minWidth: 180,
};

/**
 * Duckworth-Lewis-Stern, live. During the chase the par score moves with every ball and every
 * wicket, so everyone can see who would win if rain stopped play now. Colour is never the only
 * cue: the words "ahead", "behind" and "level" carry it too.
 */
function DlsPanel({ dls, chasing }) {
  const ahead = dls.runsAheadOfPar;
  const status = ahead == null ? null
    : ahead > 0 ? { text: `Ahead by ${ahead}`, color: "var(--success-ink)" }
    : ahead < 0 ? { text: `Behind by ${-ahead}`, color: "var(--danger-ink)" }
    : { text: "Level with par", color: theme.onDark };

  return (
    <div style={{ ...panel, padding: "0.8rem 1rem" }} aria-live="polite">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: theme.accent }}>
          DLS · {dls.edition}
        </span>
        {dls.target != null && (
          <span className="num" style={{ fontSize: 14 }}>
            Target <strong>{dls.target}</strong>{dls.targetRevised && <span style={{ color: theme.accent }}> (revised)</span>}
          </span>
        )}
      </div>

      {chasing && dls.parScore != null ? (
        <div className="num" style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, color: theme.onDarkMuted }}>
            Par now <strong style={{ fontFamily: font.display, fontSize: 26, color: theme.onDark }}>{dls.parScore}</strong>
          </span>
          <strong style={{ fontSize: 16, color: status.color }}>{status.text}</strong>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: theme.onDarkMuted, margin: "6px 0 0" }}>
          If rain takes overs, use "Reduce overs" and the chase target is revised automatically.
        </p>
      )}

      {chasing && dls.team2ResourcesRemaining != null && (
        <p className="num" style={{ fontSize: 12, color: theme.onDarkMuted, margin: "6px 0 0" }}>
          Resources: {dls.team1Resources}% batting first · {dls.team2Resources}% for the chase, {dls.team2ResourcesRemaining}% still to use
        </p>
      )}
      {chasing && !dls.resultPossibleNow && (
        <p style={{ fontSize: 12, color: theme.onDarkMuted, margin: "4px 0 0" }}>
          A rain result needs {dls.minimumOversForResult} over{dls.minimumOversForResult === 1 ? "" : "s"} of the chase; before that it's no result.
        </p>
      )}
      {dls.interruptions.map((x, i) => (
        <p key={i} className="num" style={{ fontSize: 12, color: theme.onDarkMuted, margin: "4px 0 0" }}>
          {x.battingTeamName}: cut from {x.oversBefore} to {x.oversAfter} overs at {x.atOvers}
        </p>
      ))}
    </div>
  );
}

/** Rain: how many overs the innings in play now has. */
function ReduceOversDialog({ live, busy, isDls, onCancel, onConfirm }) {
  const [overs, setOvers] = useState(Math.max(1, (live.oversLimit ?? 2) - 1));
  const valid = overs >= 1 && overs < live.oversLimit;

  return (
    <Modal labelledBy="reduce-title" onClose={onCancel} panelStyle={{ ...lightPanel, marginBottom: 0 }}>
      <h4 id="reduce-title" style={{ fontFamily: font.display, fontSize: 18, margin: "0 0 6px" }}>Reduce overs</h4>
      <p style={{ fontSize: 14, color: theme.muted, margin: "0 0 12px", lineHeight: 1.5 }}>
        {live.battingTeamName} are {live.overs} overs into a {live.oversLimit}-over innings.
        {isDls && live.inningsNumber === 2 && " The target will be revised by DLS."}
        {isDls && live.inningsNumber === 1 && " DLS will account for the lost overs when the chase target is set."}
      </p>
      <label style={{ fontSize: 13, color: theme.muted, display: "flex", flexDirection: "column", gap: 4 }}>
        New total overs for this innings
        <input
          type="number"
          min={1}
          max={live.oversLimit - 1}
          value={overs}
          onChange={(e) => setOvers(Number(e.target.value))}
          style={{ ...select, minWidth: 0 }}
        />
      </label>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button onClick={() => onConfirm(overs)} disabled={busy || !valid} style={button(theme.accent, theme.accentInk)}>
          Reduce to {overs} over{overs === 1 ? "" : "s"}
        </button>
        <button onClick={onCancel} style={{ ...button("transparent", theme.ink), border: "1px solid var(--line)" }}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

/**
 * A player picked by mistake: who was recorded, then who it really was. A batter's whole stay in
 * this innings moves across; for the bowler, only this over. The engine says who may be chosen.
 */
function ReplacePlayerDialog({ actions, busy, onCancel, onConfirm }) {
  const wrongOnes = [
    ...actions.replaceableBatters.map((p) => ({ ...p, bowler: false })),
    ...(actions.replaceableBowler ? [{ ...actions.replaceableBowler, bowler: true }] : []),
  ];
  const [wrongId, setWrongId] = useState(wrongOnes.length === 1 ? String(wrongOnes[0].playerId) : "");
  const [rightId, setRightId] = useState("");
  const wrong = wrongOnes.find((p) => String(p.playerId) === wrongId);
  const choices = !wrong ? [] : wrong.bowler ? actions.bowlerReplacements : actions.batterReplacements;
  const right = choices.find((p) => String(p.playerId) === rightId);

  return (
    <Modal labelledBy="replace-title" onClose={onCancel} panelStyle={{ ...lightPanel, marginBottom: 0 }}>
      <h4 id="replace-title" style={{ fontFamily: font.display, fontSize: 18, margin: "0 0 6px" }}>Correct a player</h4>
      <p style={{ fontSize: 14, color: theme.muted, margin: "0 0 12px", lineHeight: 1.5 }}>
        Picked the wrong name? Nothing that happened changes — only who it's credited to.
      </p>
      <label style={{ fontSize: 13, color: theme.muted, display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
        Recorded by mistake
        <select
          value={wrongId}
          onChange={(e) => {
            setWrongId(e.target.value);
            setRightId("");
          }}
          style={{ ...select, minWidth: 0 }}
        >
          <option value="">Choose…</option>
          {wrongOnes.map((p) => (
            <option key={p.playerId} value={p.playerId}>
              {p.playerName} ({p.bowler ? "bowling this over" : "batting"})
            </option>
          ))}
        </select>
      </label>
      {wrong && (
        <>
          <label style={{ fontSize: 13, color: theme.muted, display: "flex", flexDirection: "column", gap: 4 }}>
            It was really
            <select value={rightId} onChange={(e) => setRightId(e.target.value)} disabled={choices.length === 0} style={{ ...select, minWidth: 0 }}>
              <option value="">{choices.length === 0 ? (wrong.bowler ? "Nobody else may bowl this over" : "Everyone else has batted") : "Choose…"}</option>
              {choices.map((p) => (
                <option key={p.playerId} value={p.playerId}>{p.playerName}</option>
              ))}
            </select>
          </label>
          <p style={{ fontSize: 13, color: theme.muted, margin: "8px 0 0", lineHeight: 1.5 }}>
            {wrong.bowler
              ? "This over moves to the player you choose. Earlier overs stay with whoever bowled them."
              : `${wrong.playerName}'s whole innings so far moves to the player you choose.`}
          </p>
        </>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button onClick={() => onConfirm(wrong.playerId, right.playerId)} disabled={busy || !wrong || !right} style={button(theme.accent, theme.accentInk)}>
          {right ? `Make it ${right.playerName}` : "Correct"}
        </button>
        <button onClick={onCancel} style={{ ...button("transparent", theme.ink), border: "1px solid var(--line)" }}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

/** A chip in the over strip: the ball as a scorer would write it. */
/** One ball of "This over": a run in a ring, a four or six in the accent's ring, a wicket in red, an extra as a pill. */
function BallChip({ ball }) {
  const kind = ball.isWicket ? " w" : ball.isBoundary ? " four" : ball.isExtra ? " extra" : "";
  return (
    <span className={`kc-ball${kind}${ball.isFreeHit ? " fh" : ""}`} title={ball.isFreeHit ? "Free hit" : undefined}>
      {ball.display}
    </span>
  );
}

const strikeRate = (b) => (b.ballsFaced > 0 ? ((b.runs * 100) / b.ballsFaced).toFixed(1) : "—");

/** "2.3" overs at 19 runs: 7.60 an over. */
function economy(bowler, ballsPerOver = 6) {
  const [o, b = "0"] = String(bowler.overs).split(".");
  const balls = Number(o) * ballsPerOver + Number(b);
  return balls > 0 ? ((bowler.runs * ballsPerOver) / balls).toFixed(2) : "—";
}

/** The batters in and this over's bowler, as the phone's board shows them. */
function Crease({ live, ballsPerOver }) {
  const batters = [live.striker && { ...live.striker, on: true }, live.nonStriker].filter(Boolean);
  return (
    <div style={{ ...panel, padding: "6px 20px 10px" }}>
      <table className="kc-st num kc-bt">
        <thead>
          <tr>
            <th className="l">Batting</th>
            <th>Runs</th>
            <th>Balls</th>
            <th className="kc-x">4s</th>
            <th className="kc-x">6s</th>
            <th>SR</th>
          </tr>
        </thead>
        <tbody>
          {batters.map((b) => (
            <tr key={b.playerId ?? b.playerName}>
              <td className="l">
                <b style={{ fontWeight: "var(--w-strong)" }}>{b.playerName}</b>
                {b.on && <span style={{ color: "var(--deep)", fontSize: 13, marginLeft: 6 }}>on strike</span>}
              </td>
              <td>{b.runs}</td>
              <td>{b.ballsFaced}</td>
              <td className="kc-x">{b.fours}</td>
              <td className="kc-x">{b.sixes}</td>
              <td>{strikeRate(b)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {live.bowler && (
        <table className="kc-st num kc-bt" style={{ marginTop: 4 }}>
          <thead>
            <tr>
              <th className="l">Bowling</th>
              <th>O</th>
              <th className="kc-x">M</th>
              <th>R</th>
              <th>W</th>
              <th>Econ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="l"><b style={{ fontWeight: "var(--w-strong)" }}>{live.bowler.playerName}</b></td>
              <td>{live.bowler.overs}</td>
              <td className="kc-x">{live.bowler.maidens}</td>
              <td>{live.bowler.runs}</td>
              <td>{live.bowler.wickets}</td>
              <td>{economy(live.bowler, ballsPerOver)}</td>
            </tr>
          </tbody>
        </table>
      )}
      {live.partnershipBalls > 0 && (
        <div className="kc-cap" style={{ padding: "12px 0 4px" }}>
          Partnership {live.partnershipRuns} ({live.partnershipBalls} {live.partnershipBalls === 1 ? "ball" : "balls"})
        </div>
      )}
    </div>
  );
}

/**
 * Who comes in, or who bowls next — the same shape of question, so the same little form. For the
 * next batter, `strike` adds who faces the next ball: pre-set to the end the engine left empty,
 * which the scorer can overrule (it replaces asking whether the batters crossed).
 */
function PickPlayer({ title, players, onPick, busy, cta, animate = false, strike, retiredHurtIds = [], onEndInnings }) {
  // Opt-in: a new batter (after a wicket) is rare enough to mark; the next bowler comes every over.
  const enter = animate ? "drop-in" : undefined;
  const [playerId, setPlayerId] = useState("");
  const [newOnStrike, setNewOnStrike] = useState(strike?.newOnStrike ?? true);
  const newName = players.find((p) => String(p.playerId) === playerId)?.playerName ?? "New batter";

  if (players.length === 0) {
    return (
      <div className={enter} style={lightPanel}>
        <h4 style={{ fontFamily: font.display, fontSize: 16, margin: "0 0 8px" }}>{title}</h4>
        <p style={{ fontSize: 14, color: theme.muted, margin: 0 }}>Nobody is available.</p>
      </div>
    );
  }

  return (
    <div className={enter} style={lightPanel}>
      <h4 style={{ fontFamily: font.display, fontSize: 16, margin: "0 0 10px" }}>{title}</h4>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select aria-label={title} style={select} value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
          <option value="">Choose…</option>
          {players.map((p) => (
            <option key={p.playerId} value={p.playerId}>
              {p.playerName}{p.isCaptain ? " (c)" : ""}{p.isWicketKeeper ? " (wk)" : ""}
              {retiredHurtIds.includes(p.playerId) ? " · retired hurt, can come back" : ""}
            </option>
          ))}
        </select>
        <button
          onClick={() => playerId && onPick(Number(playerId), strike ? newOnStrike : undefined)}
          disabled={!playerId || busy}
          style={{ ...button(theme.accent, theme.accentInk), opacity: playerId && !busy ? 1 : 0.5 }}
        >
          {cta}
        </button>
      </div>

      {strike && (
        <div style={{ marginTop: 12 }}>
          <div id="strike-label" style={{ fontSize: 12, color: theme.muted, marginBottom: 6 }}>Faces the next ball</div>
          <div role="radiogroup" aria-labelledby="strike-label" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[[true, newName], [false, strike.survivorName]].map(([value, label]) => (
              <button
                key={String(value)}
                type="button"
                role="radio"
                aria-checked={newOnStrike === value}
                onClick={() => setNewOnStrike(value)}
                style={{
                  ...button(newOnStrike === value ? theme.accent : "transparent", newOnStrike === value ? theme.accentInk : theme.ink),
                  border: newOnStrike === value ? "none" : "1.5px solid var(--line)",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {onEndInnings && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 13, color: theme.muted, margin: "0 0 6px" }}>
            Only batters who retired hurt are left. If none of them can come back, nobody is left to bat and the innings is over.
          </p>
          <button type="button" onClick={onEndInnings} disabled={busy} style={{ ...button("transparent", theme.ink), border: "1.5px solid var(--line)" }}>
            Nobody can come back: end the innings
          </button>
        </div>
      )}
    </div>
  );
}

/** Openers and the first over's bowler, asked once at the top of every innings. */
function StartInningsForm({ state, onStart, busy }) {
  const batting = state.squad.filter(
    (p) => p.teamId === state.actions.nextBattingTeamId && p.squadStatus === "Playing"
  );
  const bowling = state.squad.filter(
    (p) => p.teamId === state.actions.nextBowlingTeamId && p.squadStatus === "Playing"
  );

  const [striker, setStriker] = useState("");
  const [nonStriker, setNonStriker] = useState("");
  const [bowler, setBowlerId] = useState("");

  const battingTeam = state.squad.find((p) => p.teamId === state.actions.nextBattingTeamId);
  const teamName = state.actions.nextBattingTeamId === state.homeTeamId ? state.homeTeamName : state.awayTeamName;
  const ready = striker && nonStriker && bowler && striker !== nonStriker;

  return (
    <div className="drop-in" style={lightPanel}>
      <h4 style={{ fontFamily: font.display, fontSize: 16, margin: "0 0 4px" }}>
        {teamName} to bat
      </h4>
      <p style={{ fontSize: 12, color: theme.muted, marginTop: 0 }}>
        {state.status === "SuperOver"
          ? "One over, two wickets."
          : "Send the openers out and mark the bowler taking the first over."}
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <select aria-label="Striker" style={select} value={striker} onChange={(e) => setStriker(e.target.value)}>
          <option value="">Striker…</option>
          {batting.filter((p) => String(p.playerId) !== nonStriker).map((p) => (
            <option key={p.playerId} value={p.playerId}>{p.playerName}</option>
          ))}
        </select>
        <select aria-label="Non-striker" style={select} value={nonStriker} onChange={(e) => setNonStriker(e.target.value)}>
          <option value="">Non-striker…</option>
          {batting.filter((p) => String(p.playerId) !== striker).map((p) => (
            <option key={p.playerId} value={p.playerId}>{p.playerName}</option>
          ))}
        </select>
        <select aria-label="Opening bowler" style={select} value={bowler} onChange={(e) => setBowlerId(e.target.value)}>
          <option value="">Opening bowler…</option>
          {bowling.map((p) => (
            <option key={p.playerId} value={p.playerId}>{p.playerName}</option>
          ))}
        </select>
      </div>

      <button
        onClick={() => onStart({ strikerId: Number(striker), nonStrikerId: Number(nonStriker), bowlerId: Number(bowler) })}
        disabled={!ready || busy || !battingTeam}
        style={{ ...button(theme.accent, theme.accentInk), opacity: ready && !busy ? 1 : 0.5 }}
      >
        🏏 Start the innings
      </button>
    </div>
  );
}

/** The wicket dialog: only the dismissals the engine says are on right now. */
// Where runs may come from in this match: the bat always, byes and leg byes if the rules allow them.
// Read after "The runs came from" (the user's wording, 2026-11-26).
const FROM_LABEL = { Bat: "Bat", Byes: "Byes", LegByes: "Leg byes" };
const runSources = (rules) =>
  ["Bat", "Byes", "LegByes"].filter((f) => f === "Bat" || (f === "Byes" ? rules.byesAllowed : rules.legByesAllowed));

// The names a scorer says ("Caught and bowled", not "CaughtAndBowled").
const DISMISSAL_LABEL = {
  Bowled: "Bowled", Caught: "Caught", CaughtAndBowled: "Caught and bowled", LBW: "LBW", RunOut: "Run out",
  Stumped: "Stumped", HitWicket: "Hit wicket", RetiredHurt: "Retired hurt", RetiredOut: "Retired out",
  ObstructingTheField: "Obstructing the field", HitBallTwice: "Hit the ball twice", TimedOut: "Timed out",
};
const dismissalLabel = (d) => DISMISSAL_LABEL[d] ?? d.replace(/([a-z])([A-Z])/g, "$1 $2");

// The engine's list for this kind of ball: off a wide or a no-ball fewer ways out are possible.
const dismissalsFor = (actions, wide, noBall) =>
  wide ? actions.possibleDismissalsOffWide ?? actions.possibleDismissals
    : noBall ? actions.possibleDismissalsOffNoBall ?? actions.possibleDismissals
      : actions.possibleDismissals;

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// What a key records with the current toggles: "3 wides", "nb + 2lb", "2 byes". Empty for a plain run.
function keyCaption(n, { wide, noBall, from, widePenalty }) {
  if (wide) return n === 6 ? "can’t be hit" : plural(widePenalty + n, "wide", "wides");
  if (noBall) {
    if (n === 0) return "nb only";
    return from === "Byes" ? `nb + ${n}b` : from === "LegByes" ? `nb + ${n}lb` : `nb + ${n}`;
  }
  if (from === "Byes") return n === 0 ? "" : plural(n, "bye", "byes");
  if (from === "LegByes") return n === 0 ? "" : plural(n, "leg bye", "leg byes");
  return "";
}

// "The runs came from: Bat / Byes / Leg byes" - nothing to ask on a wide or when only the bat counts.
function RunsFromChoice({ rules, wide, value, onChange }) {
  const sources = runSources(rules);
  if (wide || sources.length < 2) return null;
  return (
    <div role="radiogroup" aria-label="The runs came from" style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, color: theme.muted, marginRight: 4 }}>The runs came from</span>
      {sources.map((f) => (
        <button
          key={f}
          type="button"
          role="radio"
          aria-checked={value === f}
          onClick={() => onChange(f)}
          style={{
            ...button(value === f ? theme.accent : "transparent", value === f ? theme.accentInk : theme.ink),
            border: value === f ? "none" : "1.5px solid var(--line)",
            padding: "0.4rem 0.7rem",
            fontSize: 12,
          }}
        >
          {FROM_LABEL[f]}
        </button>
      ))}
    </div>
  );
}

// 7+: more runs off one ball than the keys hold (overthrows). On a wide they're all wides.
function MoreRunsDialog({ state, wide, noBall, from: startFrom, busy, onCancel, onConfirm }) {
  const live = state.current;
  const rules = state.rules;
  const [runs, setRuns] = useState(7);
  const [from, setFrom] = useState(wide ? "Bat" : startFrom);
  const penalty = wide ? rules.widePenaltyRuns : noBall ? rules.noBallPenaltyRuns : 0;
  const striker = live.striker?.playerName ?? "the batter";
  const says = wide
    ? `${runs + penalty} wides. Every run on a wide is a wide.`
    : from === "Bat"
      ? `${striker} gets ${runs}${noBall ? `, plus ${penalty} no ball` : ""}. Overthrows off the bat are the batter’s.`
      : `Nothing to ${striker}: ${runs} ${from === "Byes" ? "byes" : "leg byes"}${noBall ? `, plus ${penalty} no ball` : ""}.`;
  const valid = Number.isInteger(runs) && runs >= 1 && runs <= 15;
  return (
    <Modal labelledBy="more-runs-title" onClose={onCancel} panelStyle={{ ...lightPanel, marginBottom: 0 }}>
      <h4 id="more-runs-title" style={{ fontFamily: font.display, fontSize: 18, margin: "0 0 4px" }}>More runs</h4>
      <p style={{ fontSize: 13, color: theme.muted, margin: "0 0 12px" }}>
        {live.bowler?.playerName ?? "Bowler"} to {striker} · {wide ? "a wide" : noBall ? "a no ball" : "a legal ball"}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={{ fontSize: 12, color: theme.muted, display: "flex", flexDirection: "column", gap: 4 }}>
          Runs off this ball (run, and overthrows)
          <input type="number" min="1" max="15" value={runs} onChange={(e) => setRuns(Number(e.target.value))} style={{ ...select, minWidth: 0 }} />
        </label>
        <RunsFromChoice rules={rules} wide={wide} value={from} onChange={setFrom} />
        <p style={{ fontSize: 12, color: theme.muted, margin: 0 }}>{says}</p>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button onClick={() => onConfirm(runs, from)} disabled={busy || !valid} style={button(theme.accent, theme.accentInk)}>
          Record {runs} ({live.runs + (valid ? runs : 0) + penalty}/{live.wickets})
        </button>
        <button onClick={onCancel} style={{ ...button("transparent", theme.ink), border: "1px solid var(--line)" }}>Cancel</button>
      </div>
    </Modal>
  );
}

function WicketDialog({ state, wide, noBall, from: padFrom, onCancel, onConfirm, busy }) {
  const live = state.current;
  const dismissals = dismissalsFor(state.actions, wide, noBall);
  const [type, setType] = useState(dismissals[0] ?? "Bowled");
  const [from, setFrom] = useState(wide ? "Bat" : padFrom);
  const [dismissed, setDismissed] = useState(String(live.striker?.playerId ?? ""));
  const [fielder, setFielder] = useState("");
  // Run-outs: a direct hit involves one fielder; otherwise the thrower is credited and the
  // fielder who took the throw is recorded for the scorecard only.
  const [directHit, setDirectHit] = useState(true);
  const [receiver, setReceiver] = useState("");
  const [runs, setRuns] = useState(0);

  const fielders = state.squad.filter((p) => p.teamId === live.bowlingTeamId && p.squadStatus === "Playing");
  const needsFielder = ["Caught", "RunOut", "Stumped"].includes(type);
  const isRunOut = type === "RunOut";
  const twoFielders = isRunOut && !directHit;
  // Caught, bowled, LBW, stumped… only ever the batter facing. Mirrors DismissalRules.CanDismissNonStriker.
  const eitherEnd = ["RunOut", "ObstructingTheField", "RetiredHurt", "RetiredOut", "TimedOut"].includes(type);
  const outId = eitherEnd ? dismissed : String(live.striker?.playerId ?? "");
  // A batter retires while the ball is dead (Law 25.4), so by default nothing is bowled; the scorer
  // may write it onto the ball it happened on instead.
  const retiring = type === "RetiredHurt" || type === "RetiredOut";
  const [onTheBall, setOnTheBall] = useState(false);
  // Timed out is always between balls (the server decides; the new batter never faced).
  const timedOut = type === "TimedOut";
  const betweenBalls = timedOut || (retiring && !onTheBall);

  return (
    <Modal labelledBy="wicket-title" onClose={onCancel} panelStyle={{ ...lightPanel, marginBottom: 0 }}>
        <h4 id="wicket-title" style={{ fontFamily: font.display, fontSize: 18, margin: wide || noBall ? "0 0 4px" : "0 0 12px" }}>Wicket</h4>
        {(wide || noBall) && (
          <p style={{ fontSize: 13, color: theme.muted, margin: "0 0 12px" }}>Off a {wide ? "wide" : "no ball"} · only these are possible</p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <select aria-label="How out" style={select} value={type} onChange={(e) => setType(e.target.value)}>
            {dismissals.map((d) => (
              <option key={d} value={d}>{dismissalLabel(d)}</option>
            ))}
          </select>

          {eitherEnd ? (
            <select aria-label="Batter out" style={select} value={dismissed} onChange={(e) => setDismissed(e.target.value)}>
              {[live.striker, live.nonStriker].filter(Boolean).map((b) => (
                <option key={b.playerId} value={b.playerId}>{b.playerName}{b.onStrike ? " (striker)" : " (non-striker)"}</option>
              ))}
            </select>
          ) : live.striker && (
            <div style={{ fontSize: 14 }}>
              Out: <strong>{live.striker.playerName}</strong> <span style={{ color: theme.muted }}>(striker)</span>
            </div>
          )}

          {isRunOut && (
            <div role="radiogroup" aria-label="How the run-out happened" style={{ display: "flex", gap: 6 }}>
              {[[true, "Direct hit"], [false, "Two fielders"]].map(([value, label]) => (
                <button
                  key={label}
                  type="button"
                  role="radio"
                  aria-checked={directHit === value}
                  onClick={() => { setDirectHit(value); if (value) setReceiver(""); }}
                  style={{
                    ...button(directHit === value ? theme.accent : "transparent", directHit === value ? theme.accentInk : theme.ink),
                    border: directHit === value ? "none" : "1.5px solid var(--line)",
                    flex: 1,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {needsFielder && (
            <select
              aria-label={isRunOut ? (directHit ? "Fielder who hit the stumps" : "Fielder who threw the ball") : "Fielder"}
              style={select}
              value={fielder}
              onChange={(e) => setFielder(e.target.value)}
            >
              <option value="">{isRunOut ? (directHit ? "Who hit the stumps…" : "Who threw it…") : "Fielder…"}</option>
              {fielders.map((p) => (
                <option key={p.playerId} value={p.playerId}>
                  {p.playerName}{p.isWicketKeeper ? " (wk)" : ""}
                </option>
              ))}
            </select>
          )}

          {twoFielders && (
            <>
              <select aria-label="Fielder who received the throw" style={select} value={receiver} onChange={(e) => setReceiver(e.target.value)}>
                <option value="">Who took the throw…</option>
                {fielders.filter((p) => String(p.playerId) !== fielder).map((p) => (
                  <option key={p.playerId} value={p.playerId}>
                    {p.playerName}{p.isWicketKeeper ? " (wk)" : ""}
                  </option>
                ))}
              </select>
              <p style={{ fontSize: 12, color: theme.muted, margin: 0 }}>
                The thrower is credited with the run-out; the receiver is named on the scorecard only.
              </p>
            </>
          )}

          {/* One switch, "Counts as a ball", off by default (the user's choice, 2026-11-26; it was a two-way question). */}
          {retiring && (
            <label className="kc-switch">
              <span>
                <b>Counts as a ball</b>
                <small>
                  {onTheBall
                    ? "On: recorded on this ball, for the bowler and the batter, with any runs off it."
                    : "Off: nothing is bowled, no ball for the bowler or the batter, and the over carries on."}
                </small>
              </span>
              <input type="checkbox" role="switch" checked={onTheBall} onChange={(e) => setOnTheBall(e.target.checked)} />
            </label>
          )}

          {timedOut && (
            <p style={{ fontSize: 12, color: theme.muted, margin: 0 }}>
              The new batter wasn’t ready in time. Nothing is bowled, and the bowler doesn’t get the wicket.
            </p>
          )}

          {!betweenBalls && (
            <label style={{ fontSize: 12, color: theme.muted, display: "flex", flexDirection: "column", gap: 4 }}>
              {retiring ? "Runs off this ball" : wide ? "Runs completed before the wicket (all wides)" : "Runs completed before the wicket"}
              <input
                type="number"
                min="0"
                value={runs}
                onChange={(e) => setRuns(Number(e.target.value))}
                style={{ ...select, minWidth: 0 }}
              />
            </label>
          )}
          {!betweenBalls && runs > 0 && <RunsFromChoice rules={state.rules} wide={wide} value={from} onChange={setFrom} />}

        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button
            onClick={() => onConfirm({
              wicketType: type,
              dismissedPlayerId: Number(outId),
              fielderId: fielder ? Number(fielder) : null,
              isDirectHit: isRunOut && directHit,
              runOutReceiverId: twoFielders && receiver ? Number(receiver) : null,
              runsOffBat: betweenBalls ? 0 : runs,
              runsFrom: from,
              ...(retiring || timedOut ? { countsAsBall: !betweenBalls } : {}),
            })}
            disabled={busy || !outId}
            // Red is for wickets; retiring hurt costs none.
            style={type === "RetiredHurt" ? button(theme.accent, theme.accentInk) : button(theme.dangerSolid, "#fff")}
          >
            {type === "RetiredHurt" ? "Confirm retirement" : "Confirm wicket"}
          </button>
          <button onClick={onCancel} style={{ ...button("transparent", theme.ink), border: "1px solid var(--line)" }}>
            Cancel
          </button>
        </div>
    </Modal>
  );
}

export default function CricketLiveMatch({ matchId, onBack, onCompleted, onWatch }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("console"); // console | scorecard
  const [wide, setWide] = useState(false);
  const [noBall, setNoBall] = useState(false);
  const [attribution, setAttribution] = useState("Bat"); // Bat | Byes | LegByes
  const [showWicket, setShowWicket] = useState(false);
  const [showMoreRuns, setShowMoreRuns] = useState(false);
  const [showReduce, setShowReduce] = useState(false);
  const [showReplace, setShowReplace] = useState(false);

  const acting = useRef(false);

  // Every scoring call answers with the state that replaces this. Besides that, the screen re-reads
  // the match when the live line says it changed, and every 5 seconds without the line (every
  // minute with it) while the tab is visible: another phone may be scoring it, or asking this one
  // to hand scoring over.
  const reread = useRef(null);
  const lineOpen = useLive({ kind: "match", sport: "cricket", matchId }, () => reread.current?.());
  useEffect(() => {
    let cancelled = false;
    const load = async (first) => {
      if (!first && (document.hidden || acting.current)) return;
      try {
        // Opening the scoring screen takes the match if nobody is scoring it, before the first read.
        if (first) await claimScoring("cricket", matchId);
        const data = await getCricketMatch(matchId);
        if (!cancelled && !acting.current) setState(data);
      } catch (e) {
        if (!cancelled && first) setError(e.message);
      }
    };
    load(true);
    reread.current = () => load(false);
    return () => { cancelled = true; reread.current = null; };
  }, [matchId]);
  useEffect(() => {
    const timer = setInterval(() => reread.current?.(), lineOpen ? LIVE_POLL_MS : 5000);
    return () => clearInterval(timer);
  }, [lineOpen]);

  /** Runs an engine call, keeps the returned state, and surfaces a refusal as it was worded. */
  const act = async (fn) => {
    setError("");
    setBusy(true);
    acting.current = true;
    try {
      const next = await fn();
      if (next) setState(next);
      setWide(false);
      setNoBall(false);
      setAttribution("Bat");
    } catch (e) {
      setError(e.message);
    } finally {
      acting.current = false;
      setBusy(false);
    }
  };

  // A knockout match can't end without a side going through: one that can't be finished is awarded.
  const awardTo = (teamId, name) =>
    confirm(`Award ${state.roundLabel ?? "this match"} to ${name}? They go through.`) &&
    act(() => completeCricketMatch(matchId, { awardWinnerTeamId: teamId }));

  // The delivery the toggles describe, with the runs attributed where the scorer said.
  const buildBall = (runs, extra = {}, from = attribution) => {
    const base = {
      runsOffBat: 0, isWide: wide, isNoBall: noBall,
      wideExtraRuns: 0, byes: 0, legByes: 0, penaltyRuns: 0,
      ...extra,
    };

    if (wide) return { ...base, wideExtraRuns: runs };
    if (from === "Byes") return { ...base, byes: runs };
    if (from === "LegByes") return { ...base, legByes: runs };
    return { ...base, runsOffBat: (extra.runsOffBat ?? 0) + runs };
  };

  if (error && !state) {
    return (
      <div>
        <ErrorBanner message={error} />
        <button type="button" onClick={onBack} className="kc-btn sec">← Back to matches</button>
      </div>
    );
  }

  if (!state) return <p className="kc-cap">Loading match…</p>;

  const live = state.current;
  const actions = state.actions;
  const finished = state.status === "Completed" || state.status === "Abandoned";
  // Someone else is scoring (or the tournament is closed): the console is for following, not scoring.
  const locked = !finished && !!state.scoring && !state.scoring.canScore;
  // After a wicket, the batter still in — the one the new batter may or may not take strike from.
  const survivor = live?.striker ?? live?.nonStriker ?? null;

  const ordinal = (n) => ["1st", "2nd", "3rd", "4th"][n - 1] ?? `${n}th`;
  const earlier = state.innings.filter((i) => i.status === "Completed");
  const byesOk = state.rules.byesAllowed;
  const legByesOk = state.rules.legByesAllowed;
  const from = (f) => setAttribution(attribution === f ? "Bat" : f);

  return (
    <div className="kc-live">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <button type="button" onClick={onBack} className="kc-ib kc-glass" aria-label="Back to matches" title="Back to matches">
            <BackIcon />
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 20, lineHeight: "25px", fontWeight: "var(--w-bold)" }}>
              {state.homeTeamName} v {state.awayTeamName}
            </div>
            <div className="kc-cap">{[state.roundLabel, state.tossSummary].filter(Boolean).join(" · ")}</div>
          </div>
        </div>
        <div className="kc-seg" role="tablist" aria-label="Scoring or scorecard">
          {["console", "scorecard"].map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
              {t === "console" ? "Scoring" : "Scorecard"}
            </button>
          ))}
        </div>
      </div>

      <ErrorBanner message={error} />
      <ScoringBanner sport="cricket" matchId={matchId} scoring={state.scoring} onChange={(scoring) => setState((s) => ({ ...s, scoring }))} onWatch={onWatch} />

      {tab === "scorecard" ? (
        <CricketScorecard matchId={matchId} refreshKey={state.innings.reduce((n, i) => n + i.runs + i.wickets, 0)} />
      ) : (
        <div className="kc-grid2 kc-livegrid">
          {/* --- The scoreboard --------------------------------------- */}
          <section className="kc-col" aria-label="Scoreboard">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {live ? (
                <span className="kc-status">
                  <span className="kc-dot" aria-hidden="true" /> Live, {live.battingTeamName} batting
                </span>
              ) : (
                <span className="kc-status quiet">{state.innings.length === 0 ? "Yet to start" : state.status === "InningsBreak" ? "Innings break" : state.status}</span>
              )}
              {live && <span className="kc-cap">{ordinal(live.inningsNumber)} innings{live.oversLimit ? `, ${live.oversLimit} overs` : ""}</span>}
            </div>

            {live ? (
              <>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginTop: 10 }}>
                  <div className="kc-score num">
                    {/* Runs tick every ball, so they don't animate; a wicket is rare enough to mark. */}
                    {live.runs}<span className="kc-slash">/</span><Bump value={live.wickets} />
                  </div>
                  <div style={{ textAlign: "right", paddingBottom: 12 }}>
                    <div className="kc-figure num" style={{ fontSize: 30, lineHeight: "34px" }}>{live.overs}</div>
                    <div className="kc-cap">
                      {live.oversLimit ? `of ${live.oversLimit} overs · ` : "overs · "}rate {live.runRate.toFixed(2)}
                    </div>
                  </div>
                </div>
                {live.target != null && (
                  <div className="kc-need">
                    <b style={{ fontWeight: "var(--w-strong)" }}>Need {live.runsRequired} off {live.ballsRemaining}</b>
                    {live.requiredRunRate != null && <span style={{ opacity: 0.85 }}>Required {live.requiredRunRate.toFixed(2)}</span>}
                  </div>
                )}
                {live.freeHitPending && (
                  <div className="pop-in kc-need" style={{ marginLeft: live.target != null ? 8 : 0 }}>
                    <b style={{ fontWeight: "var(--w-strong)" }}>Free hit</b>
                  </div>
                )}
                {earlier.length > 0 && (
                  <div className="kc-cap" style={{ marginTop: 12 }}>
                    {earlier.map((i) => `${i.battingTeamName} ${i.scoreLine}`).join(" · ")}
                  </div>
                )}
              </>
            ) : (
              <div style={{ margin: "10px 0 6px" }}>
                {earlier.map((i) => (
                  <div key={i.inningsId ?? i.battingTeamName} className="kc-side-line" style={{ fontSize: 20, lineHeight: "30px" }}>
                    <b>{i.battingTeamName}</b>
                    <span className="fig">{i.scoreLine}</span>
                  </div>
                ))}
                {state.tossSummary && state.innings.length === 0 && <p className="kc-sub">{state.tossSummary}.</p>}
              </div>
            )}

            {state.resultSummary && (
              <div style={{ marginTop: 10, fontSize: 18, lineHeight: "24px", color: "var(--deep)", fontWeight: "var(--w-strong)" }}>{state.resultSummary}</div>
            )}

            {state.dls && <div style={{ marginTop: 16 }}><DlsPanel dls={state.dls} chasing={live?.inningsNumber === 2} /></div>}

            {live && <div style={{ marginTop: 20 }}><Crease live={live} ballsPerOver={state.rules.ballsPerOver ?? 6} /></div>}

            {live && (
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 15 }}>This over</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {live.thisOver.length === 0 ? <span className="kc-cap">Nothing bowled yet</span> : live.thisOver.map((b) => <BallChip key={b.sequenceNumber} ball={b} />)}
                </div>
                <span className="kc-grow" />
                {live.thisOver.length > 0 && <span className="kc-cap">{live.thisOver.reduce((n, b) => n + b.runs, 0)} runs</span>}
              </div>
            )}

            {/* --- Ending things --------------------------------------- */}
            <ScoringControls locked={locked}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 22 }}>
                {actions.canDeclare && (
                  <button onClick={() => act(() => endInnings(matchId, "Declared"))} disabled={busy} style={ghostButton}>
                    Declare
                  </button>
                )}
                {actions.canReduceOvers && (
                  <button onClick={() => setShowReduce(true)} disabled={busy} style={ghostButton}>
                    Reduce overs (rain)
                  </button>
                )}
                {actions.canRecordBall && (actions.replaceableBatters?.length > 0 || actions.replaceableBowler) && (
                  <button onClick={() => setShowReplace(true)} disabled={busy} style={ghostButton}>
                    Correct a player
                  </button>
                )}
                {actions.canRecordBall && (
                  <button onClick={() => act(() => recordBall(matchId, buildBall(0, { penaltyRuns: 5 })))} disabled={busy} style={ghostButton}>
                    +5 penalty runs
                  </button>
                )}
                {actions.canEndInnings && (
                  <button
                    onClick={() => confirm(
                      state.dls && live?.inningsNumber === 2
                        ? `Stop play for good? The match will be decided on the DLS par score (${state.dls.parScore ?? "not yet set"}).`
                        : "End this innings?"
                    ) && act(() => endInnings(matchId, "Abandoned"))}
                    disabled={busy}
                    style={ghostButton}
                  >
                    End innings
                  </button>
                )}
                {actions.canComplete && (
                  <>
                    <button
                      onClick={() => confirm("Sign the match off as it stands?") && act(() => completeCricketMatch(matchId, { force: true }))}
                      disabled={busy}
                      style={ghostButton}
                    >
                      Sign off
                    </button>
                    {actions.canRecordNoResult !== false ? (
                      <button
                        onClick={() => confirm("Record this match as abandoned with no result?") && act(() => completeCricketMatch(matchId, { noResult: true }))}
                        disabled={busy}
                        style={ghostButton}
                      >
                        No result
                      </button>
                    ) : (
                      <>
                        <button onClick={() => awardTo(state.homeTeamId, state.homeTeamName)} disabled={busy} style={ghostButton}>
                          Award to {state.homeTeamName}
                        </button>
                        <button onClick={() => awardTo(state.awayTeamId, state.awayTeamName)} disabled={busy} style={ghostButton}>
                          Award to {state.awayTeamName}
                        </button>
                      </>
                    )}
                  </>
                )}
                {finished && (
                  <button onClick={onCompleted} className="kc-btn pri" style={{ marginLeft: "auto" }}>
                    Done
                  </button>
                )}
              </div>
            </ScoringControls>
          </section>

          {/* --- The questions between balls, and the pad ---------------- */}
          <section className="kc-aside kc-padcol" aria-label="Score this ball">
            <ScoringControls locked={locked}>
              {actions.canStartInnings && (
                <StartInningsForm state={state} busy={busy} onStart={(payload) => act(() => startInnings(matchId, payload))} />
              )}

              {actions.canEnforceFollowOn && (
                <div className="drop-in" style={lightPanel}>
                  <h4 style={{ fontSize: 17, margin: "0 0 6px", fontWeight: "var(--w-strong)" }}>Follow-on available</h4>
                  <p className="kc-cap" style={{ marginTop: 0 }}>The lead is enough to make the other side bat again straight away.</p>
                  <button onClick={() => act(() => enforceFollowOn(matchId))} disabled={busy} className="kc-btn pri">
                    Enforce the follow-on
                  </button>
                </div>
              )}

              {actions.canStartSuperOver && state.innings.every((i) => i.status === "Completed") && !actions.canStartInnings && (
                <div className="drop-in" style={lightPanel}>
                  <button onClick={() => act(() => startSuperOver(matchId))} disabled={busy} className="kc-btn pri">
                    Set up a super over
                  </button>
                </div>
              )}

              {/* --- Who is in ------------------------------------------- */}
              {actions.needsBatter && (
                <PickPlayer
                  title="Next batter in"
                  animate
                  players={actions.availableBatters}
                  retiredHurtIds={actions.retiredHurtBatterIds ?? []}
                  busy={busy}
                  cta="Send them out"
                  strike={survivor ? { survivorName: survivor.playerName, newOnStrike: !live.striker } : undefined}
                  onPick={(playerId, onStrike) => act(() => setBatter(matchId, playerId, onStrike))}
                  onEndInnings={actions.canEndInningsNoBatters
                    ? () => confirm(`Nobody who retired hurt can come back, so ${live.battingTeamName} are all out for ${live.runs}. End the innings?`)
                        && act(() => endInnings(matchId, "AllOut"))
                    : undefined}
                />
              )}

              {actions.needsBowler && !actions.needsBatter && (
                <PickPlayer title="Next over" players={actions.availableBowlers} busy={busy} cta="Bring them on" onPick={(playerId) => act(() => setBowler(matchId, playerId))} />
              )}

              {/* --- The pad: the phone's keys ----------------------------- */}
              {actions.canRecordBall && (
                <div className="kc-pad">
                  <div className="kc-mods">
                    <button type="button" role="switch" aria-checked={wide} className="kc-pill" onClick={() => { setWide(!wide); setNoBall(false); setAttribution("Bat"); }}>Wide</button>
                    <button type="button" role="switch" aria-checked={noBall} className="kc-pill" onClick={() => { setNoBall(!noBall); setWide(false); }}>No ball</button>
                    {/* As the phone (keypad B): on a wide every run is a wide; on a no ball the row below asks instead. */}
                    {byesOk && !wide && !noBall && (
                      <button type="button" role="switch" aria-checked={attribution === "Byes"} className="kc-pill" onClick={() => from("Byes")}>Byes</button>
                    )}
                    {legByesOk && !wide && !noBall && (
                      <button type="button" role="switch" aria-checked={attribution === "LegByes"} className="kc-pill" onClick={() => from("LegByes")}>Leg byes</button>
                    )}
                  </div>
                  {/* On a no ball: where the runs came from (only the bat's are the batter's). */}
                  {noBall && runSources(state.rules).length > 1 && (
                    <div className="kc-from" role="radiogroup" aria-label="The runs came from">
                      <span>The runs came from</span>
                      <div>
                        {runSources(state.rules).map((f) => (
                          <button key={f} type="button" role="radio" aria-checked={attribution === f} className="kc-pill" onClick={() => setAttribution(f)}>
                            {FROM_LABEL[f]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="kc-keys num">
                    {[0, 1, 2, 3, 4, 6, 5].map((runs) => {
                      // A no-ball hit for four is still a four; byes to the rope and wides aren't boundaries.
                      const boundary = (runs === 4 || runs === 6) && !wide && attribution === "Bat";
                      const impossible = wide && runs === 6; // a wide can't be hit
                      const caption = keyCaption(runs, { wide, noBall, from: attribution, widePenalty: state.rules.widePenaltyRuns })
                        || (runs === 0 ? "Dot" : boundary ? (runs === 4 ? "Four" : "Six") : "");
                      return (
                        <button
                          key={runs}
                          type="button"
                          className={`kc-key${boundary ? " b" : ""}${boundary && runs === 6 ? " six" : ""}`}
                          onClick={() => act(() => recordBall(matchId, buildBall(runs)))}
                          disabled={busy || impossible}
                          aria-label={caption ? `${runs}, ${caption}` : `${runs}`}
                        >
                          {runs}
                          {caption && <small>{caption}</small>}
                        </button>
                      );
                    })}
                    <button type="button" className="kc-key" onClick={() => setShowMoreRuns(true)} disabled={busy} aria-label="More than 6 runs" style={{ fontSize: 24 }}>
                      7+<small>More runs</small>
                    </button>
                  </div>
                  <div className="kc-padfoot">
                    <button type="button" className="kc-btn sec kc-undo" onClick={() => act(() => undoBall(matchId))} disabled={busy || !actions.canUndo}>
                      <UndoIcon /> Undo
                    </button>
                    <button type="button" className="kc-btn danger" onClick={() => setShowWicket(true)} disabled={busy}>
                      <OutIcon /> Out / Wicket
                    </button>
                  </div>
                </div>
              )}
            </ScoringControls>
          </section>
        </div>
      )}

      {showReduce && live && (
        <ReduceOversDialog
          live={live}
          busy={busy}
          isDls={!!state.dls}
          onCancel={() => setShowReduce(false)}
          onConfirm={(overs) => {
            setShowReduce(false);
            return act(() => reduceOvers(matchId, overs));
          }}
        />
      )}

      {showReplace && live && !locked && (
        <ReplacePlayerDialog
          actions={actions}
          busy={busy}
          onCancel={() => setShowReplace(false)}
          onConfirm={(playerId, replacementId) => {
            setShowReplace(false);
            return act(() => replacePlayer(matchId, playerId, replacementId));
          }}
        />
      )}

      {showMoreRuns && live && (
        <MoreRunsDialog
          state={state}
          wide={wide}
          noBall={noBall}
          from={attribution}
          busy={busy}
          onCancel={() => setShowMoreRuns(false)}
          onConfirm={(runs, from) => {
            setShowMoreRuns(false);
            return act(() => recordBall(matchId, buildBall(runs, {}, from)));
          }}
        />
      )}

      {showWicket && live && (
        <WicketDialog
          state={state}
          wide={wide}
          noBall={noBall}
          from={attribution}
          busy={busy}
          onCancel={() => setShowWicket(false)}
          onConfirm={(wicket) => {
            setShowWicket(false);
            const { runsOffBat, runsFrom, ...rest } = wicket;
            // Between balls nothing was bowled, so the wide / no-ball / byes choice doesn't apply to it.
            const body = wicket.countsAsBall === false
              ? { runsOffBat: 0, isWide: false, isNoBall: false, wideExtraRuns: 0, byes: 0, legByes: 0, penaltyRuns: 0, ...rest }
              : buildBall(runsOffBat, rest, runsFrom);
            return act(() => recordBall(matchId, body));
          }}
        />
      )}
    </div>
  );
}
