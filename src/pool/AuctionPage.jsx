import { useCallback, useState } from "react";
import { parseUtc } from "../footballClock";
import { auctionAction, getAuction, getFillPreview } from "../api/poolApi";
import { Header } from "./PoolPage";
import { Banner, Dialog, Opt, Seg, Toggle } from "./parts";
import { amount, initials, plural, sportClass, useLiveState, useRun, useServerNow } from "./poolLib";
import "./pool.css";

// The player auction in the web app (plan section 4, designs "Web · auction …" on the canvas), for
// organisers who run it from a laptop: setup, the auctioneer's console (bids from the room, the
// clock, sell / unsold / undo / pause), a bidder's own Bid button, the board for everyone else,
// then rounds, results, assigning by hand, fill the gaps by draw, move / swap, confirm. The server
// decides every rule; the buttons are its `actions`. A sale lands on every screen as the SOLD card.

const STEP_PRESETS = [
  { key: "standard", label: "Standard", steps: [{ upTo: 1000, step: 50 }, { upTo: 3000, step: 100 }, { upTo: null, step: 250 }] },
  { key: "small", label: "Small league", steps: [{ upTo: 500, step: 25 }, { upTo: 2000, step: 50 }, { upTo: null, step: 100 }] },
  { key: "big", label: "Big money", steps: [{ upTo: 10000, step: 500 }, { upTo: 50000, step: 1000 }, { upTo: null, step: 2500 }] },
];
const sameSteps = (a, b) => a.length === b.length && a.every((x, i) => x.upTo === b[i].upTo && x.step === b[i].step);

export default function AuctionPage({ tournamentId, tournamentName, sport, tvLink, onBack }) {
  const load = useCallback(() => getAuction(tournamentId), [tournamentId]);
  const live = useLiveState(load, { tournamentId, ms: 3000 });
  const s = live.data;
  const action = useRun();
  const running = s?.status === "Live" || s?.status === "Paused";
  const now = useServerNow(live.offset, running);

  const act = async (service, body) => {
    const next = await action.run(() => auctionAction(tournamentId, service, body));
    if (next) live.set(next);
    return next;
  };

  const tvButton = tvLink ? (
    <a className="btn dark" href={tvLink} target="_blank" rel="noreferrer">Open TV board ↗</a>
  ) : null;

  if (!s) {
    return (
      <div className={`pl ${sportClass(sport)}`}>
        <Header name={tournamentName} title="Player auction" onBack={onBack} />
        {live.error ? <Banner message={live.error} onDark /> : <p className="dim">Loading the auction…</p>}
      </div>
    );
  }

  const props = { s, sport, act, action, now, tournamentId };
  const lastAt = s.last ? parseUtc(s.last.at).getTime() : 0;
  const sold = running && s.last && now - lastAt < 4000 ? s.last : null;
  const title = { None: "Set up the auction", Setup: s.me.isOwner ? "Set up the auction" : "Player auction", Confirmed: "Auction results", Finished: "Auction results" }[s.status] ?? "Player auction";
  const crumb = running
    ? `${tournamentName} · ${s.me.isAuctioneer ? "You run it" : s.auctioneer ? `Run by ${s.auctioneer.name}` : "Live"}`
    : s.status === "Finished" ? `${tournamentName} · Finished · not confirmed yet` : tournamentName;

  return (
    <div className={`pl view-in ${sportClass(sport)}`}>
      <Header
        name={crumb}
        title={title}
        onBack={onBack}
        right={
          <div className="row wrapr">
            {running && <span className="live"><i />{s.status === "Paused" ? "Paused" : "Live"}</span>}
            {s.status !== "None" && s.status !== "Setup" && tvButton}
          </div>
        }
      />
      <Banner message={action.error} onDark />
      {s.status === "None" || s.status === "Setup" ? (
        s.me.isOwner ? <Setup {...props} /> : <Waiting s={s} />
      ) : running ? (
        <Running {...props} />
      ) : (
        <Results {...props} />
      )}
      {!tvLink && s.me.isOwner && s.status !== "Confirmed" && (
        <p className="small dim" style={{ margin: 0 }}>
          The TV board for the hall needs the tournament’s public link, which KickCricket has hidden for this tournament.
        </p>
      )}
      {sold && <SoldCard last={sold} s={s} />}
    </div>
  );
}

function Waiting({ s }) {
  return (
    <section className="card">
      <h3 className="h3 disp">The auction hasn't started</h3>
      <span className="body">
        {s.me.poolPlayerId != null
          ? "You're in the player pool. When the organiser starts the auction you'll get a notification, and you can watch here which team buys you."
          : s.me.bidderForTeamId != null
            ? `You bid for ${s.teams.find((t) => t.teamId === s.me.bidderForTeamId)?.name}. You'll get a notification when it starts; bid from this page or the app.`
            : "The organisers are still setting it up. Watch it here once it starts."}
      </span>
    </section>
  );
}

// =====================================================================================
// Setup
// =====================================================================================

