import { useCallback, useEffect, useMemo, useState } from "react";
import { addPoolPlayer, getPool, removePoolPlayer, saveTiers, setPoolMethod, setPoolPlayerTier, setPoolPlayerWithdrawn, setRegistration } from "../api/poolApi";
import { Banner, Dialog, Seg, Toggle } from "./parts";
import { amount, initials, plural, useRun } from "./poolLib";
import "./pool.css";

// The player pool (plan section 2, 9.1): who's waiting for a team, in tiers, and how the teams are
// filled from it — a draw or an auction, switchable until either starts. Owners add players by email,
// number or name, open registration by code, set tiers; everyone else sees the list read-only.

const STATUS = {
  Available: null,
  InAuction: { label: "In the auction", tone: "tint" },
  Sold: { label: "Sold", tone: "ok" },
  Unsold: { label: "Unsold", tone: "warn" },
  Drawn: { label: "Drawn", tone: "ok" },
};

export default function PoolPage({ tournamentId, tournamentName, sport, onBack, onOpenDraw, onOpenAuction }) {
  const [pool, setPool] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState("");
  const [editingTiers, setEditingTiers] = useState(false);
  const [copied, setCopied] = useState(false);
  const action = useRun();
  const add = useRun();

  const load = useCallback(() => getPool(tournamentId).then(setPool, (e) => setLoadError(e.message)), [tournamentId]);
  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn) => {
    const next = await action.run(fn);
    if (next) setPool(next);
  };

  const players = useMemo(() => {
    if (!pool) return [];
    const q = search.trim().toLowerCase();
    return pool.players.filter(
      (p) => (filter === "all" || String(p.tierId ?? "none") === filter) && (!q || p.name.toLowerCase().includes(q))
    );
  }, [pool, filter, search]);

  if (!pool) {
    return (
      <div className={`pl ${sport === "Cricket" ? "ck" : "fb"}`}>
        <Header name={tournamentName} onBack={onBack} />
        {loadError ? <Banner message={loadError} onDark /> : <p className="dim">Loading the pool…</p>}
      </div>
    );
  }

  const owner = pool.joinCode != null || pool.canEdit || pool.canAdd;
  const draw = pool.method === "Draw";
  const live = pool.players.filter((p) => !p.isWithdrawn);
  const tierName = (id) => pool.tiers.find((t) => t.id === id)?.name ?? "No tier";
  const noTier = live.filter((p) => p.tierId == null).length;
  const needOpen = pool.method && (draw ? pool.drawStatus : pool.auctionStatus) !== "None";

  const addPlayer = async (e) => {
    e.preventDefault();
    if (!adding.trim()) return;
    const tier = filter !== "all" && filter !== "none" ? Number(filter) : null;
    const next = await add.run(() => addPoolPlayer(tournamentId, adding, tier));
    if (next) {
      setPool(next);
      setAdding("");
    }
  };

  const remove = (p) => {
    if (!window.confirm(`Take ${p.name} out of the pool?`)) return;
    act(() => removePoolPlayer(tournamentId, p.id));
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pool.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* the code is on screen to read out */
    }
  };

  return (
    <div className={`pl view-in ${sport === "Cricket" ? "ck" : "fb"}`}>
      <Header name={tournamentName} onBack={onBack} />
      <Banner message={action.error} onDark />

      <section className="card" style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
        <div className="stack grow" style={{ gap: 4, minWidth: 240 }}>
          <h3 className="h3 disp">How are the teams filled?</h3>
          <span className="small muted">
            {pool.canChooseMethod
              ? "You can switch until it begins. Once the draw or the auction has started, it can't be changed."
              : pool.method
                ? `By ${draw ? "a team draw" : "an auction"}.${needOpen ? "" : " The organisers are setting it up."}`
                : "The organisers haven't chosen yet."}
          </span>
        </div>
        {pool.canChooseMethod && (
          <Seg
            label="How the teams are filled"
            value={pool.method}
            onChange={(m) => act(() => setPoolMethod(tournamentId, m))}
            options={[
              { key: "Draw", label: "Draw" },
              { key: "Auction", label: "Auction" },
            ]}
          />
        )}
        {pool.method && (owner || needOpen) && (
          <button className="btn pri" onClick={draw ? onOpenDraw : onOpenAuction}>
            {draw
              ? { None: "Set up the draw", Setup: owner ? "Set up the draw" : "The draw", Live: "Open the live draw", Confirmed: "Draw results" }[pool.drawStatus]
              : pool.auctionStatus === "Confirmed" ? "Auction results"
                : ["None", "Setup"].includes(pool.auctionStatus) ? (owner ? "Set up the auction" : "The auction") : "Open the auction"}
          </button>
        )}
      </section>

      <div className="grid" style={{ gridTemplateColumns: "320px minmax(0, 1fr)", alignItems: "start" }}>
        <aside className="stack" style={{ gap: 20 }}>
          {(pool.joinCode || pool.canAdd) && (
            <section className="card">
              <div className="between">
                <h3 className="h3 disp">Registration code</h3>
                <Toggle on={pool.registrationOpen} label="Registration open" onChange={(open) => act(() => setRegistration(tournamentId, open))} disabled={!pool.canAdd} />
              </div>
              {pool.joinCode && <div className="teko num" style={{ fontSize: 52, lineHeight: "44px", letterSpacing: ".08em", opacity: pool.registrationOpen ? 1 : 0.4 }}>{pool.joinCode}</div>}
              <span className="small muted">
                {pool.registrationOpen ? 'Players type it under "Join a team" in the app and land here, linked to their account.' : "Switch it on to let players add themselves."}
              </span>
              {pool.joinCode && pool.registrationOpen && <button className="btn sec sm" onClick={copy} style={{ alignSelf: "flex-start" }}>{copied ? "Copied" : "Copy code"}</button>}
            </section>
          )}
          <section className="card">
            <div className="between">
              <h3 className="h3 disp">Tiers</h3>
              {pool.canEdit && <button className="btn ghost sm" onClick={() => setEditingTiers(true)}>Edit</button>}
            </div>
            {pool.tiers.length === 0 && <span className="small muted">No tiers: everyone is drawn or auctioned together.</span>}
            {pool.tiers.map((t) => (
              <div key={t.id} className="between body">
                <span><b>{t.name}</b> <span className="muted small">· {plural(t.players, "player")}</span></span>
                {!draw && <span className="small muted num">base {amount(t.basePrice)}{t.maxPerTeam ? ` · at most ${t.maxPerTeam} a team` : ""}</span>}
              </div>
            ))}
            {pool.tiers.length > 0 && noTier > 0 && <div className="between body"><span><b>No tier</b> <span className="muted small">· {plural(noTier, "player")}</span></span></div>}
          </section>
        </aside>

        <section className="card" style={{ gap: 16 }}>
          <div className="between wrapr">
            <div className="stack" style={{ gap: 2 }}>
              <h3 className="h2 disp">{plural(live.length, "player")}</h3>
              <span className="small muted">{plural(pool.teams, "team")} · {plural(pool.keptPlayers, "player")} already in them, such as the captains</span>
            </div>
            {pool.canAdd && (
              <form className="row wrapr" onSubmit={addPlayer}>
                <input className="input" style={{ width: 280 }} value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="Email, mobile number or a name" aria-label="Add a player by email, mobile number or name" />
                <button className="btn pri" disabled={add.busy || !adding.trim()}>{add.busy ? "Adding…" : "Add"}</button>
              </form>
            )}
          </div>
          <Banner message={add.error} />
          <div className="row wrapr" style={{ gap: 8 }}>
            <button className={`chip${filter === "all" ? " acc" : ""}`} onClick={() => setFilter("all")} aria-pressed={filter === "all"}>All {live.length}</button>
            {pool.tiers.map((t) => (
              <button key={t.id} className={`chip${filter === String(t.id) ? " acc" : ""}`} onClick={() => setFilter(String(t.id))} aria-pressed={filter === String(t.id)}>{t.name} {t.players}</button>
            ))}
            {pool.tiers.length > 0 && <button className={`chip${filter === "none" ? " acc" : ""}`} onClick={() => setFilter("none")} aria-pressed={filter === "none"}>No tier {noTier}</button>}
            <span className="grow" />
            <input className="input" style={{ width: 200 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search names" aria-label="Search names" />
          </div>

          {players.length === 0 ? (
            <p className="small muted" style={{ margin: 0 }}>
              {pool.players.length === 0 ? (pool.canAdd ? "Nobody yet. Add players above, or open registration so they add themselves." : "Nobody is in the pool yet.") : "Nobody matches."}
            </p>
          ) : (
            <div className="scroll">
              <table>
                <thead>
                  <tr><th>Player</th>{owner && <th>Email or number</th>}<th>{sport === "Cricket" ? "Role" : "Position"}</th><th>Tier</th><th /><th /></tr>
                </thead>
                <tbody>
                  {players.map((p) => {
                    const status = STATUS[p.status];
                    return (
                      <tr key={p.id} style={{ opacity: p.isWithdrawn ? 0.5 : 1 }}>
                        <td><div className="row"><span className="av">{initials(p.name)}</span><b>{p.name}</b>{p.isMe && <span className="chip tint">You</span>}</div></td>
                        {owner && <td className="muted small">{p.email ?? p.phone ?? "No email or number"}</td>}
                        <td>{p.role ?? <span className="muted">—</span>}</td>
                        <td>
                          {pool.canEdit ? (
                            <select className="input" style={{ minHeight: 34 }} value={p.tierId ?? ""} aria-label={`${p.name}'s tier`}
                              onChange={(e) => act(() => setPoolPlayerTier(tournamentId, p.id, e.target.value ? Number(e.target.value) : null))}>
                              <option value="">No tier</option>
                              {pool.tiers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          ) : tierName(p.tierId)}
                        </td>
                        <td>
                          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                            {p.isWithdrawn ? <span className="chip">Withdrawn</span> : status && <span className={`chip ${status.tone}`}>{status.label}{p.teamName ? ` · ${p.teamName}` : ""}{p.price != null && !draw ? ` · ${amount(p.price)}` : ""}</span>}
                            {owner && !p.isWithdrawn && (p.isLinked ? <span className="chip ok">Has an account</span> : p.email || p.phone ? <span className="chip warn">Waiting to sign up</span> : null)}
                            {p.joinedByCode && <span className="chip tint">Joined by code</span>}
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {pool.canEdit ? (
                            <button className="btn ghost sm" onClick={() => remove(p)}>Remove</button>
                          ) : pool.canAdd && ["Available", "InAuction", "Unsold", "Drawn"].includes(p.status) || p.isWithdrawn && pool.canAdd ? (
                            <button className="btn ghost sm" onClick={() => act(() => setPoolPlayerWithdrawn(tournamentId, p.id, !p.isWithdrawn))}>
                              {p.isWithdrawn ? "Bring back" : "Withdraw"}
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {editingTiers && (
        <TierDialog
          tiers={pool.tiers}
          prices={!draw}
          sport={sport}
          onClose={() => setEditingTiers(false)}
          onSave={async (tiers) => {
            const next = await action.run(() => saveTiers(tournamentId, tiers));
            if (next) {
              setPool(next);
              setEditingTiers(false);
            }
          }}
          busy={action.busy}
          error={action.error}
        />
      )}
    </div>
  );
}

export function Header({ name, title = "Player pool", onBack, right }) {
  return (
    <header className="top">
      <button className="btn dark" onClick={onBack} aria-label="Back" style={{ padding: "0 14px" }}>← Back</button>
      <div className="stack grow">
        <span className="crumb">{name}</span>
        <h2 className="disp">{title}</h2>
      </div>
      {right}
    </header>
  );
}

/** Every tier at once, top first: a tier left out is deleted and its players go to "No tier". */
function TierDialog({ tiers, prices, sport, onClose, onSave, busy, error }) {
  const [rows, setRows] = useState(() =>
    tiers.length ? tiers.map((t) => ({ ...t, basePrice: String(t.basePrice), maxPerTeam: t.maxPerTeam ? String(t.maxPerTeam) : "" })) : [{ id: null, name: "A", basePrice: "100", maxPerTeam: "" }]
  );
  const change = (i, key, value) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [key]: value } : x)));
  const move = (i, by) => setRows((r) => {
    const next = [...r];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    return next;
  });
  const save = () =>
    onSave(rows.filter((r) => r.name.trim()).map((r) => ({ id: r.id ?? null, name: r.name.trim(), basePrice: Number(r.basePrice || 0), maxPerTeam: r.maxPerTeam ? Number(r.maxPerTeam) : null })));

  return (
    <Dialog id="tiers-title" title="Tiers" sport={sport} onClose={onClose} width={560}>
          <span className="small muted">Top tier first. {prices ? "In an auction the base price is the first bid; the limit is how many of a tier one team may buy." : "In a draw the top tier is drawn first."}</span>
          <Banner message={error} />
          {rows.map((r, i) => (
            <div key={r.id ?? `new${i}`} className="row wrapr" style={{ gap: 8 }}>
              <input className="input grow" value={r.name} onChange={(e) => change(i, "name", e.target.value)} aria-label="Tier name" maxLength={30} />
              {prices && <input className="input num" style={{ width: 96 }} value={r.basePrice} onChange={(e) => change(i, "basePrice", e.target.value.replace(/\D/g, ""))} aria-label="Base price" placeholder="Base" />}
              {prices && <input className="input num" style={{ width: 96 }} value={r.maxPerTeam} onChange={(e) => change(i, "maxPerTeam", e.target.value.replace(/\D/g, ""))} aria-label="At most a team" placeholder="No limit" />}
              <button className="btn ghost sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
              <button className="btn ghost sm" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down">↓</button>
              <button className="btn ghost sm" onClick={() => setRows((x) => x.filter((_, j) => j !== i))} aria-label={`Delete ${r.name}`}>✕</button>
            </div>
          ))}
          <button className="btn sec sm" style={{ alignSelf: "flex-start" }} onClick={() => setRows((r) => [...r, { id: null, name: "", basePrice: "100", maxPerTeam: "" }])}>Add a tier</button>
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn pri" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save tiers"}</button>
          </div>
    </Dialog>
  );
}
