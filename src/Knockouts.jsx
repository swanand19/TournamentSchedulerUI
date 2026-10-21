import { useCallback, useEffect, useRef, useState } from "react";
import {
  addKnockoutMatch, applyKnockoutPreset, clearKnockout, deleteKnockoutMatch, getKnockout, getKnockoutPresets,
  setKnockoutTeam, updateKnockoutMatch,
} from "./api/knockoutApi";
import ErrorBanner from "./ErrorBanner";
import { TrophyIcon } from "./icons";
import { font, themeFor } from "./theme";

// The knockout stage. Everyone sees the bracket: each side's team, or where it comes from ("Group A
// winner", "Winner of Semi-final 1") until that's known. Owners shape it — a format that fits the
// groups, or one match at a time — and can put a team in a side by hand (a coin toss, a result
// settled off the field). The server fills the sides in as results arrive; this screen only draws them.

const ROUNDS = [
  { value: "QuarterFinal", label: "Quarter-final" },
  { value: "SemiFinal", label: "Semi-final" },
  { value: "Final", label: "Final" },
  { value: "ThirdPlace", label: "3rd-place match" },
  { value: "Qualifier", label: "Qualifier" },
  { value: "Eliminator", label: "Eliminator" },
  { value: "RoundOf16", label: "Round of 16" },
  { value: "Other", label: "Other" },
];

const SLOT_KINDS = [
  { value: "Team", label: "A team" },
  { value: "GroupPlace", label: "A place in a group" },
  { value: "WinnerOf", label: "Winner of" },
  { value: "LoserOf", label: "Loser of" },
];

const LIVE = ["InProgress", "Paused", "PenaltyShootout", "InningsBreak", "SuperOver"];

const input = { padding: "0.5rem 0.6rem", borderRadius: 8, border: "1.5px solid #d8d4c8", fontSize: 14, background: "#fff", color: "#1B1B1B", minHeight: 40 };
const button = (bg, fg, extra = {}) => ({
  minHeight: 44, background: bg, color: fg, border: "none", borderRadius: 8, padding: "0.5rem 1rem",
  fontWeight: 700, fontSize: 14, cursor: "pointer", ...extra,
});
const ordinal = (n) => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
};

/** How deep in the bracket a match sits: 0 for one fed by teams or groups, else one past the deepest match feeding it. */
function depths(fixtures) {
  const byOrder = new Map(fixtures.map((f) => [f.order, f]));
  const memo = new Map();
  const depth = (f) => {
    if (memo.has(f.order)) return memo.get(f.order);
    const feeders = [f.home.slot, f.away.slot]
      .filter((s) => (s.kind === "WinnerOf" || s.kind === "LoserOf") && byOrder.has(s.fromOrder))
      .map((s) => depth(byOrder.get(s.fromOrder)) + 1);
    const d = feeders.length ? Math.max(...feeders) : 0;
    memo.set(f.order, d);
    return d;
  };
  const columns = [];
  for (const f of fixtures) (columns[depth(f)] ??= []).push(f);
  return columns.filter(Boolean);
}

const emptySlot = () => ({ kind: "Team", teamId: "", groupName: "", place: 1, fromOrder: "" });
const slotBody = (s) => ({
  kind: s.kind,
  teamId: s.kind === "Team" && s.teamId !== "" ? Number(s.teamId) : null,
  groupName: s.kind === "GroupPlace" ? s.groupName : null,
  place: s.kind === "GroupPlace" ? Number(s.place) : null,
  fromOrder: (s.kind === "WinnerOf" || s.kind === "LoserOf") && s.fromOrder !== "" ? Number(s.fromOrder) : null,
});