function Setup({ s, sport, act, action }) {
  const set = s.settings;
  const [draft, setDraft] = useState(() => ({
    unit: set.unit, purse: String(set.purse), minSquad: String(set.minSquad), maxSquad: String(set.maxSquad),
    keptPlayerPrice: String(set.keptPlayerPrice), noTierBasePrice: String(set.noTierBasePrice), bidSteps: set.bidSteps,
    clockOn: set.clockOn, firstBidSeconds: String(set.firstBidSeconds), nextBidSeconds: String(set.nextBidSeconds),
    order: set.order, unsoldPlan: set.unsoldPlan,
  }));
  const [bidderFor, setBidderFor] = useState(null);
  const change = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));
  const digits = (key) => (e) => change(key)(e.target.value.replace(/\D/g, ""));
  const a = s.actions;
  const n = (v) => Number(v || 0);
  const dirty =
    draft.unit !== set.unit || n(draft.purse) !== set.purse || n(draft.minSquad) !== set.minSquad || n(draft.maxSquad) !== set.maxSquad ||
    n(draft.keptPlayerPrice) !== set.keptPlayerPrice || n(draft.noTierBasePrice) !== set.noTierBasePrice || !sameSteps(draft.bidSteps, set.bidSteps) ||
    draft.clockOn !== set.clockOn || n(draft.firstBidSeconds) !== set.firstBidSeconds || n(draft.nextBidSeconds) !== set.nextBidSeconds ||
    draft.order !== set.order || draft.unsoldPlan !== set.unsoldPlan;

  const save = () =>
    act("AUCTION_SETTINGS", {
      unit: draft.unit, purse: n(draft.purse), minSquad: n(draft.minSquad), maxSquad: n(draft.maxSquad), keptPlayerPrice: n(draft.keptPlayerPrice),
      noTierBasePrice: n(draft.noTierBasePrice), bidSteps: draft.bidSteps, clockOn: draft.clockOn, firstBidSeconds: n(draft.firstBidSeconds),
      nextBidSeconds: n(draft.nextBidSeconds), order: draft.order, unsoldPlan: draft.unsoldPlan,
    });

  const start = async () => {
    if (dirty && !(await save())) return;
    if (!window.confirm("Start the auction?\n\nEveryone in the pool and the bidders get a notification. The rules are fixed once it starts (only the clock can change, while paused).")) return;
    await act("AUCTION_START");
  };

  const preset = STEP_PRESETS.find((p) => sameSteps(p.steps, draft.bidSteps));
  const edit = a.canEditSettings;

  return (
    <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) 400px", alignItems: "start" }}>
      <div className="stack" style={{ gap: 20 }}>
        <section className="card">
          <h3 className="h3 disp">Money and squads</h3>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
            <div className="field"><span className="lab">Unit</span><Seg label="Unit" value={draft.unit} onChange={change("unit")} disabled={!edit} options={[{ key: "pts", label: "pts" }, { key: "₹", label: "₹" }]} /></div>
            <div className="field"><label htmlFor="au-purse">Purse per team</label><input id="au-purse" className="input num" value={draft.purse} onChange={digits("purse")} disabled={!edit} /></div>
            <div className="field"><label htmlFor="au-min">Players a team must have</label><input id="au-min" className="input num" value={draft.minSquad} onChange={digits("minSquad")} disabled={!edit} /></div>
            <div className="field"><label htmlFor="au-max">Most a team may have</label><input id="au-max" className="input num" value={draft.maxSquad} onChange={digits("maxSquad")} disabled={!edit} /></div>
            <div className="field"><label htmlFor="au-kept">A player already in a team costs</label><input id="au-kept" className="input num" value={draft.keptPlayerPrice} onChange={digits("keptPlayerPrice")} disabled={!edit} /></div>
            <div className="field"><label htmlFor="au-notier">Base price, no tier</label><input id="au-notier" className="input num" value={draft.noTierBasePrice} onChange={digits("noTierBasePrice")} disabled={!edit} /></div>
          </div>
          <span className="small muted">Squad sizes count the players already in a team, such as the captain. Tier base prices are set on the pool page.</span>
        </section>

        <section className="card">
          <div className="between wrapr">
            <h3 className="h3 disp">Bid steps</h3>
            <Seg label="Bid step presets" value={preset?.key} onChange={(k) => change("bidSteps")(STEP_PRESETS.find((p) => p.key === k).steps)} disabled={!edit}
              options={STEP_PRESETS.map((p) => ({ key: p.key, label: p.label }))} />
          </div>
          <table>
            <thead><tr><th>Bids</th><th>Each bid adds</th></tr></thead>
            <tbody>
              {draft.bidSteps.map((x, i) => (
                <tr key={i}><td className="num">{x.upTo == null ? `Above ${amount(draft.bidSteps[i - 1]?.upTo ?? 0)}` : `Up to ${amount(x.upTo)}`}</td><td className="num">+{amount(x.step)}</td></tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <div className="between"><h3 className="h3 disp">Bid clock</h3><Toggle on={draft.clockOn} onChange={change("clockOn")} label="Bid clock on" disabled={!a.canEditClock} /></div>
          {draft.clockOn && (
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="field"><label htmlFor="au-c1">Time for the first bid</label><div className="row"><input id="au-c1" className="input num" style={{ width: 90 }} value={draft.firstBidSeconds} onChange={digits("firstBidSeconds")} disabled={!a.canEditClock} /><span className="muted">seconds</span></div></div>
              <div className="field"><label htmlFor="au-c2">Time after each bid</label><div className="row"><input id="au-c2" className="input num" style={{ width: 90 }} value={draft.nextBidSeconds} onChange={digits("nextBidSeconds")} disabled={!a.canEditClock} /><span className="muted">seconds</span></div></div>
            </div>
          )}
          <span className="small muted">
            {draft.clockOn ? "Every bid sets the clock back to the full time after a bid. At 0 the player is sold, or unsold without a bid." : "Off: you sell each player by hand."}
          </span>
        </section>

        <section className="card">
          <h3 className="h3 disp">Order and unsold players</h3>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }} role="radiogroup" aria-label="Order and unsold players">
            <Opt on={draft.order === "ByTier"} onPick={() => change("order")("ByTier")} disabled={!edit} title="Top tier first" detail="Shuffled inside each tier" />
            <Opt on={draft.order === "ListOrder"} onPick={() => change("order")("ListOrder")} disabled={!edit} title="The pool's order" detail="As the list is sorted" />
            <Opt on={draft.unsoldPlan === "AnotherRound"} onPick={() => change("unsoldPlan")("AnotherRound")} disabled={!edit} title="Another round for unsold players" detail="At the same or a lower price" />
            <Opt on={draft.unsoldPlan === "AssignByHand"} onPick={() => change("unsoldPlan")("AssignByHand")} disabled={!edit} title="Assign them by hand" detail="To teams with room" />
          </div>
        </section>
        {dirty && (
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button className="btn pri" onClick={save} disabled={action.busy}>{action.busy ? "Saving…" : "Save the rules"}</button>
          </div>
        )}
      </div>

      <aside className="stack" style={{ gap: 20 }}>
        <section className="card">
          <h3 className="h3 disp">Who bids for each team</h3>
          {s.teams.map((t, i) => (
            <div key={t.teamId} className="stack" style={{ gap: 10 }}>
              {i > 0 && <div className="hair" />}
              <div className="between">
                <div className="stack">
                  <b>{t.name}</b>
                  <span className="small muted">
                    {t.bidder ? `${t.bidder.name} · ${t.bidderIsCaptain ? "Captain" : "Chosen by you"}` : t.captainWithoutAccount ? `${t.captainName} has no account: you record their bids` : "You record their bids from the room"}
                  </span>
                </div>
                {a.canSetBidders && <button className="btn sec sm" onClick={() => setBidderFor(t)}>Change</button>}
              </div>
            </div>
          ))}
          <span className="small muted">A bidder needs an account. Whoever runs the auction can't bid for a team.</span>
        </section>
        {(s.startProblem || s.startWarning) && (
          <section className="card warncard">
            <b>{s.startProblem ? "Before you can start" : "Before you start"}</b>
            <span className="small">{s.startProblem ?? s.startWarning}</span>
          </section>
        )}
        <button className="btn pri xl" onClick={start} disabled={!a.canStart || action.busy}>Start the auction</button>
        <span className="small dim" style={{ textAlign: "center" }}>Everyone in the pool and the bidders get a notification.</span>
      </aside>
      {bidderFor && <BidderDialog team={bidderFor} sport={sport} act={act} action={action} onClose={() => setBidderFor(null)} />}
    </div>
  );
}

