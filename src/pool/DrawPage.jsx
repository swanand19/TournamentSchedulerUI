import { useCallback, useEffect, useState } from "react";
import { parseUtc } from "../footballClock";
import { drawAction, getDraw } from "../api/poolApi";
import { Header } from "./PoolPage";
import { Banner, Dialog, Opt, Reel, Seg, Toggle } from "./parts";
import { plural, sportClass, useLiveState, useRun, useServerNow } from "./poolLib";
import "./pool.css";

// The team draw in the web app (plan section 9, designs "Web · draw …" on the canvas). Setup with
// the server's preview; the live draw — the team named, the pot spinning, the name landing at the
// same moment on every screen (the server keeps it hidden until then, E-3); then the teams drawn,
// where a player can be moved or swapped (marked for all to see) before the teams are confirmed.

const AUTO_SECONDS = 8;

export default function DrawPage({ tournamentId, tournamentName, sport, tvLink, onBack }) {
  const load = useCallback(() => getDraw(tournamentId), [tournamentId]);
  const live = useLiveState(load, { tournamentId, ms: 3000 });
  const d = live.data;
  const action = useRun();
  const drawing = d?.status === "Live" && !d.allDrawn;
  const now = useServerNow(live.offset, drawing, 250);
  const landsAt = d?.spin ? parseUtc(d.spin.landsAt).getTime() : null;
  const { reload } = live;

  // A name lands at the server's moment: fetch it then, without waiting for the nudge.
  useEffect(() => {
    if (!landsAt) return undefined;
    const timer = setTimeout(reload, Math.max(0, landsAt - (Date.now() + live.offset)) + 150);
    return () => clearTimeout(timer);
  }, [landsAt, reload, live.offset]);

  const act = async (service, body) => {
    const next = await action.run(() => drawAction(tournamentId, service, body));
    if (next) live.set(next);
    return next;
  };

  if (!d) {
    return (
      <div className={`pl ${sportClass(sport)}`}>
        <Header name={tournamentName} title="Team draw" onBack={onBack} />
        {live.error ? <Banner message={live.error} onDark /> : <p className="dim">Loading the draw…</p>}
      </div>
    );
  }

  const setup = d.status === "None" || d.status === "Setup";
  const crumb = drawing
    ? `${tournamentName} · ${d.me.isDrawer ? "You are drawing" : d.drawer ? `${d.drawer.name} is drawing` : "Live"}`
    : setup ? `${tournamentName} · Player pool · Draw`
      : `${tournamentName} · Drawn ${d.times === 1 ? "once" : `${d.times} times`}${d.status === "Confirmed" ? " · confirmed" : " · not confirmed yet"}`;
  const props = { d, sport, act, action, now };

  return (
    <div className={`pl view-in ${sportClass(sport)}`}>
      <Header
        name={crumb}
        title={setup ? "Team draw" : drawing ? "Team draw" : d.status === "Confirmed" ? "Draw results" : "Teams drawn"}
        onBack={onBack}
        right={
          <div className="row wrapr">
            {drawing && <span className="live"><i />Live</span>}
            {!setup && tvLink && <a className="btn dark" href={tvLink} target="_blank" rel="noreferrer">Open TV board ↗</a>}
          </div>
        }
      />
      <Banner message={action.error} onDark />
      {setup ? (d.me.isOwner ? <Setup {...props} /> : <Waiting d={d} />) : drawing ? <Live {...props} /> : <Drawn {...props} />}
    </div>
  );
}

function Waiting({ d }) {
  return (
    <section className="card">
      <h3 className="h3 disp">The draw hasn't started</h3>
      <span className="body">
        {d.me.poolPlayerId != null
          ? "You're in the player pool. When the organiser starts the draw you'll get a notification, and you can watch here which team you're drawn for."
          : "The organisers are still setting it up. Watch it here once it starts."}
      </span>
    </section>
  );
}

// =====================================================================================
// Setup
// =====================================================================================