export default function Knockouts({ tournamentId, sport, tournament, started, canEdit, canScore, teams, onBack, onOpenMatch, onStartTournament, starting }) {
  const theme = themeFor(sport);
  const [stage, setStage] = useState(null);
  const [presets, setPresets] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const inFlight = useRef(false);
  const [thirdPlace, setThirdPlace] = useState({});
  const [startDate, setStartDate] = useState(tournament?.startDate ?? "");
  const [endDate, setEndDate] = useState(tournament?.endDate ?? "");
  const [editor, setEditor] = useState(null); // { fixtureId|null, round, label, home, away }
  const [picking, setPicking] = useState(null); // { fixtureId, side }

  const load = useCallback(async () => {
    try {
      const s = await getKnockout(tournamentId);
      setStage(s);
      if (canEdit && !s.started) setPresets(await getKnockoutPresets(tournamentId));
    } catch (e) {
      setError(e.message);
    }
  }, [tournamentId, canEdit]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // One change at a time; the answer is the whole stage, drawn as it comes.
  const run = async (label, action) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(label);
    setError("");
    try {
      const next = await action();
      if (next) setStage(next);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      inFlight.current = false;
      setBusy("");
    }
  };

  if (!stage) {
    return (
      <div>
        <ErrorBanner message={error} />
        {!error && <p style={{ color: theme.onDarkMuted }}>Loading the knockout stage…</p>}
      </div>
    );
  }

  const fixtures = stage.fixtures;
  const needsDates = !tournament?.startDate || !tournament?.endDate;
  const labelOf = (order) => fixtures.find((f) => f.order === order)?.label ?? `match ${order}`;

  const choosePreset = (preset) => {
    if (fixtures.length > 0 && !confirm(`Use "${preset.name}"?\n\nIt replaces the ${fixtures.length} knockout match${fixtures.length === 1 ? "" : "es"} set up now.`)) return;
    run(`preset-${preset.id}`, () =>
      applyKnockoutPreset(tournamentId, {
        preset: preset.id,
        thirdPlace: !!thirdPlace[preset.id],
        startDate: needsDates ? startDate || null : undefined,
        endDate: needsDates ? endDate || null : undefined,
      }),
    );
  };

  const removeAll = () => {
    if (!confirm("Remove the whole knockout stage?\n\nEvery knockout match goes. You can set it up again any time.")) return;
    run("clear", () => clearKnockout(tournamentId));
  };

  const remove = (f) => {
    if (!confirm(`Delete ${f.label}?`)) return;
    run(`delete-${f.id}`, () => deleteKnockoutMatch(tournamentId, f.id));
  };

  const openEditor = (f) =>
    setEditor(
      f
        ? {
            fixtureId: f.id,
            order: f.order,
            round: f.round,
            label: f.label,
            home: { ...emptySlot(), ...withBlanks(f.home.slot) },
            away: { ...emptySlot(), ...withBlanks(f.away.slot) },
          }
        : { fixtureId: null, order: null, round: "SemiFinal", label: "", home: emptySlot(), away: emptySlot() },
    );

  const saveEditor = async () => {
    const body = { round: editor.round, label: editor.label.trim() || null, home: slotBody(editor.home), away: slotBody(editor.away) };
    const ok = await run("editor", () =>
      editor.fixtureId ? updateKnockoutMatch(tournamentId, editor.fixtureId, body) : addKnockoutMatch(tournamentId, body),
    );
    if (ok) setEditor(null);
  };

  const pickTeam = async (f, side, teamId) => {
    const ok = await run(`team-${f.id}-${side}`, () => setKnockoutTeam(tournamentId, f.id, side, teamId));
    if (ok) setPicking(null);
  };

  const card = { background: theme.cream, color: theme.ink, borderRadius: 12, padding: "1rem" };

  return (
    <div>
      <button
        onClick={onBack}
        style={{ background: theme.surfaceOnDark, color: theme.onDark, border: `1px solid ${theme.borderOnDark}`, borderRadius: 8, padding: "0.5rem 1rem", fontSize: 14, cursor: "pointer", marginBottom: 20 }}
      >
        ← Back
      </button>
      <h2 style={{ fontFamily: font.display, fontSize: 26, margin: "0 0 1rem" }}>KNOCKOUT STAGE</h2>

      <ErrorBanner message={error} />

      {stage.championName && (
        <div className="drop-in" role="status" style={{ ...card, background: theme.accent, color: theme.accentInk, display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <TrophyIcon size={28} />
          <div>
            <div style={{ fontFamily: font.display, fontSize: 22, lineHeight: 1.1 }}>{stage.championName.toUpperCase()}</div>
            <div style={{ fontSize: 14 }}>won the final — the tournament&apos;s champions.</div>
          </div>
        </div>
      )}

      {fixtures.length === 0 ? (
        <p style={{ color: theme.onDarkMuted, fontSize: 14, marginBottom: 20 }}>
          {canEdit
            ? "No knockout stage yet. Pick a format below, or add the matches one at a time."
            : "No knockout stage yet. The organisers set it up when they're ready."}
        </p>
      ) : (
        // Rounds as columns on a wide screen; on a phone they stack, first round first.
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start", marginBottom: 24 }}>
          {depths(fixtures).map((column, c) => (
            <div key={c} style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: 12 }}>
              {column.map((f) => {
                const live = LIVE.includes(f.status);
                const ready = f.home.teamId != null && f.away.teamId != null;
                return (
                  <div key={f.id} style={{ ...card, boxShadow: live ? `0 0 0 2px ${theme.accent}` : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontFamily: font.display, fontSize: 16, letterSpacing: "0.02em" }}>{f.label.toUpperCase()}</span>
                      <span style={{ fontSize: 12, color: theme.muted, whiteSpace: "nowrap" }}>
                        {live ? <><span className="live-dot" />Live</> : f.matchNumber ? `Match ${f.matchNumber}` : ""}
                      </span>
                    </div>

                    {[["Home", f.home], ["Away", f.away]].map(([side, s]) => (
                      <div key={side} style={{ padding: "6px 0", borderTop: side === "Away" ? "1px solid #e5e2d8" : "none" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <span style={{ fontWeight: s.teamName ? 700 : 400, fontStyle: s.teamName ? "normal" : "italic", color: s.teamName ? theme.ink : theme.muted, opacity: f.winnerTeamId && s.teamId && f.winnerTeamId !== s.teamId ? 0.55 : 1 }}>
                            {f.winnerTeamId != null && f.winnerTeamId === s.teamId && <TrophyIcon size={14} title="Through" style={{ color: theme.warnInk, marginInlineEnd: 4 }} />}
                            {s.teamName ?? s.source}
                          </span>
                          {canEdit && f.canChange && picking?.fixtureId !== f.id && (
                            <button onClick={() => setPicking({ fixtureId: f.id, side })} style={{ background: "none", border: "none", color: theme.deep, textDecoration: "underline", fontSize: 12, cursor: "pointer", padding: 4 }}>
                              Change team
                            </button>
                          )}
                        </div>
                        {s.teamName && s.source !== s.teamName && (
                          <div style={{ fontSize: 12, color: theme.muted }}>
                            {s.source}{s.setByOwner ? " · set by an owner" : ""}
                          </div>
                        )}
                        {picking?.fixtureId === f.id && picking.side === side && (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                            <select
                              aria-label={`Team for ${f.label}, ${side === "Home" ? "first" : "second"} side`}
                              defaultValue={s.setByOwner ? s.teamId ?? "" : ""}
                              onChange={(e) => e.target.value && pickTeam(f, side, Number(e.target.value))}
                              style={{ ...input, flex: 1 }}
                            >
                              <option value="">Pick a team…</option>
                              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            {s.setByOwner && (
                              <button onClick={() => pickTeam(f, side, null)} style={button("transparent", theme.deep, { border: `1.5px solid ${theme.deep}` })}>
                                Back to {s.source}
                              </button>
                            )}
                            <button onClick={() => setPicking(null)} style={button("transparent", theme.muted)}>Cancel</button>
                          </div>
                        )}
                      </div>
                    ))}

                    {f.resultLine && <div style={{ fontSize: 13, color: theme.warnInk, fontWeight: 700, margin: "6px 0" }}>{f.resultLine}</div>}

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      {f.matchId != null && (
                        <button
                          onClick={() => onOpenMatch(f)}
                          disabled={canScore && f.status === "NotStarted" && !ready}
                          style={button(live ? theme.accent : theme.deep, live ? theme.accentInk : theme.cream, { flex: 1, opacity: canScore && f.status === "NotStarted" && !ready ? 0.6 : 1, cursor: canScore && f.status === "NotStarted" && !ready ? "not-allowed" : "pointer" })}
                        >
                          {canScore
                            ? f.status === "NotStarted" ? (ready ? "Start match" : "Waiting for its teams") : live ? "Enter live match" : "View summary"
                            : f.status === "NotStarted" ? "Match preview" : live ? "Watch live" : "View result"}
                        </button>
                      )}
                      {canEdit && f.canChange && (
                        <>
                          <button onClick={() => openEditor(f)} style={button("transparent", theme.deep, { border: `1.5px solid ${theme.deep}` })}>Edit</button>
                          <button onClick={() => remove(f)} disabled={busy === `delete-${f.id}`} style={button("transparent", "#a33", { border: `1.5px solid ${theme.danger}` })}>Delete</button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {canEdit && !started && fixtures.length > 0 && (
        <div style={{ ...card, marginBottom: 20, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ flex: "1 1 240px", fontSize: 14 }}>
            When the teams are ready, start the tournament: every match is made, groups and knockouts alike.
          </span>
          <button onClick={onStartTournament} disabled={starting} style={button(theme.accent, theme.accentInk)}>
            {starting ? "Starting…" : "Start tournament"}
          </button>
        </div>
      )}

      {canEdit && editor && (
        <div style={{ ...card, marginBottom: 20 }}>
          <h3 style={{ fontFamily: font.display, fontSize: 18, margin: "0 0 12px" }}>{editor.fixtureId ? `EDIT ${editor.label.toUpperCase()}` : "ADD A KNOCKOUT MATCH"}</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: theme.muted }}>
              Round
              <select value={editor.round} onChange={(e) => setEditor({ ...editor, round: e.target.value })} style={input}>
                {ROUNDS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: theme.muted, flex: "1 1 180px" }}>
              Name (optional)
              <input value={editor.label} onChange={(e) => setEditor({ ...editor, label: e.target.value })} placeholder="e.g. Semi-final 1" maxLength={60} style={input} />
            </label>
          </div>
          {["home", "away"].map((side) => (
            <SlotPicker
              key={side}
              title={side === "home" ? "First side" : "Second side"}
              value={editor[side]}
              onChange={(v) => setEditor({ ...editor, [side]: v })}
              teams={teams}
              groups={stage.groups}
              earlier={fixtures.filter((f) => editor.order == null || f.order < editor.order)}
              labelOf={labelOf}
              theme={theme}
            />
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={saveEditor} disabled={busy === "editor"} style={button(theme.accent, theme.accentInk)}>
              {busy === "editor" ? "Saving…" : editor.fixtureId ? "Save changes" : "Add match"}
            </button>
            <button onClick={() => setEditor(null)} style={button("transparent", theme.deep, { border: `1.5px solid ${theme.deep}` })}>Cancel</button>
          </div>
        </div>
      )}

      {canEdit && !editor && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          <button onClick={() => openEditor(null)} style={button(theme.surfaceOnDark, theme.onDark, { border: `1px solid ${theme.borderOnDark}` })}>
            + Add a match
          </button>
          {fixtures.length > 0 && !stage.started && (
            <button onClick={removeAll} disabled={busy === "clear"} style={button("transparent", "#F7A3A2", { border: "1px solid rgba(226,75,74,0.6)" })}>
              Remove the knockout stage
            </button>
          )}
        </div>
      )}

      {canEdit && !stage.started && presets.length > 0 && (
        <section>
          <h3 style={{ fontFamily: font.display, fontSize: 20, margin: "0 0 4px" }}>FORMATS THAT FIT</h3>
          <p style={{ color: theme.onDarkMuted, fontSize: 14, margin: "0 0 12px" }}>
            {stage.groups.length > 0
              ? "Sides fill in by themselves as each group finishes, so you can set this up now or later."
              : "No groups: every team goes into the draw, which is made at random when you choose."}
          </p>
          {needsDates && (
            <div style={{ ...card, marginBottom: 12, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
              <span style={{ flexBasis: "100%", fontSize: 14, fontWeight: 600 }}>When is it played?</span>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: theme.muted }}>
                First day
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={input} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: theme.muted }}>
                Last day
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={input} />
              </label>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {presets.map((p) => (
              <div key={p.id} style={{ ...card, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: theme.muted }}>{p.description}</div>
                <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 13 }}>
                  {p.fixtures.map((f, i) => (
                    <li key={i}><strong>{f.label}:</strong> {f.home} v {f.away}</li>
                  ))}
                </ul>
                {p.offersThirdPlace && (
                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, cursor: "pointer" }}>
                    <input type="checkbox" checked={!!thirdPlace[p.id]} onChange={(e) => setThirdPlace({ ...thirdPlace, [p.id]: e.target.checked })} />
                    Add a 3rd-place match
                  </label>
                )}
                <button onClick={() => choosePreset(p)} disabled={!!busy} style={button(theme.deep, theme.cream, { marginTop: "auto" })}>
                  {busy === `preset-${p.id}` ? "Setting up…" : "Use this format"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const withBlanks = (slot) => ({
  kind: slot.kind,
  teamId: slot.teamId ?? "",
  groupName: slot.groupName ?? "",
  place: slot.place ?? 1,
  fromOrder: slot.fromOrder ?? "",
});

/** Where one side comes from: a team, a place in a group, or the winner or loser of an earlier knockout match. */
function SlotPicker({ title, value, onChange, teams, groups, earlier, labelOf, theme }) {
  const kinds = SLOT_KINDS.filter((k) =>
    k.value === "Team" || (k.value === "GroupPlace" ? groups.length > 0 : earlier.length > 0),
  );
  const group = groups.find((g) => g.groupName === value.groupName);
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <fieldset style={{ border: "1px solid #e5e2d8", borderRadius: 8, padding: "0.6rem 0.8rem", margin: "0 0 10px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <legend style={{ fontSize: 13, color: theme.muted, padding: "0 4px" }}>{title}</legend>
      <select aria-label={`${title}: comes from`} value={value.kind} onChange={(e) => set({ kind: e.target.value })} style={input}>
        {kinds.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
      </select>
      {value.kind === "Team" && (
        <select aria-label={`${title}: team`} value={value.teamId} onChange={(e) => set({ teamId: e.target.value })} style={{ ...input, flex: 1 }}>
          <option value="">Pick a team…</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      )}
      {value.kind === "GroupPlace" && (
        <>
          <select aria-label={`${title}: group`} value={value.groupName} onChange={(e) => set({ groupName: e.target.value, place: 1 })} style={input}>
            <option value="">Group…</option>
            {groups.map((g) => <option key={g.groupName} value={g.groupName}>Group {g.groupName}</option>)}
          </select>
          {group && (
            <select aria-label={`${title}: place`} value={value.place} onChange={(e) => set({ place: Number(e.target.value) })} style={input}>
              {Array.from({ length: group.teams }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n === 1 ? "Winner" : n === 2 ? "Runner-up" : ordinal(n)}</option>
              ))}
            </select>
          )}
        </>
      )}
      {(value.kind === "WinnerOf" || value.kind === "LoserOf") && (
        <select aria-label={`${title}: match`} value={value.fromOrder} onChange={(e) => set({ fromOrder: e.target.value })} style={{ ...input, flex: 1 }}>
          <option value="">Pick a match…</option>
          {earlier.map((f) => <option key={f.order} value={f.order}>{labelOf(f.order)}</option>)}
        </select>
      )}
    </fieldset>
  );
}