function BidderDialog({ team, sport, act, action, onClose }) {
  const [contact, setContact] = useState("");
  const done = async (body) => {
    if (await act("AUCTION_BIDDER_SET", { teamId: team.teamId, ...body })) onClose();
  };
  return (
    <Dialog id="bidder-title" title={`Who bids for ${team.name}`} sport={sport} onClose={onClose}>
      <Banner message={action.error} />
      {team.captainPlayerId != null && !team.captainWithoutAccount && !team.bidderIsCaptain && (
        <button className="btn sec" onClick={() => done({ playerId: team.captainPlayerId })}>The captain, {team.captainName}</button>
      )}
      <form className="field" onSubmit={(e) => { e.preventDefault(); if (contact.trim()) done({ contact: contact.trim() }); }}>
        <label htmlFor="bidder-contact">Someone else, by email or mobile number</label>
        <div className="row">
          <input id="bidder-contact" className="input grow" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="They need an account" />
          <button className="btn pri" disabled={!contact.trim() || action.busy}>Make bidder</button>
        </div>
      </form>
      <div className="hair" />
      <button className="btn ghost" style={{ alignSelf: "flex-start" }} onClick={() => done({ none: true })}>No bidder: I'll record their bids from the room</button>
    </Dialog>
  );
}

// =====================================================================================
// Running: the console, a bidder's screen, or the board
// =====================================================================================