function Setup({ d, act, action }) {
  const a = d.actions;
  const p = d.preview;
  const start = () => {
    if (window.confirm("Start the live draw?\n\nEveryone in the pool, the teams' players, the owners and the scorers are told. Once it starts, the teams are filled by the draw.")) act("DRAW_START");
  };
  const quick = () => {
    if (window.confirm("Draw every team at once?\n\nEveryone sees the result. You can shuffle again until you confirm the teams.")) act("DRAW_QUICK");
  };
  return (
    <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) 420px", alignItems: "start" }}>
      <div className="stack" style={{ gap: 20 }}>
        <section className="card">
          <h3 className="h3 disp">How names are drawn</h3>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }} role="radiogroup" aria-label="How names are drawn">
            <Opt on={d.kind === "ByTier"} disabled={!a.canEditKind} onPick={() => act("DRAW_SETTINGS", { kind: "ByTier" })} title="Tier by tier" detail="The top tier first, then the next. Every team gets a fair share of each tier." />
            <Opt on={d.kind === "Random"} disabled={!a.canEditKind} onPick={() => act("DRAW_SETTINGS", { kind: "Random" })} title="All at random" detail="Any name, any time. Tiers are ignored." />
          </div>
        </section>
        {p && (
          <section className="card">
            <h3 className="h3 disp">How it will come out</h3>
            <div className="body"><b>{p.line}</b></div>
            <div className="scroll">
              <table>
                <thead><tr><th>Team</th><th>Has now</th><th>Gets</th><th>Ends with</th></tr></thead>
                <tbody>
                  {p.teams.map((t) => (
                    <tr key={t.teamId}>
                      <td><b>{t.name}</b></td>
                      <td className="num">{t.has}</td>
                      <td className="num">{t.orOneMore ? `${t.gets}–${t.gets + 1}` : t.gets}</td>
                      <td className="num">{t.orOneMore ? `${t.endsWith} or ${t.endsWith + 1}` : t.endsWith}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {p.note && <span className="small muted">{p.note}</span>}
            {p.tiers.length > 0 && <div className="hair" />}
            {p.tiers.map((t) => <div key={t.name} className="between small"><b>{t.name}</b><span className="muted">{plural(t.players, "player")}</span></div>)}
          </section>
        )}
      </div>
      <aside className="stack" style={{ gap: 20 }}>
        {d.startProblem && <section className="card warncard"><b>Before you can start</b><span className="small">{d.startProblem}</span></section>}
        <section className="card">
          <h3 className="h3 disp">Live draw</h3>
          <span className="body">One name at a time, with everyone watching on their phones and on the TV.</span>
          <div className="field">
            <span className="lab">Pace</span>
            <Seg label="Pace" value={d.autoSeconds ? "auto" : "tap"} disabled={!a.canEditPace}
              onChange={(k) => act("DRAW_SETTINGS", { setPace: true, autoSeconds: k === "auto" ? AUTO_SECONDS : null })}
              options={[{ key: "tap", label: "I tap for each name" }, { key: "auto", label: `Every ${AUTO_SECONDS} seconds` }]} />
          </div>
          <span className="small muted">Each turn: the team is named, the names in the pot spin, and one lands. Nobody, you included, knows the name before it lands.</span>
          <button className="btn pri xl" onClick={start} disabled={!a.canStart || action.busy}>Start the live draw</button>
        </section>
        <section className="card">
          <h3 className="h3 disp">Quick draw</h3>
          <span className="body">The whole draw in one go. Everyone sees the result.</span>
          <button className="btn sec lg" onClick={quick} disabled={!a.canQuickDraw || action.busy}>Quick draw</button>
        </section>
        <span className="small dim">Everyone in the pool, the teams' players, the owners and scorers are told when the live draw starts.</span>
      </aside>
    </div>
  );
}

// =====================================================================================
// The live draw
// =====================================================================================

function Live({ d, act, action, now }) {
  const a = d.actions;
  const spin = d.spin;
  const last = d.last;
  const landedAgo = last ? now - parseUtc(last.landedAt).getTime() : Infinity;
  const fresh = !spin && last && landedAgo < 6000;
  const next = d.teams.find((t) => t.teamId === (spin?.teamId ?? d.nextTeamId));
  const lit = spin?.teamId ?? (fresh ? last.teamId : d.nextTeamId);
  const restart = () => window.confirm("Start the draw again?\n\nEveryone drawn goes back to the pool, and everyone watching sees it start again.") && act("DRAW_RESTART");

  return (
    <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) 340px", alignItems: "start" }}>
      <section className="deck" style={{ gap: 20 }}>
        <div className="between wrapr">
          <span className="small dim">{d.pot ? `${d.pot.name} · ${d.pot.players.length} in the pot · ` : ""}{d.counts.drawn} of {d.counts.players} drawn</span>
          <span className="small dim">Order: {d.teams.map((t) => t.name).join(", ")}</span>
        </div>
        <div className="row wrapr" style={{ gap: 28 }}>
          <div className="stack" style={{ gap: 4, minWidth: 200 }}>
            <span className="small dim">{spin ? "Drawing for" : fresh ? "Drawn for" : "Next to draw"}</span>
            <span className="disp gold" style={{ fontSize: 52, lineHeight: "58px" }}>{spin ? spin.teamName : fresh ? last.teamName : next?.name ?? "—"}</span>
            {next && !fresh && <span className="small dim">{plural(next.players, "player")}{spin ? "" : ", the fewest"}</span>}
          </div>
          <div className="grow" style={{ minWidth: 260 }} aria-live="polite">
            {spin ? (
              <Reel names={spin.names} startsAt={parseUtc(spin.pickedAt).getTime()} landsAt={parseUtc(spin.landsAt).getTime()} now={now} row={120} fontSize={48} />
            ) : fresh ? (
              <div className="reel" style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                <span className="disp landed" style={{ fontSize: 48, lineHeight: "52px", textAlign: "center" }}>{last.name}</span>
                <span className="small dim">{[last.role, last.tierName && `Tier ${last.tierName}`].filter(Boolean).join(" · ")}</span>
              </div>
            ) : (
              <div className="reel" style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="dim body">{d.me.isDrawer ? (d.autoSeconds ? `The next name is drawn by itself in a few seconds.` : "Draw the next name when you're ready.") : "Waiting for the next name."}</span>
              </div>
            )}
          </div>
        </div>
        <span className="small dim">The names spin on every screen and land at the same moment. Nobody, the drawer included, knows the name before it lands.</span>
        <div className="hairdk" />
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14 }}>
          {d.teams.map((t) => (
            <div key={t.teamId} className={`tile${t.teamId === lit ? " lit" : ""}`}>
              <div className="between"><b>{t.turn ? `${t.turn}. ` : ""}{t.name}</b><span key={t.players} className="teko num pop-in" style={{ fontSize: 26, lineHeight: "22px" }}>{t.players}</span></div>
              {t.kept.map((k) => <span key={`k${k}`} className="small dim">{k}</span>)}
              {t.drawn.map((p) => <span key={p.pickId} className={`small${p.pickId === last?.pickId && fresh ? " gold row-in" : ""}`}>{p.name}</span>)}
            </div>
          ))}
        </div>
      </section>

      <aside className="stack" style={{ gap: 20 }}>
        {d.me.isDrawer ? (
          <section className="card">
            <button className="btn pri xl" onClick={() => act("DRAW_NEXT")} disabled={!a.canDrawNext || action.busy}>{spin ? "Drawing…" : "Draw next"}</button>
            <div className="between">
              <span className="body">Draw every {AUTO_SECONDS} seconds</span>
              <Toggle on={!!d.autoSeconds} label="Draw by itself" disabled={!a.canEditPace} onChange={(on) => act("DRAW_SETTINGS", { setPace: true, autoSeconds: on ? AUTO_SECONDS : null })} />
            </div>
            <div className="hair" />
            {a.canDrawRestOfPot && <button className="btn sec" onClick={() => act("DRAW_REST", { all: false })} disabled={action.busy}>Draw the rest of {d.pot?.name ?? "this tier"}</button>}
            <button className="btn sec" onClick={() => window.confirm("Draw everyone left at once?") && act("DRAW_REST", { all: true })} disabled={!a.canDrawAll || action.busy}>Draw everyone left</button>
          </section>
        ) : (
          d.me.drawnForTeamId != null && (
            <section className="card">
              <h3 className="h3 disp">You're in {d.teams.find((t) => t.teamId === d.me.drawnForTeamId)?.name}</h3>
              <span className="small muted">You'll be in their squad once the organiser confirms the teams.</span>
            </section>
          )
        )}
        {d.pot && (
          <section className="card" style={{ gap: 8 }}>
            <h3 className="h3 disp">Pot · {d.pot.name}</h3>
            {d.pot.players.map((p) => <span key={p.poolPlayerId} className="small">{p.name}{p.role ? <span className="muted"> · {p.role}</span> : null}</span>)}
            {d.pot.nextName && <span className="small muted">Then {d.pot.nextName}: {plural(d.pot.nextCount, "player")}</span>}
          </section>
        )}
        {a.canRestart && <button className="btn dark" onClick={restart}>Start again</button>}
        {a.canTakeOver && <button className="btn dark" onClick={() => window.confirm(`Draw yourself? ${d.drawer?.name ?? "The drawer"} stops drawing.`) && act("DRAW_TAKE_OVER")}>Take over the draw</button>}
      </aside>
    </div>
  );
}

