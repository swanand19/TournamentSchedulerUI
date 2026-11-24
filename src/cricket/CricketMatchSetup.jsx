import { useEffect, useMemo, useRef, useState } from "react";
import { font, cricketTheme as theme } from "../theme";
import { getCricketMatch, getSetupOptions, setupCricketMatch } from "../api/cricketApi";
import { claimScoring } from "../api/scoringApi";
import ScoringBanner from "../ScoringBanner";
import ErrorBanner from "../ErrorBanner";
import Modal from "../Modal";

// Everything a scorer sets before the first ball: the format, the toss, and the two XIs. The
// format arrives as a preset and stays editable — the presets exist so the common case is two taps,
// not so that a league that plays eight-ball overs is locked out.
// Two steps, as on the phone (2026-11-24): 1 teams and rules, 2 the toss. Nothing is sent until
// Start match; Back keeps everything. The toss happens on the field — this only records it, and
// "Flip a coin" is a stand-in coin that decides nothing.

/** The preset chip standing for "whatever the previous match in this tournament was played to". */
const LAST_FORMAT = "__last__";

const card = {
  background: theme.cream,
  color: theme.ink,
  borderRadius: 12,
  padding: "1.1rem 1.2rem",
  marginBottom: 16,
};

const input = {
  padding: "0.4rem 0.6rem",
  borderRadius: 6,
  border: "1.5px solid #d8d4c8",
  fontSize: 14,
  background: "#fff",
  color: theme.ink,
};

const sectionTitle = {
  fontFamily: font.display,
  fontSize: 16,
  letterSpacing: "0.04em",
  margin: "0 0 12px",
};