function Running({ s, sport, act, action, now }) {
  const a = s.actions;
  const lot = s.lot;
  const paused = s.status === "Paused";
  const [bidderFor, setBidderFor] = useState(null);
  const mine = s.me.bidderForTeamId != null ? s.teams.find((t) => t.teamId === s.me.bidderForTeamId) : null;

  const finish = () => {
    if (window.confirm("End the auction now?\n\nPlayers not yet offered this round stay unsold. You can then assign them to teams with room.")) act("AUCTION_FINISH");
  };
  const cancel = () => {
    if (window.confirm("Cancel the auction?\n\nEvery sale is undone and everyone goes back to the pool. The rules and bidders stay, and the bids are kept for the record.")) act("AUCTION_CANCEL");
  };

  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: s.me.isAuctioneer ? "minmax(0, 1.1fr) minmax(0, 1fr) 320px" : "minmax(0, 1.3fr) 340px", alignItems: "start" }}>
        <LotDeck s={s} now={now} act={act} action={action} />

        {s.me.isAuctioneer && (
          <section className="card">
            <div className="between"><h3 className="h3 disp">Bid from the room</h3>{lot && <span className="small muted">Next bid {amount(lot.nextBid)}</span>}</div>
            {s.teams.map((t, i) => (
              <div key={t.teamId} className="stack" style={{ gap: 8 }}>
                {i > 0 && <div className="hair" />}
                <div className="between">
                  <div className="stack">
                    <b>{t.name} {t.isHighest && <span className="chip acc" style={{ height: 22, fontSize: 12 }}>Highest</span>}</b>
                    <span className="small muted num">{amount(t.purseLeft)} left · up to {amount(t.maxBid)} · {plural(t.players, "player")}</span>
                  </div>
                  {lot && (t.canBid ? (
                    <button className="btn pri sm" disabled={action.busy} onClick={() => act("AUCTION_BID", { teamId: t.teamId, amount: lot.nextBid })}>Bid {amount(lot.nextBid)}</button>
                  ) : <span className="small muted" style={{ maxWidth: 140, textAlign: "right" }}>{t.cantBidReason}</span>)}
                </div>
                {paused && a.canSetBidders && <button className="btn ghost sm" style={{ alignSelf: "flex-start" }} onClick={() => setBidderFor(t)}>Replace bidder ({t.bidder?.name ?? "none"})</button>}
              </div>
            ))}
            <span className="small muted">Tap the team you heard. Bidders' own phones bid at the same time; the first to reach the server wins.</span>
          </section>
        )}

        <aside className="stack" style={{ gap: 20 }}>
          {mine && lot && <BidderPanel s={s} team={mine} act={act} action={action} />}
          {lot && (
            <section className="card" style={{ gap: 8 }}>
              <h3 className="h3 disp">Bids on {lot.player.name.split(" ")[0]}</h3>
              {lot.bids.length === 0 && <span className="small muted">No bids yet. The first is the base price, {amount(lot.basePrice)}.</span>}
              {lot.bids.map((b, i) => (
                <div key={b.bidId} className={`between small${i === 0 ? " row-in" : ""}`}>
                  <span><b>{b.teamName}</b> <span className="muted">· {b.fromRoom ? "from the room" : "own phone"}</span></span>
                  <span className="num">{amount(b.amount)}</span>
                </div>
              ))}
            </section>
          )}
          {!s.me.isAuctioneer && <Purses s={s} />}
          {s.upNext.length > 0 && (
            <section className="card" style={{ gap: 8 }}>
              <h3 className="h3 disp">Up next</h3>
              {s.upNext.map((u) => (
                <div key={u.lotId} className="between small">
                  <span>{u.name} <span className="muted">· {u.tierName ? `Tier ${u.tierName}` : "No tier"} · {amount(u.basePrice)}</span></span>
                  {a.canOpenNext && <button className="btn ghost sm" onClick={() => act("AUCTION_NEXT", { lotId: u.lotId })}>Open</button>}
                </div>
              ))}
              {s.counts.waiting > s.upNext.length && <span className="small muted">{s.counts.waiting - s.upNext.length} more in this round</span>}
            </section>
          )}
          {s.me.isAuctioneer && (
            <section className="card" style={{ gap: 10 }}>
              {a.canFinish && <button className="btn sec" onClick={finish}>End the auction</button>}
              {a.canCancel && <button className="btn danger" onClick={cancel}>Cancel the auction</button>}
            </section>
          )}
          {a.canTakeOver && <button className="btn dark" onClick={() => window.confirm(`Run the auction yourself? ${s.auctioneer?.name ?? "The auctioneer"} stops running it.`) && act("AUCTION_TAKE_OVER")}>Take over the auction</button>}
        </aside>
      </div>
      {s.me.isAuctioneer && <Purses s={s} wide />}
      {bidderFor && <BidderDialog team={bidderFor} sport={sport} act={act} action={action} onClose={() => setBidderFor(null)} />}
    </>
  );
}

/** The player under the hammer, the bid, the clock; the auctioneer's own controls under it. */
function LotDeck({ s, now, act, action }) {
  const a = s.actions;
  const lot = s.lot;
  const paused = s.status === "Paused";
  const set = s.settings;

  if (!lot) {
    return (
      <section className="deck" style={{ gap: 16 }}>
        <span className="small dim">Round {s.round} · {plural(s.counts.sold, "player")} sold · {s.counts.waiting} still to come</span>
        <span className="disp" style={{ fontSize: 34, lineHeight: "40px" }}>{paused ? "Paused" : s.counts.waiting > 0 ? "Waiting for the next player" : "Everyone in this round has been offered"}</span>
        {a.canOpenNext && <button className="btn pri xl" onClick={() => act("AUCTION_NEXT", {})} disabled={action.busy}>Next player</button>}
        {a.canResume && <button className="btn pri lg" onClick={() => act("AUCTION_RESUME")}>Resume</button>}
        {a.canPause && <button className="btn dark" onClick={() => act("AUCTION_PAUSE")}>Pause</button>}
      </section>
    );
  }

  const closes = lot.closesAt ? parseUtc(lot.closesAt).getTime() : null;
  const full = (lot.currentBid == null ? set.firstBidSeconds : set.nextBidSeconds) * 1000;
  const leftMs = paused ? (lot.secondsLeftWhenPaused ?? 0) * 1000 : closes ? Math.max(0, closes - now) : null;
  const leading = s.teams.find((t) => t.teamId === lot.currentTeamId);

  return (
    <section className="deck" style={{ gap: 18 }} aria-live="polite">
      <div className="between wrapr">
        <span className="small dim">Round {s.round} · player {lot.number} of {lot.ofTotal}</span>
        <span className="chip dk">{lot.player.tierName ? `Tier ${lot.player.tierName}` : "No tier"} · base {amount(lot.basePrice)}</span>
      </div>
      <div key={lot.lotId} className="row row-in" style={{ gap: 18 }}>
        <span className="av dk" style={{ width: 72, height: 72, borderRadius: 36, fontSize: 24 }}>{initials(lot.player.name)}</span>
        <div className="stack" style={{ minWidth: 0 }}>
          <span className="disp" style={{ fontSize: 40, lineHeight: "44px", overflowWrap: "anywhere" }}>{lot.player.name}</span>
          <span className="dim">{lot.player.role ?? " "}</span>
        </div>
      </div>
      <div className="hairdk" />
      <div className="between" style={{ alignItems: "flex-end" }}>
        <div className="stack">
          <span className="small dim">{lot.currentBid == null ? "No bid yet" : "Current bid"}</span>
          <span key={lot.currentBid ?? "none"} className="teko num pop-in" style={{ fontSize: 96, lineHeight: "80px" }}>{amount(lot.currentBid ?? lot.basePrice)}</span>
          <span className="body">{leading ? <>by <b className="gold">{leading.name}</b></> : `${set.unit} · the first bid is the base price`}</span>
        </div>
        {leftMs != null && (
          <div className="stack" style={{ alignItems: "flex-end" }}>
            <span className="teko num" style={{ fontSize: 56, lineHeight: "48px", color: leftMs <= 3000 && !paused ? "#ffb4b3" : undefined }}>{Math.ceil(leftMs / 1000)}s</span>
            <span className="small dim">{paused ? "paused" : "clock"}</span>
          </div>
        )}
      </div>
      {leftMs != null && <div className="bar" aria-hidden="true"><i style={{ transform: `scaleX(${Math.min(1, leftMs / full)})` }} /></div>}
      {s.me.isAuctioneer && (
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {a.canSell ? <button className="btn pri lg" onClick={() => act("AUCTION_SELL")} disabled={action.busy}>Sold to {lot.currentTeamName}</button>
            : <button className="btn dark lg" onClick={() => act("AUCTION_UNSOLD")} disabled={!a.canMarkUnsold || action.busy}>Unsold</button>}
          {a.canSell ? <button className="btn dark lg" disabled>Unsold</button> : <span />}
          <button className="btn dark" onClick={() => act("AUCTION_UNDO_BID")} disabled={!a.canUndoBid || action.busy}>Undo last bid</button>
          {a.canResume ? <button className="btn pri" onClick={() => act("AUCTION_RESUME")}>Resume</button>
            : <button className="btn dark" onClick={() => act("AUCTION_PAUSE")} disabled={!a.canPause}>Pause</button>}
        </div>
      )}
    </section>
  );
}