// =====================================================================================
// The teams drawn: move, swap, start again, confirm
// =====================================================================================

function Drawn({ d, sport, act, action }) {
  const a = d.actions;
  const confirmed = d.status === "Confirmed";
  const [moving, setMoving] = useState(null);
  const sizes = [...new Set(d.teams.map((t) => t.players))].sort((x, y) => y - x);
  const confirmTeams = () =>
    window.confirm("Confirm the teams?\n\nEvery name drawn becomes a place in that team's squad. The draw can't be changed afterwards.") && act("DRAW_CONFIRM");
  const restart = () => window.confirm("Start the draw again?\n\nEveryone drawn goes back to the pool.") && act("DRAW_RESTART");
  const shuffle = () => window.confirm("Shuffle again?\n\nEvery team is drawn again from scratch, and the results say how many times it was drawn.") && act("DRAW_QUICK");

  return (
    <>
      <section className="card" style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
        <div className="stack grow" style={{ gap: 4, minWidth: 240 }}>
          <h3 className="h3 disp">
            {plural(d.counts.drawn, "player")} drawn · {sizes.length === 1 ? `every team has ${sizes[0]}` : `teams of ${sizes.join(" and ")}`}
          </h3>
          <span className="small muted">
            {confirmed ? "The squads are made: changes are now done on the teams, as usual."
              : d.me.isDrawer ? a.confirmProblem ?? "Move or swap anyone before confirming. Moves are marked for everyone to see."
                : "The organiser is checking the teams before confirming them."}
          </span>
        </div>
        {!confirmed && a.canQuickDraw && <button className="btn sec" onClick={shuffle}>Shuffle again</button>}
        {!confirmed && a.canRestart && <button className="btn sec" onClick={restart}>Start again</button>}
        {!confirmed && d.me.isDrawer && <button className="btn pri lg" onClick={confirmTeams} disabled={!a.canConfirm || action.busy}>Confirm teams</button>}
        {!confirmed && a.canTakeOver && <button className="btn sec" onClick={() => act("DRAW_TAKE_OVER")}>Take over</button>}
      </section>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
        {d.teams.map((t) => (
          <section key={t.teamId} className="card" style={{ gap: 8 }}>
            <div className="between"><h3 className="h3 disp">{t.name}</h3><span className="chip">{t.players}</span></div>
            <div className="hair" />
            {t.kept.map((k) => <span key={`k${k}`} className="small muted">{k} · already in</span>)}
            {t.drawn.map((p) => (
              <div key={p.pickId} className={`between small${p.isMe ? " lit-row" : ""}`}>
                <span className="stack" style={{ minWidth: 0 }}>
                  <span>{p.name}{p.role ? <span className="muted"> · {p.role}</span> : null}</span>
                  {p.movedFromTeamName && <span style={{ fontSize: 12, color: "var(--warn-ink)" }}>Moved from {p.movedFromTeamName}</span>}
                </span>
                {a.canMove && <button className="btn ghost sm" onClick={() => setMoving(p)} aria-label={`Move or swap ${p.name}`}>⇄</button>}
              </div>
            ))}
          </section>
        ))}
      </div>
      {moving && <MoveDialog d={d} pick={moving} sport={sport} act={act} action={action} onClose={() => setMoving(null)} />}
    </>
  );
}