function Field({ label, children, width = 130 }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: theme.muted, width }}>
      {label}
      {children}
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/** One side's XI: who plays, who leads, who keeps, and in what order they bat. */
function SquadPicker({ team, selection, onChange, playersPerSide }) {
  const playing = Object.values(selection).filter((s) => s.playing);
  const captains = playing.filter((s) => s.captain).length;
  const keepers = playing.filter((s) => s.keeper).length;

  const set = (playerId, patch) => onChange({ ...selection, [playerId]: { ...selection[playerId], ...patch } });

  // Exactly one of each, so picking a new captain stands the old one down.
  const setSole = (playerId, field) => {
    const next = {};
    for (const [id, value] of Object.entries(selection)) {
      next[id] = { ...value, [field]: Number(id) === playerId };
    }
    next[playerId] = { ...next[playerId], playing: true };
    onChange(next);
  };

  // Ticking someone in keeps any armband or gloves already marked on them — that is how the team's
  // usual captain arrives pre-selected. Leaving them out takes both away.
  const setPlaying = (playerId, playing) =>
    set(playerId, playing ? { playing } : { playing, captain: false, keeper: false });

  // Captain and keeper marks survive, so "select all" on a side with a usual captain is one tap
  // from ready.
  const setAll = (playing) => {
    const next = {};
    for (const [id, value] of Object.entries(selection)) {
      next[id] = playing ? { ...value, playing } : { ...value, playing, captain: false, keeper: false };
    }
    onChange(next);
  };

  // The whole XI from last time — who played, who led, who kept, and the order they batted in.
  const copyLastSquad = () => {
    const last = new Map(team.lastSquad.players.map((p) => [p.playerId, p]));
    const next = {};
    for (const p of team.players) {
      const was = last.get(p.id);
      next[p.id] = {
        playing: !!was?.playing,
        captain: !!(was?.playing && was.isCaptain),
        keeper: !!(was?.playing && was.isWicketKeeper),
        order: was?.battingOrder ?? "",
      };
    }
    onChange(next);
  };

  const countStyle = (ok) => ({ color: ok ? theme.successInk : "#a33", fontWeight: 700 });
  const smallButton = {
    background: "transparent",
    border: "1px solid #ccc",
    borderRadius: 6,
    padding: "0.25rem 0.6rem",
    fontSize: 11,
    cursor: "pointer",
    color: theme.ink,
  };
  const allSelected = team.players.length > 0 && team.players.every((p) => selection[p.id]?.playing);

  return (
    <div style={{ ...card, marginBottom: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <h4 style={{ ...sectionTitle, margin: 0 }}>{team.name.toUpperCase()}</h4>
        <span style={{ fontSize: 11, color: theme.muted }}>
          <span style={countStyle(playing.length === playersPerSide)}>{playing.length}/{playersPerSide}</span>
          {" · "}
          <span style={countStyle(captains === 1)}>{captains} captain</span>
          {" · "}
          <span style={countStyle(keepers === 1)}>{keepers} keeper</span>
        </span>
      </div>

      {team.players.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          <button type="button" onClick={() => setAll(!allSelected)} style={smallButton}>
            {allSelected ? "Clear all" : "Select all"}
          </button>
          {team.lastSquad && (
            <button
              type="button"
              onClick={copyLastSquad}
              title={`The XI ${team.name} fielded in match ${team.lastSquad.matchNumber}`}
              style={{ ...smallButton, borderColor: theme.deep, color: theme.deep, fontWeight: 600 }}
            >
              ↺ Same XI as last match (M{String(team.lastSquad.matchNumber).padStart(2, "0")} v {team.lastSquad.opponent})
            </button>
          )}
        </div>
      )}

      {team.players.length === 0 && (
        <p style={{ fontSize: 12, color: theme.muted }}>
          No players in this squad yet — add them under Manage Teams first.
        </p>
      )}

      {team.players.map((p) => {
        const s = selection[p.id] ?? {};
        // The server already words the role and the bowling style; nothing to re-derive here.
        const description = [p.cricket?.roleLabel, p.cricket?.bowlingStyleLabel].filter(Boolean).join(" · ");

        return (
          <div
            key={p.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0.35rem 0.5rem",
              borderRadius: 6,
              marginBottom: 4,
              background: s.playing ? "#EDEAE0" : "transparent",
            }}
          >
            <input
              type="checkbox"
              checked={!!s.playing}
              onChange={(e) => setPlaying(p.id, e.target.checked)}
            />
            <span style={{ flex: 1, fontSize: 14 }}>
              {p.jerseyNumber != null && <strong>#{p.jerseyNumber} </strong>}
              {p.name}
              {description && (
                <span style={{ color: theme.muted, fontSize: 11 }}> · {description}</span>
              )}
            </span>

            <button
              type="button"
              onClick={() => setSole(p.id, "captain")}
              title="Captain"
              style={{
                width: 28, height: 26, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
                border: `1px solid ${s.captain ? theme.deep : "#ccc"}`,
                background: s.captain ? theme.deep : "transparent",
                color: s.captain ? theme.cream : theme.muted,
              }}
            >
              C
            </button>
            <button
              type="button"
              onClick={() => setSole(p.id, "keeper")}
              title="Wicket-keeper"
              style={{
                width: 34, height: 26, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
                border: `1px solid ${s.keeper ? theme.deep : "#ccc"}`,
                background: s.keeper ? theme.deep : "transparent",
                color: s.keeper ? theme.cream : theme.muted,
              }}
            >
              WK
            </button>
            <input
              type="number"
              min="1"
              value={s.order ?? ""}
              onChange={(e) => set(p.id, { order: e.target.value })}
              placeholder="#"
              title="Batting order"
              aria-label={`Batting order for ${p.name}`}
              style={{ ...input, width: 52 }}
            />
          </div>
        );
      })}
    </div>
  );
}

const choice = (on) => ({
  flex: 1,
  minHeight: 72,
  borderRadius: 12,
  padding: "0.8rem 1rem",
  textAlign: "left",
  cursor: "pointer",
  border: `1.5px solid ${on ? theme.deep : "#d8d4c8"}`,
  background: on ? theme.deep : "transparent",
  color: on ? theme.cream : theme.ink,
});

/** "Teams and rules · Toss": where the scorer is. */
function Steps({ step }) {
  return (
    <div aria-label={`Step ${step} of 2`} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      {["Teams and rules", "Toss"].map((label, i) => {
        const reached = i + 1 <= step;
        return (
          <div key={label} style={{ flex: 1 }}>
            <div style={{ height: 4, borderRadius: 2, background: reached ? theme.accent : theme.borderOnDark }} />
            <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6, color: reached ? theme.onDark : theme.onDarkMuted }}>
              {i + 1 < step ? "✓" : i + 1} {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** A stand-in coin for when nobody has one: it flips and lands; the scorer still records who won. */
function FlipCoin({ onClose }) {
  const [side, setSide] = useState(null); // "heads" | "tails"
  const [round, setRound] = useState(0);
  const [landed, setLanded] = useState(false);
  const flip = () => {
    setLanded(false);
    setSide(Math.random() < 0.5 ? "heads" : "tails");
    setRound((r) => r + 1);
  };
  return (
    <Modal labelledBy="flip-title" onClose={onClose} panelStyle={{ ...card, marginBottom: 0, maxWidth: 380 }}>
      <h4 id="flip-title" style={{ ...sectionTitle, margin: "0 0 4px" }}>FLIP A COIN</h4>
      <p style={{ fontSize: 13, color: theme.muted, margin: 0 }}>For when nobody has one. Let the captains call first.</p>
      <div className="coin-stage" aria-hidden="true">
        <div key={round} className={`coin-spin ${side ?? ""}`} onAnimationEnd={() => setLanded(true)}>
          <div className="coin"><b>H</b><small>HEADS</small></div>
          <div className="coin tails"><b>T</b><small>TAILS</small></div>
        </div>
      </div>
      <div aria-live="polite" style={{ textAlign: "center", minHeight: 52 }}>
        {side && (landed || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) && (
          <>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{side === "heads" ? "Heads" : "Tails"}</div>
            <div style={{ fontSize: 13, color: theme.muted }}>Whoever called {side} won the toss.</div>
          </>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={flip} style={{ ...choice(false), minHeight: 0, textAlign: "center", fontWeight: 600 }}>{side ? "Flip again" : "Flip"}</button>
        <button onClick={onClose} style={{ ...choice(true), minHeight: 0, textAlign: "center", fontWeight: 600 }}>Done</button>
      </div>
    </Modal>
  );
}

export default function CricketMatchSetup({ matchId, onBack, onSetUp }) {
  const [options, setOptions] = useState(null);
  const [rules, setRules] = useState(null);
  const [preset, setPreset] = useState("T20");
  const [tossWinnerTeamId, setTossWinnerTeamId] = useState(null);
  const [tossDecision, setTossDecision] = useState(null);
  const [step, setStep] = useState(1);
  const [flipping, setFlipping] = useState(false);
  const [squads, setSquads] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [scoring, setScoring] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Opening setup takes the match if nobody has it; the answer says who does.
        const claimed = await claimScoring("cricket", matchId);
        if (!cancelled) setScoring(claimed);
        const data = await getSetupOptions(matchId);
        if (cancelled) return;
        setOptions(data);

        // Start from the format the tournament has already been playing, if any match has been set
        // up; otherwise from a T20.
        if (data.lastFormat) {
          setPreset(LAST_FORMAT);
          setRules(data.lastFormat.rules);
        } else {
          const t20 = data.presets.find((p) => p.name === "T20") ?? data.presets[0];
          setPreset(t20?.name ?? "");
          setRules(t20?.rules ?? null);
        }

        // The batting-order hint each player set on their profile becomes the starting order, and
        // the team's usual captain is pre-selected — both are only defaults.
        const initial = {};
        for (const team of data.teams) {
          initial[team.id] = {};
          for (const p of team.players) {
            initial[team.id][p.id] = {
              playing: false,
              captain: team.defaultCaptainPlayerId === p.id,
              keeper: false,
              order: p.cricket?.battingOrderPreference ?? "",
            };
          }
        }
        setSquads(initial);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [matchId]);

  // Every 30 s while the tab is visible: keeps the holder "seen" while they pick the XIs, follows a
  // handover, and moves anyone else on to the live match once it is set up.
  const setUp = useRef(onSetUp);
  useEffect(() => {
    setUp.current = onSetUp;
  });
  useEffect(() => {
    const timer = setInterval(async () => {
      if (document.hidden) return;
      try {
        const state = await getCricketMatch(matchId);
        if (state.isSetUp) setUp.current();
        else setScoring(state.scoring);
      } catch {
        // The next look tries again.
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [matchId]);

  const applyPreset = (name) => {
    if (name === LAST_FORMAT) {
      setPreset(LAST_FORMAT);
      setRules(options.lastFormat.rules);
      return;
    }
    const chosen = options.presets.find((p) => p.name === name);
    if (!chosen) return;
    setPreset(name);
    setRules(chosen.rules);
  };

  // The previous match's format sits first among the presets, so going back to it is one tap.
  const presetChoices = [
    ...(options?.lastFormat
      ? [{ name: LAST_FORMAT, label: `Same as M${String(options.lastFormat.matchNumber).padStart(2, "0")}` }]
      : []),
    ...(options?.presets ?? []).map((p) => ({ name: p.name, label: p.name })),
  ];

  const setRule = (field, value) => setRules((r) => ({ ...r, [field]: value }));
  const numberRule = (field) => (e) =>
    setRule(field, e.target.value === "" ? null : Number(e.target.value));

  const ready = useMemo(() => {
    if (!options || !rules) return false;
    return options.teams.every((team) => {
      const side = Object.values(squads[team.id] ?? {});
      const playing = side.filter((s) => s.playing);
      return playing.length === rules.playersPerSide
        && playing.filter((s) => s.captain).length === 1
        && playing.filter((s) => s.keeper).length === 1;
    });
  }, [options, rules, squads]);

  const handleSubmit = async () => {
    setError("");
    setSaving(true);
    try {
      const squad = [];
      for (const team of options.teams) {
        for (const [playerId, s] of Object.entries(squads[team.id] ?? {})) {
          if (!s.playing && !s.order) continue;
          squad.push({
            playerId: Number(playerId),
            teamId: team.id,
            squadStatus: s.playing ? "Playing" : "Bench",
            isCaptain: !!s.captain,
            isWicketKeeper: !!s.keeper,
            battingOrder: s.order ? Number(s.order) : null,
          });
        }
      }

      await setupCricketMatch(matchId, { rules, tossWinnerTeamId, tossDecision, squad });
      onSetUp();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (error && !options) {
    return <p style={{ color: theme.danger }}>{error}</p>;
  }

  if (!options || !rules) {
    return <p style={{ color: theme.onDarkMuted }}>Loading match setup…</p>;
  }

  // Someone else is setting it up: the banner says who (Ask to score / Take over), not a form for nothing.
  const locked = !!scoring && !scoring.canScore;

  const tossWinnerName = tossWinnerTeamId === options.homeTeamId ? options.homeTeamName : options.awayTeamName;
  const tossLoser = tossWinnerTeamId === options.homeTeamId ? options.awayTeamName : options.homeTeamName;
  const tossReady = !!tossWinnerTeamId && !!tossDecision;
  const captainOf = (team) => {
    const id = Object.entries(squads[team.id] ?? {}).find(([, s]) => s.playing && s.captain)?.[0];
    return team.players.find((p) => String(p.id) === id)?.name ?? null;
  };
  const pillButton = (on, enabled) => ({
    width: "100%",
    background: on ? theme.accent : "rgba(232,176,58,0.3)",
    color: theme.accentInk,
    border: "none",
    borderRadius: 10,
    padding: "0.9rem",
    fontWeight: 400,
    fontSize: 16,
    fontFamily: font.display,
    letterSpacing: "0.04em",
    cursor: enabled ? "pointer" : "not-allowed",
  });
  const battingFirst = tossDecision === "Bat"
    ? (tossWinnerTeamId === options.homeTeamId ? options.homeTeamName : options.awayTeamName)
    : tossLoser;

  return (
    <div style={{ color: theme.onDark, fontFamily: font.body }}>
      <button
        onClick={onBack}
        style={{ background: theme.surfaceOnDark, color: theme.onDark, border: `1px solid ${theme.borderOnDark}`, borderRadius: 8, padding: "0.5rem 1rem", fontSize: 14, cursor: "pointer", marginBottom: 16 }}
      >
        ← Back to matches
      </button>

      <h2 style={{ fontFamily: font.display, fontSize: 24, margin: "0 0 4px" }}>
        {options.homeTeamName.toUpperCase()} v {options.awayTeamName.toUpperCase()}
      </h2>
      <p style={{ color: theme.onDarkMuted, fontSize: 14, marginTop: 0, marginBottom: 18 }}>
        {step === 1 ? "Set the format and pick both XIs. The toss comes next." : "Record the toss, then start the match."}
      </p>

      <ErrorBanner message={error} />
      <ScoringBanner sport="cricket" matchId={matchId} scoring={scoring} onChange={setScoring} />

      {!locked && <Steps step={step} />}

      {!locked && step === 2 && (<>
      {/* --- Toss --------------------------------------------------- */}
      <div style={card}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div className="coin" aria-hidden="true"><b>H</b></div>
          <p style={{ fontSize: 13, color: theme.muted, margin: 0, textAlign: "center" }}>Toss the coin on the field as usual, then record what happened.</p>
          <button onClick={() => setFlipping(true)} style={{ background: "none", border: "none", color: theme.deep, fontWeight: 600, fontSize: 14, cursor: "pointer", padding: "0.4rem" }}>
            No coin? Flip one here
          </button>
        </div>

        <h4 id="toss-won" style={sectionTitle}>WHO WON THE TOSS?</h4>
        <div role="radiogroup" aria-labelledby="toss-won" style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {[...options.teams].sort((x) => (x.id === options.homeTeamId ? -1 : 1)).map((team) => {
            const on = tossWinnerTeamId === team.id;
            const captain = captainOf(team);
            return (
              <button key={team.id} role="radio" aria-checked={on} onClick={() => setTossWinnerTeamId(team.id)} style={choice(on)}>
                <div style={{ fontFamily: font.display, fontSize: 18 }}>{team.name.toUpperCase()}{on ? " ✓" : ""}</div>
                {captain && <div style={{ fontSize: 12, opacity: 0.8 }}>Captain {captain}</div>}
              </button>
            );
          })}
        </div>

        <h4 id="toss-chose" style={{ ...sectionTitle, opacity: tossWinnerTeamId ? 1 : 0.45 }}>ELECTED TO</h4>
        <div role="radiogroup" aria-labelledby="toss-chose" style={{ display: "flex", gap: 10, opacity: tossWinnerTeamId ? 1 : 0.45 }}>
          {[["Bat", "Bat first"], ["Bowl", "Bowl first"]].map(([value, label]) => (
            <button
              key={value}
              role="radio"
              aria-checked={tossDecision === value}
              disabled={!tossWinnerTeamId}
              onClick={() => setTossDecision(value)}
              style={{ ...choice(tossDecision === value), minHeight: 0, textAlign: "center", fontWeight: 600, cursor: tossWinnerTeamId ? "pointer" : "not-allowed" }}
            >
              {label}
            </button>
          ))}
        </div>

        {tossReady && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontFamily: font.display, fontSize: 22 }}>{battingFirst.toUpperCase()} BAT FIRST</div>
            <div style={{ fontSize: 13, color: theme.muted }}>{tossWinnerName} won the toss and chose to {tossDecision === "Bat" ? "bat" : "bowl"}.</div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={() => setStep(1)}
          style={{ background: theme.surfaceOnDark, color: theme.onDark, border: `1px solid ${theme.borderOnDark}`, borderRadius: 10, padding: "0.9rem 1.4rem", fontSize: 15, cursor: "pointer" }}
        >
          ← Back
        </button>
        <button onClick={handleSubmit} disabled={!tossReady || saving} style={{ ...pillButton(tossReady, tossReady && !saving), flex: 1 }}>
          {saving ? "SAVING…" : "🏏 START MATCH"}
        </button>
      </div>
      {!tossReady && (
        <p style={{ color: theme.onDarkMuted, fontSize: 12, textAlign: "center", marginTop: 8 }}>
          {tossWinnerTeamId ? "Choose to bat or bowl first." : "Record who won the toss to start."}
        </p>
      )}
      {flipping && <FlipCoin onClose={() => setFlipping(false)} />}
      </>)}

      {!locked && step === 1 && (<>
      {/* --- Format ------------------------------------------------- */}
      <div style={card}>
        <h4 style={sectionTitle}>FORMAT</h4>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {presetChoices.map((p) => (
            <button
              key={p.name}
              onClick={() => applyPreset(p.name)}
              style={{
                borderRadius: 20,
                padding: "0.35rem 0.9rem",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                border: `1.5px solid ${preset === p.name ? theme.deep : "#d8d4c8"}`,
                background: preset === p.name ? theme.deep : "transparent",
                color: preset === p.name ? theme.cream : theme.ink,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
          <Field label="Overs per innings" width={120}>
            <input type="number" min="1" style={input} value={rules.oversPerInnings ?? ""} onChange={numberRule("oversPerInnings")} />
          </Field>
          <Field label="Balls per over" width={110}>
            <input type="number" min="1" style={input} value={rules.ballsPerOver} onChange={numberRule("ballsPerOver")} />
          </Field>
          <Field label="Max overs / bowler" width={130}>
            <input type="number" min="1" style={input} value={rules.maxOversPerBowler ?? ""} onChange={numberRule("maxOversPerBowler")} />
          </Field>
          <Field label="Players per side" width={120}>
            <input type="number" min="2" style={input} value={rules.playersPerSide} onChange={numberRule("playersPerSide")} />
          </Field>
          <Field label="Innings per side" width={120}>
            <select style={input} value={rules.inningsPerSide} onChange={numberRule("inningsPerSide")}>
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </Field>
          <Field label="Powerplay overs" width={140}>
            <input style={input} placeholder="1-6,16-20" value={rules.powerplayOvers ?? ""} onChange={(e) => setRule("powerplayOvers", e.target.value || null)} />
          </Field>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
          <Field label="Wide penalty" width={100}>
            <input type="number" min="0" style={input} value={rules.widePenaltyRuns} onChange={numberRule("widePenaltyRuns")} />
          </Field>
          <Field label="No-ball penalty" width={110}>
            <input type="number" min="0" style={input} value={rules.noBallPenaltyRuns} onChange={numberRule("noBallPenaltyRuns")} />
          </Field>
          <Field label="Tie resolution" width={150}>
            <select style={input} value={options.isKnockout && rules.tieResolution === "AllowTie" ? "SuperOver" : rules.tieResolution} onChange={(e) => setRule("tieResolution", e.target.value)}>
              <option value="SuperOver">Super over</option>
              {!options.isKnockout && <option value="AllowTie">Allow a tie</option>}
              <option value="BoundaryCount">Boundary count</option>
              <option value="Bowlout">Bowl-out</option>
            </select>
          </Field>
          <Field label="Ball" width={110}>
            <select style={input} value={rules.ballType} onChange={(e) => setRule("ballType", e.target.value)}>
              <option value="Leather">Leather</option>
              <option value="Tennis">Tennis</option>
              <option value="Tape">Tape</option>
              <option value="Other">Other</option>
            </select>
          </Field>
          <Field label="Pitch" width={110}>
            <select style={input} value={rules.pitchType} onChange={(e) => setRule("pitchType", e.target.value)}>
              <option value="Turf">Turf</option>
              <option value="Matting">Matting</option>
              <option value="Astroturf">Astroturf</option>
              <option value="Concrete">Concrete</option>
              <option value="Other">Other</option>
            </select>
          </Field>
          {rules.inningsPerSide > 1 && (
            <Field label="Follow-on margin" width={130}>
              <input type="number" min="1" style={input} value={rules.followOnMargin ?? ""} onChange={numberRule("followOnMargin")} />
            </Field>
          )}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, rowGap: 8 }}>
          <Toggle label="LBW" checked={rules.lbwEnabled} onChange={(v) => setRule("lbwEnabled", v)} />
          <Toggle label="Byes" checked={rules.byesAllowed} onChange={(v) => setRule("byesAllowed", v)} />
          <Toggle label="Leg byes" checked={rules.legByesAllowed} onChange={(v) => setRule("legByesAllowed", v)} />
          <Toggle label="Penalty runs" checked={rules.penaltyRunsAllowed} onChange={(v) => setRule("penaltyRunsAllowed", v)} />
          <Toggle label="Free hit after a no-ball" checked={rules.freeHitAfterNoBall} onChange={(v) => setRule("freeHitAfterNoBall", v)} />
          <Toggle label="Free hit after a wide" checked={rules.freeHitAfterWide} onChange={(v) => setRule("freeHitAfterWide", v)} />
          <Toggle label="Last man stands" checked={rules.lastManStanding} onChange={(v) => setRule("lastManStanding", v)} />
          {!options.isKnockout && <Toggle label="Draw allowed" checked={rules.drawAllowed} onChange={(v) => setRule("drawAllowed", v)} />}
          <Toggle label="DLS for rain (up to 50 overs, one innings each)" checked={rules.dlsEnabled} onChange={(v) => setRule("dlsEnabled", v)} />
        </div>
      </div>

      {/* --- The XIs ------------------------------------------------ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))", gap: 16, marginBottom: 16 }}>
        {options.teams.map((team) => (
          <SquadPicker
            key={team.id}
            team={team}
            selection={squads[team.id] ?? {}}
            onChange={(next) => setSquads((s) => ({ ...s, [team.id]: next }))}
            playersPerSide={rules.playersPerSide}
          />
        ))}
      </div>

      <button
        onClick={() => {
          setStep(2);
          window.scrollTo({ top: 0 });
        }}
        disabled={!ready}
        style={pillButton(ready, ready)}
      >
        NEXT: THE TOSS →
      </button>
      {!ready && (
        <p style={{ color: theme.onDarkMuted, fontSize: 12, textAlign: "center", marginTop: 8 }}>
          Each side needs exactly {rules.playersPerSide} players, one captain and one wicket-keeper.
        </p>
      )}
      </>)}
    </div>
  );
}