/** A team's bidder: one big button with the exact next amount, and jumps of a few steps. */
function BidderPanel({ s, team, act, action }) {
  const lot = s.lot;
  const bid = (amountToBid) => act("AUCTION_BID", { teamId: team.teamId, amount: amountToBid });
  const canJump = (n) => team.canBid && n <= team.maxBid;
  return (
    <section className="card">
      <div className="between"><h3 className="h3 disp">You bid for {team.name}</h3><span className="small muted num">{amount(team.purseLeft)} left</span></div>
      {team.isHighest ? (
        <button className="btn sec xl" disabled>You're highest</button>
      ) : (
        <button className="btn pri xl" onClick={() => bid(lot.nextBid)} disabled={!team.canBid || action.busy || s.status === "Paused"}>Bid {amount(lot.nextBid)}</button>
      )}
      <div className="row">
        <button className="btn sec grow" onClick={() => bid(lot.twoStepsBid)} disabled={!canJump(lot.twoStepsBid) || team.isHighest || action.busy || s.status === "Paused"}>{amount(lot.twoStepsBid)}</button>
        <button className="btn sec grow" onClick={() => bid(lot.fiveStepsBid)} disabled={!canJump(lot.fiveStepsBid) || team.isHighest || action.busy || s.status === "Paused"}>{amount(lot.fiveStepsBid)}</button>
      </div>
      <span className="small muted">{team.canBid || team.isHighest ? `You can bid up to ${amount(team.maxBid)}, keeping enough for a squad of ${s.settings.minSquad}.` : team.cantBidReason}</span>
    </section>
  );
}