function MoveDialog({ d, pick, sport, act, action, onClose }) {
  const [mode, setMode] = useState("move");
  const [teamId, setTeamId] = useState(null);
  const [other, setOther] = useState(null);
  const from = d.teams.find((t) => t.teamId === pick.teamId);
  const team = d.teams.find((t) => t.teamId === teamId);
  const picks = d.teams.flatMap((t) => t.drawn).filter((p) => p.teamId !== pick.teamId);
  const otherPick = picks.find((p) => p.poolPlayerId === other);
  const save = async () => {
    const done = mode === "move"
      ? await act("DRAW_MOVE", { poolPlayerId: pick.poolPlayerId, teamId })
      : await act("DRAW_SWAP", { poolPlayerId: pick.poolPlayerId, otherPoolPlayerId: other });
    if (done) onClose();
  };
  return (
    <Dialog id="move-title" title={`${pick.name} · ${from?.name ?? ""}`} sport={sport} onClose={onClose}>
      <Banner message={action.error} />
      <Seg label="Move or swap" value={mode} onChange={setMode} options={[{ key: "move", label: "Move to" }, { key: "swap", label: "Swap with" }]} />
      <div className="stack" role="radiogroup" style={{ gap: 8, maxHeight: 300, overflowY: "auto" }}>
        {mode === "move"
          ? d.teams.filter((t) => t.teamId !== pick.teamId).map((t) => (
              <Opt key={t.teamId} on={t.teamId === teamId} onPick={() => setTeamId(t.teamId)} title={t.name} detail={`${t.players} → ${t.players + 1} players`} />
            ))
          : picks.map((p) => <Opt key={p.pickId} on={p.poolPlayerId === other} onPick={() => setOther(p.poolPlayerId)} title={p.name} detail={p.teamName} />)}
      </div>
      {mode === "move" && team && from && from.players - 1 !== team.players + 1 && (
        <span className="small warn">{from.name} will have {from.players - 1}, {team.name} {team.players + 1}. That's allowed; the teams just end uneven.</span>
      )}
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn pri" onClick={save} disabled={action.busy || (mode === "move" ? !team : !otherPick)}>
          {mode === "move" ? (team ? `Move to ${team.name}` : "Pick a team") : otherPick ? `Swap with ${otherPick.name}` : "Pick a player"}
        </button>
      </div>
    </Dialog>
  );
}