function Purses({ s, wide }) {
  const set = s.settings;
  return (
    <section className={wide ? "deck" : "card"} style={{ gap: 10 }}>
      <h3 className="h3 disp">Purses</h3>
      <div className="grid" style={{ gridTemplateColumns: wide ? "repeat(auto-fit, minmax(180px, 1fr))" : "1fr", gap: wide ? 14 : 8 }}>
        {s.teams.map((t) => (
          <div key={t.teamId} className={wide ? `tile${t.isHighest ? " lit" : ""}` : "between small"}>
            {wide ? (
              <>
                <div className="between"><b>{t.name}</b>{t.isHighest && <span className="small gold" style={{ fontWeight: 700 }}>HIGHEST</span>}</div>
                <span className="teko num" style={{ fontSize: 34, lineHeight: "30px" }}>{amount(t.purseLeft)}</span>
                <span className="small dim">{set.unit} left · {t.players} of {set.minSquad}–{set.maxSquad}</span>
              </>
            ) : (
              <>
                <span><b>{t.name}</b> <span className="muted">· {t.players} of {set.minSquad}–{set.maxSquad}</span></span>
                <span className="num">{amount(t.purseLeft)}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function SoldCard({ last, s }) {
  const team = s.teams.find((t) => t.teamId === last.teamId);
  return (
    <div role="status" style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 40, padding: 16 }}>
      <section className="stamp" style={{ width: "min(620px, 100%)", borderRadius: 24, padding: "36px 40px", textAlign: "center", display: "flex", flexDirection: "column", gap: 14, alignItems: "center",
        background: last.sold ? "linear-gradient(180deg, color-mix(in srgb, var(--acc) 30%, var(--deck)), var(--deck))" : "var(--deck)",
        border: `3px solid ${last.sold ? "var(--acc)" : "rgba(247,245,239,.3)"}`, boxShadow: "0 30px 120px rgba(0,0,0,.5)" }}>
        <div className="disp" style={{ fontSize: 88, lineHeight: "84px", color: last.sold ? "var(--acc)" : "#F7F5EF" }}>{last.sold ? "Sold" : "Unsold"}</div>
        <div className="disp" style={{ fontSize: 38, lineHeight: "42px" }}>{last.playerName}</div>
        {last.sold && (
          <div style={{ fontSize: 22 }}>
            <span className="dim">to</span> <b className="gold">{last.teamName}</b> <span className="dim">for</span> <span className="teko num" style={{ fontSize: 40 }}>{amount(last.price)}</span> <span className="dim">{s.settings.unit}</span>
          </div>
        )}
        {team && <span className="small dim">{team.name}: {amount(team.purseLeft)} {s.settings.unit} left · {team.players} of {s.settings.minSquad}–{s.settings.maxSquad} players</span>}
      </section>
    </div>
  );
}

// =====================================================================================
// After the rounds: results, assigning, fill the gaps, move / swap, confirm
// =====================================================================================

function Results({ s, sport, act, action, tournamentId }) {
  const a = s.actions;
  const set = s.settings;
  const sales = s.sales ?? [];
  const unsold = s.unsold ?? [];
  const roundOver = s.status === "RoundOver";
  const confirmed = s.status === "Confirmed";
  const [roundOpen, setRoundOpen] = useState(false);
  const [filling, setFilling] = useState(false);
  const [moving, setMoving] = useState(null);
  const short = s.teams.filter((t) => t.needs > 0 && !t.isFull);

  const confirmTeams = () => {
    if (window.confirm(`Confirm the teams?\n\nEvery sale becomes a place in its team's squad${unsold.length ? `; ${plural(unsold.length, "player")} left unsold get no team` : ""}. The auction can't be changed afterwards.`)) act("AUCTION_CONFIRM");
  };
  const finish = () => window.confirm(`End the auction?\n\n${plural(unsold.length, "player")} stay unsold. You can then assign them to teams with room.`) && act("AUCTION_FINISH");
  const cancel = () => window.confirm("Cancel the auction?\n\nEvery sale is undone and everyone goes back to the pool. The rules and bidders stay, and the bids are kept for the record.") && act("AUCTION_CANCEL");
  const undo = (sale) => {
    const team = s.teams.find((t) => t.teamId === sale.teamId);
    if (window.confirm(`Undo ${sale.name}'s ${sale.assigned ? "assignment" : "sale"}?\n\n${team?.name ?? "The team"} get ${amount(sale.price)} ${set.unit} back, and ${sale.name} is unsold again.`))
      act("AUCTION_UNDO_SALE", { lotId: sale.lotId });
  };

  return (
    <>
      <section className="card" style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
        <div className="stack grow" style={{ gap: 4, minWidth: 240 }}>
          <h3 className="h3 disp">{roundOver ? `Round ${s.round} is over` : `${s.counts.sold} sold · ${s.counts.unsold} unsold · ${plural(s.round, "round")}`}</h3>
          <span className="small muted">
            {roundOver
              ? s.me.isAuctioneer ? "Give the unsold another round, or end the auction and assign them by hand." : "The auctioneer is deciding what happens to the unsold players."
              : confirmed ? "The squads are made: changes are now done on the teams, as usual."
                : a.confirmProblem ?? (s.me.isAuctioneer ? "Assign the unsold players, move anyone, then confirm." : "The auctioneer is checking the squads before confirming the teams.")}
          </span>
        </div>
        {a.canCancel && <button className="btn danger" onClick={cancel}>Cancel auction</button>}
        {roundOver && a.canStartRound && <button className={`btn ${set.unsoldPlan === "AnotherRound" ? "pri" : "sec"}`} onClick={() => setRoundOpen(true)}>Another round for the unsold</button>}
        {roundOver && a.canFinish && <button className={`btn ${set.unsoldPlan === "AnotherRound" ? "sec" : "pri"}`} onClick={finish}>End and assign by hand</button>}
        {s.status === "Finished" && s.me.isAuctioneer && <button className="btn pri lg" onClick={confirmTeams} disabled={!a.canConfirm || action.busy}>Confirm teams</button>}
      </section>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
        {s.teams.map((t) => {
          const bought = sales.filter((x) => x.teamId === t.teamId);
          return (
            <section key={t.teamId} className="card" style={{ gap: 10 }}>
              <div className="between"><h3 className="h3 disp">{t.name}</h3><span className={`chip${t.needs > 0 ? " warn" : ""}`}>{plural(t.players, "player")}</span></div>
              <span className="small muted num">{amount(t.purseLeft)} {set.unit} left of {amount(set.purse)}{t.needs > 0 ? ` · needs ${t.needs}` : ""}</span>
              <div className="hair" />
              {bought.length === 0 && <span className="small muted">Nobody bought{t.players > 0 ? " — only the players already in the team" : ""}.</span>}
              {bought.map((x) => (
                <div key={x.lotId} className="between small">
                  <span className="stack" style={{ minWidth: 0 }}>
                    <span>{x.name}</span>
                    <span className="muted" style={{ fontSize: 12, color: x.movedFromTeamName ? "#8a4b1b" : undefined }}>
                      {x.movedFromTeamName ? `Moved from ${x.movedFromTeamName}` : [x.role, x.tierName && `Tier ${x.tierName}`, x.byDraw ? "drawn" : x.assigned ? "assigned" : x.round > 1 ? `round ${x.round}` : null].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="row" style={{ gap: 4 }}>
                    <span className="num">{amount(x.price)}</span>
                    {a.canMoveSales ? <button className="btn ghost sm" onClick={() => setMoving(x)} aria-label={`Move, swap or undo ${x.name}`}>⇄</button>
                      : a.canUndoSale ? <button className="btn ghost sm" onClick={() => undo(x)} aria-label={`Undo ${x.name}'s sale`}>↶</button> : null}
                  </span>
                </div>
              ))}
            </section>
          );
        })}
      </div>

      {unsold.length > 0 && (
        <section className="card">
          <div className="between wrapr">
            <h3 className="h3 disp">Unsold · {unsold.length}</h3>
            {a.canFill && <button className="btn sec" onClick={() => setFilling(true)}>Fill the gaps by draw</button>}
          </div>
          {s.status === "Finished" && short.length > 0 && (
            <span className="small warn">{short.map((t) => `${t.name} need ${t.needs}`).join(" · ")}. Give them unsold players, one by one below or all at once by draw.</span>
          )}
          <div className="scroll">
            <table>
              <thead><tr><th>Player</th><th>Tier</th><th>Base price</th>{a.canAssign && <><th>Assign to</th><th>Price</th><th /></>}</tr></thead>
              <tbody>
                {unsold.map((u) => <UnsoldRow key={u.poolPlayerId} u={u} s={s} act={act} action={action} />)}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {roundOpen && <RoundDialog s={s} sport={sport} act={act} action={action} onClose={() => setRoundOpen(false)} />}
      {filling && <FillDialog tournamentId={tournamentId} s={s} sport={sport} act={act} action={action} onClose={() => setFilling(false)} />}
      {moving && <SaleDialog s={s} sale={moving} sport={sport} act={act} action={action} onUndo={() => { setMoving(null); undo(moving); }} onClose={() => setMoving(null)} />}
    </>
  );
}

function UnsoldRow({ u, s, act, action }) {
  const a = s.actions;
  const teams = [...s.teams].sort((x, y) => Number(y.needs > 0) - Number(x.needs > 0) || y.purseLeft - x.purseLeft);
  const [teamId, setTeamId] = useState("");
  const [price, setPrice] = useState(String(u.basePrice));
  const team = s.teams.find((t) => t.teamId === Number(teamId));
  const value = Number(price || 0);
  const problem = value > u.basePrice ? `At most the base price, ${amount(u.basePrice)}` : team && value > team.purseLeft ? `${team.name} has ${amount(team.purseLeft)} left` : null;
  return (
    <tr>
      <td><b>{u.name}</b>{u.role && <span className="muted small"> · {u.role}</span>}</td>
      <td>{u.tierName ?? "No tier"}</td>
      <td className="num">{amount(u.basePrice)}</td>
      {a.canAssign && (
        <>
          <td>
            <select className="input" style={{ minHeight: 34 }} value={teamId} aria-label={`Team for ${u.name}`}
              onChange={(e) => {
                setTeamId(e.target.value);
                const t = s.teams.find((x) => x.teamId === Number(e.target.value));
                if (t && t.purseLeft < value) setPrice(String(Math.max(0, Math.min(u.basePrice, t.purseLeft))));
              }}>
              <option value="">Choose a team</option>
              {teams.map((t) => (
                <option key={t.teamId} value={t.teamId} disabled={t.isFull}>
                  {t.name} · {t.isFull ? "full" : t.needs > 0 ? `need ${t.needs}` : `${amount(t.purseLeft)} left`}
                </option>
              ))}
            </select>
          </td>
          <td>
            <input className="input num" style={{ width: 90, minHeight: 34 }} value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} aria-label={`Price for ${u.name}`} />
            {problem && <div className="small warn">{problem}</div>}
          </td>
          <td><button className="btn pri sm" disabled={!team || !!problem || action.busy} onClick={() => act("AUCTION_ASSIGN", { poolPlayerId: u.poolPlayerId, teamId: team.teamId, price: value })}>Assign</button></td>
        </>
      )}
    </tr>
  );
}

/** The next round's base price per tier: the same as before or lower (D-7). */
function RoundDialog({ s, sport, act, action, onClose }) {
  const unsold = s.unsold ?? [];
  const groups = [...new Map(unsold.map((u) => [u.tierId ?? 0, u])).values()].map((u) => {
    const inTier = unsold.filter((x) => (x.tierId ?? 0) === (u.tierId ?? 0));
    return { tierId: u.tierId, name: u.tierName ?? "No tier", count: inTier.length, was: Math.max(...inTier.map((x) => x.basePrice)) };
  });
  const [prices, setPrices] = useState(() => Object.fromEntries(groups.map((g) => [String(g.tierId ?? 0), String(g.was)])));
  const tooHigh = groups.some((g) => Number(prices[String(g.tierId ?? 0)] || 0) > g.was);
  const start = async () => {
    if (await act("AUCTION_ROUND_START", { prices: groups.map((g) => ({ tierId: g.tierId, price: Number(prices[String(g.tierId ?? 0)] || 0) })) })) onClose();
  };
  return (
    <Dialog id="round-title" title={`Round ${s.round + 1}`} sport={sport} onClose={onClose}>
      <span className="small muted">{plural(unsold.length, "unsold player")} go again. A base price can stay the same or go down, never up.</span>
      <Banner message={action.error} />
      {groups.map((g) => (
        <div key={g.tierId ?? 0} className="between">
          <span><b>{g.name}</b> <span className="small muted">· {g.count} · was {amount(g.was)}</span></span>
          <input className="input num" style={{ width: 110 }} aria-label={`${g.name} base price`} value={prices[String(g.tierId ?? 0)]}
            onChange={(e) => setPrices((p) => ({ ...p, [String(g.tierId ?? 0)]: e.target.value.replace(/\D/g, "") }))} />
        </div>
      ))}
      {tooHigh && <span className="small warn">A later round can't raise a base price.</span>}
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn pri" onClick={start} disabled={tooHigh || action.busy}>Start round {s.round + 1}</button>
      </div>
    </Dialog>
  );
}

/** "Fill the gaps by draw" (plan 9.7): the server's preview, then the fill, which draws who goes where. */
function FillDialog({ tournamentId, s, sport, act, action, onClose }) {
  const load = useCallback(() => getFillPreview(tournamentId), [tournamentId]);
  const preview = useLiveState(load, { ms: 60_000 });
  const p = preview.data;
  const fill = async () => {
    if (await act("AUCTION_FILL")) onClose();
  };
  return (
    <Dialog id="fill-title" title="Fill the gaps by draw" sport={sport} onClose={onClose}>
      <span className="small muted">To the teams short of {s.settings.minSquad}, by the draw's rule: the team with the fewest players next, a player from the top tier left.</span>
      <Banner message={action.error ?? preview.error} />
      {p ? (
        <>
          <b className="body">{p.line}</b>
          {p.teams.map((t) => (
            <div key={t.teamId} className="between body">
              <b>{t.name}</b>
              <span className="row num"><span className="muted small">{t.has} → {t.has + t.gets}</span><b className="gold" style={{ color: t.gets ? "var(--s1)" : "#6b675b", width: 48, textAlign: "right" }}>{t.gets ? `+${t.gets}` : "none"}</b></span>
            </div>
          ))}
          <span className="small muted">{p.note}</span>
        </>
      ) : !preview.error && <span className="small muted">Working it out…</span>}
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn pri" onClick={fill} disabled={!p || p.teams.every((t) => t.gets === 0) || action.busy}>Draw them in</button>
      </div>
    </Dialog>
  );
}

/** A bought player after the auction (E-4): move (their price goes with them, or less) or swap (both keep theirs), or undo. */
function SaleDialog({ s, sale, sport, act, action, onUndo, onClose }) {
  const unit = s.settings.unit;
  const [mode, setMode] = useState("move");
  const [teamId, setTeamId] = useState(null);
  const [other, setOther] = useState(null);
  const [price, setPrice] = useState(String(sale.price));
  const from = s.teams.find((t) => t.teamId === sale.teamId);
  const team = s.teams.find((t) => t.teamId === teamId);
  const value = Number(price || 0);
  const otherSale = (s.sales ?? []).find((x) => x.lotId === other);
  const problem = value > sale.price ? `At most what they went for, ${amount(sale.price)}` : team && value > team.purseLeft ? `${team.name} has ${amount(team.purseLeft)} ${unit} left` : null;
  const save = async () => {
    const done = mode === "move"
      ? await act("AUCTION_MOVE", { lotId: sale.lotId, teamId, price: value })
      : await act("AUCTION_SWAP", { lotId: sale.lotId, otherLotId: other });
    if (done) onClose();
  };
  return (
    <Dialog id="sale-title" title={`${sale.name} · ${from?.name ?? ""}`} sport={sport} onClose={onClose}>
      <span className="small muted">Bought for {amount(sale.price)} {unit}.</span>
      <Banner message={action.error} />
      <Seg label="Move or swap" value={mode} onChange={setMode} options={[{ key: "move", label: "Move to" }, { key: "swap", label: "Swap with" }]} />
      <div className="stack" role="radiogroup" style={{ gap: 8, maxHeight: 300, overflowY: "auto" }}>
        {mode === "move"
          ? s.teams.filter((t) => t.teamId !== sale.teamId).map((t) => (
              <Opt key={t.teamId} on={t.teamId === teamId} disabled={t.isFull}
                onPick={() => { setTeamId(t.teamId); if (t.purseLeft < value) setPrice(String(Math.max(0, Math.min(sale.price, t.purseLeft)))); }}
                title={t.name} detail={t.isFull ? "Squad full" : `${amount(t.purseLeft)} ${unit} left · ${plural(t.players, "player")}`} />
            ))
          : (s.sales ?? []).filter((x) => x.teamId !== sale.teamId).map((x) => (
              <Opt key={x.lotId} on={x.lotId === other} onPick={() => setOther(x.lotId)} title={x.name} detail={`${s.teams.find((t) => t.teamId === x.teamId)?.name ?? ""} · ${amount(x.price)} ${unit}`} />
            ))}
      </div>
      {mode === "move" && (
        <div className="field">
          <label htmlFor="move-price">They pay ({unit})</label>
          <input id="move-price" className="input num" style={{ width: 140 }} value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} />
          <span className={`small ${problem ? "warn" : "muted"}`}>{problem ?? `${from?.name ?? "The team"} get it back. Lower it, down to 0, if the new team can't afford it.`}</span>
        </div>
      )}
      <div className="row" style={{ justifyContent: "space-between" }}>
        <button className="btn ghost" onClick={onUndo}>Undo sale</button>
        <button className="btn pri" onClick={save} disabled={action.busy || (mode === "move" ? !team || !!problem : !otherSale)}>
          {mode === "move" ? (team ? `Move to ${team.name}` : "Pick a team") : otherSale ? `Swap with ${otherSale.name}` : "Pick a player"}
        </button>
      </div>
    </Dialog>
  );
}
