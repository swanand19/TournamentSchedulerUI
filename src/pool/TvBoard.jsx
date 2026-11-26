import { useCallback, useEffect, useState } from "react";
import { parseUtc } from "../footballClock";
import { getPublicTournament } from "../api/publicApi";
import { getPublicAuction, getPublicDraw } from "../api/poolApi";
import { syncDocumentSport } from "../theme";
import { Reel } from "./parts";
import { amount, initials, plural, sportClass, useLiveState, useServerNow } from "./poolLib";
import "./pool.css";

// The board for a big screen in the hall (plan 4.7, designs "TV · …" on the canvas): a public
// tournament's auction or team draw, readable from the back of the room. /live/<code>/tv, no sign-in,
// no buttons. Public pages have no live line, so it polls: quickly whatever is running, slowly the
// other. It follows the server's clock, so its countdown and its names land with everyone's phones.

const RUNNING_AUCTION = ["Live", "Paused", "RoundOver", "Finished"];

export default function TvBoard({ code }) {
  const [tournament, setTournament] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    getPublicTournament(code).then(
      (t) => {
        setTournament(t);
        document.title = `${t.name} · TV board`;
        syncDocumentSport(t.sport);
      },
      (e) => setError(e.message)
    );
  }, [code]);

  const loadAuction = useCallback(() => getPublicAuction(code), [code]);
  const loadDraw = useCallback(() => getPublicDraw(code), [code]);
  const [fast, setFast] = useState("auction");
  const auction = useLiveState(loadAuction, { ms: fast === "auction" ? 1500 : 10000, enabled: !!tournament });
  const draw = useLiveState(loadDraw, { ms: fast === "draw" ? 1500 : 10000, enabled: !!tournament });

  const drawLive = draw.data?.status === "Live";
  const auctionLive = RUNNING_AUCTION.includes(auction.data?.status);
  const showing = drawLive ? "draw" : auctionLive ? "auction" : null;
  // Poll quickly whichever is on (a draw wins: a tournament fills its teams one way).
  if (showing && showing !== fast) setFast(showing);

  const offset = (showing === "draw" ? draw : auction).offset;
  const now = useServerNow(offset, !!showing, 200);

  const sport = tournament?.sport;
  if (error) return <div className={`tvb ${sportClass(sport)}`} style={{ alignItems: "center", justifyContent: "center" }}><span className="disp" style={{ fontSize: "3vw" }}>{error}</span></div>;
  if (!tournament) return <div className={`tvb ${sportClass(sport)}`} />;

  return (
    <div className={`tvb ${sportClass(sport)}`}>
      {showing === "draw" ? (
        <DrawBoard t={tournament} d={draw.data} now={now} reload={draw.reload} offset={draw.offset} />
      ) : showing === "auction" ? (
        <AuctionBoard t={tournament} s={auction.data} now={now} />
      ) : (
        <Idle t={tournament} auction={auction.data} draw={draw.data} />
      )}
    </div>
  );
}

function Top({ t, what, count, live = true }) {
  return (
    <div className="between">
      <div className="row" style={{ display: "flex", alignItems: "center", gap: "1.2vw", minWidth: 0 }}>
        <h1 className="disp ellipsis" style={{ margin: 0, fontSize: "2.3vw", lineHeight: "2.7vw" }}>{t.name}</h1>
        <span className="lab">{what}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "1.2vw" }}>
        {count && <span className="soft num">{count}</span>}
        {live && <span className="tvlive"><i />Live</span>}
      </div>
    </div>
  );
}

function Idle({ t, auction, draw }) {
  const confirmed = auction?.status === "Confirmed" || draw?.status === "Confirmed";
  return (
    <>
      <Top t={t} what="" live={false} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5vw", textAlign: "center" }}>
        <span className="disp gold" style={{ fontSize: "6vw", lineHeight: "6vw" }}>{confirmed ? "The teams are made" : "Starting soon"}</span>
        <span className="soft" style={{ fontSize: "1.8vw" }}>
          {confirmed ? "Thanks for watching." : "This screen shows the player auction or the team draw as soon as it starts."}
        </span>
      </div>
    </>
  );
}

// ------------------------------------------------------------------------------- the auction

function AuctionBoard({ t, s, now }) {
  const lot = s.lot;
  const set = s.settings;
  const last = s.last;
  const sold = last && now - parseUtc(last.at).getTime() < 5000 ? last : null;
  const counted = s.counts.sold + s.counts.unsold + (lot ? 1 : 0);
  const closes = lot?.closesAt ? parseUtc(lot.closesAt).getTime() : null;
  const full = ((lot?.currentBid == null ? set.firstBidSeconds : set.nextBidSeconds) || 1) * 1000;
  const leftMs = s.status === "Paused" ? (lot?.secondsLeftWhenPaused ?? 0) * 1000 : closes ? Math.max(0, closes - now) : null;
  const round = s.status === "RoundOver" ? `Round ${s.round} is over` : s.status === "Finished" ? "Auction finished" : s.status === "Paused" ? "Paused" : `Round ${s.round}`;

  return (
    <>
      <Top t={t} what={`Player auction · ${round}`} count={`${counted} of ${s.counts.players} players`} live={s.status === "Live"} />
      {sold ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <section className="stamp" style={{ width: "65vw", borderRadius: "1.7vw", padding: "3.3vw 3.8vw", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.4vw", textAlign: "center",
            background: sold.sold ? "linear-gradient(180deg, color-mix(in srgb, var(--acc) 22%, transparent), color-mix(in srgb, var(--acc) 6%, transparent))" : "rgba(var(--fg-rgb), .05)",
            border: `3px solid ${sold.sold ? "var(--acc)" : "rgba(var(--fg-rgb), .25)"}`, boxShadow: sold.sold ? "0 0 6vw color-mix(in srgb, var(--acc) 30%, transparent)" : "none" }}>
            <div className={`disp${sold.sold ? " gold" : ""}`} style={{ fontSize: "10vw", lineHeight: "9.4vw", letterSpacing: ".06em" }}>{sold.sold ? "Sold" : "Unsold"}</div>
            <div className="disp" style={{ fontSize: "4.4vw", lineHeight: "4.4vw" }}>{sold.playerName}</div>
            {sold.sold && (
              <div style={{ fontSize: "2.1vw" }}>
                <span className="soft">to</span> <span className="disp gold" style={{ fontSize: "2.9vw" }}>{sold.teamName}</span> <span className="soft">for</span>{" "}
                <span className="teko num" style={{ fontSize: "3.8vw" }}>{amount(sold.price)}</span> <span className="soft">{set.unit}</span>
              </div>
            )}
          </section>
        </div>
      ) : lot ? (
        <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: "1.7vw", flex: 1, minHeight: 0 }}>
          <section key={lot.lotId} className="panel row-in" style={{ padding: "2.3vw", display: "flex", flexDirection: "column", gap: "1.4vw", minWidth: 0 }}>
            <div className="lab">Under the hammer</div>
            <div style={{ display: "flex", alignItems: "center", gap: "2vw", minWidth: 0 }}>
              <div className="bigav">{initials(lot.player.name)}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: ".7vw", minWidth: 0 }}>
                <div className="disp" style={{ fontSize: "5.4vw", lineHeight: "5.6vw", overflowWrap: "anywhere" }}>{lot.player.name}</div>
                {lot.player.role && <div className="soft" style={{ fontSize: "1.6vw" }}>{lot.player.role}</div>}
                <div style={{ display: "flex", gap: ".7vw", alignItems: "center" }}>
                  {lot.player.tierName && <span style={{ fontSize: "1.25vw", fontWeight: 600, padding: ".4vw .9vw", borderRadius: ".6vw", background: "color-mix(in srgb, var(--acc) 16%, transparent)", color: "var(--acc)" }}>Tier {lot.player.tierName}</span>}
                  <span className="soft" style={{ fontSize: "1.25vw" }}>Base price {amount(lot.basePrice)}</span>
                </div>
              </div>
            </div>
          </section>
          <section style={{ display: "flex", flexDirection: "column", gap: "1vw", minHeight: 0, minWidth: 0 }}>
            <div className="panel" style={{ padding: "1.4vw 2vw", display: "flex", flexDirection: "column", gap: ".2vw", minWidth: 0 }}>
              <div className="lab">{lot.currentBid == null ? "Opening bid" : "Current bid"}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: ".9vw" }}>
                <span key={lot.currentBid ?? "base"} className="teko num pop-in" style={{ fontSize: "8.4vw", lineHeight: "7.4vw" }}>{amount(lot.currentBid ?? lot.basePrice)}</span>
                <span className="soft" style={{ fontSize: "2vw", fontWeight: 600 }}>{set.unit}</span>
              </div>
              <div className="ellipsis" style={{ fontSize: "1.8vw", fontWeight: 600 }}>
                {lot.currentTeamName ? <><span className="soft" style={{ fontWeight: 500 }}>by </span><span className="disp gold" style={{ fontSize: "2.6vw" }}>{lot.currentTeamName}</span></> : <span className="soft" style={{ fontWeight: 500 }}>No bid yet</span>}
              </div>
            </div>
            {leftMs != null && (
              <div className="panel" style={{ padding: "1.1vw 2vw", display: "flex", flexDirection: "column", gap: ".6vw" }}>
                <div className="between"><span className="lab">{s.status === "Paused" ? "Paused" : "Going in"}</span><span className="teko num" style={{ fontSize: "4.2vw", lineHeight: "3.4vw", color: leftMs <= 3000 && s.status !== "Paused" ? "var(--danger-ink)" : undefined }}>{Math.ceil(leftMs / 1000)}s</span></div>
                <div className="bar"><i style={{ transform: `scaleX(${Math.min(1, leftMs / full)})` }} /></div>
                <div className="soft" style={{ fontSize: "1.25vw" }}>Next bid {amount(lot.nextBid)}</div>
              </div>
            )}
            <div className="panel" style={{ padding: "1.1vw 2vw", flex: 1, display: "flex", flexDirection: "column", gap: ".5vw", minHeight: 0, overflow: "hidden" }}>
              <div className="lab">Bids</div>
              {lot.bids.length === 0 && <span className="soft" style={{ fontSize: "1.35vw" }}>The first bid is the base price.</span>}
              {lot.bids.slice(0, 4).map((b, i) => (
                <div key={b.bidId} className="between" style={{ fontSize: "1.35vw", fontWeight: i === 0 ? 700 : 400 }}>
                  <span className={`ellipsis ${i === 0 ? "gold" : "soft"}`}>{b.teamName}</span><span className="num">{amount(b.amount)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1vw" }}>
          <span className="disp" style={{ fontSize: "4.5vw" }}>{s.status === "Live" ? "Next player coming up" : round}</span>
          {s.upNext[0] && s.status === "Live" && <span className="soft" style={{ fontSize: "1.8vw" }}>Up next: {s.upNext.map((u) => u.name).join(", ")}</span>}
        </div>
      )}
      <Teams s={s} />
    </>
  );
}

function Teams({ s }) {
  const set = s.settings;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(s.teams.length, 6)}, minmax(0, 1fr))`, gap: "1.25vw" }}>
      {s.teams.map((t) => (
        <div key={t.teamId} className={`tile${t.isHighest ? " lit" : ""}`}>
          <div className="between"><span className="disp ellipsis" style={{ fontSize: "2vw" }}>{t.name}</span>{t.isHighest && <span className="gold" style={{ fontSize: "1vw", fontWeight: 700 }}>Highest</span>}</div>
          <div className="between"><span className="teko num" style={{ fontSize: "3.3vw", lineHeight: "2.9vw" }}>{amount(t.purseLeft)}</span><span className="soft" style={{ fontSize: "1.15vw" }}>{t.players} of {set.minSquad}–{set.maxSquad}</span></div>
          <div className="soft" style={{ fontSize: "1vw" }}>{set.unit} left</div>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------------------- the draw

function DrawBoard({ t, d, now, reload, offset }) {
  const spin = d.spin;
  const last = d.last;
  const fresh = !spin && last && now - parseUtc(last.landedAt).getTime() < 6000;
  const landsAt = spin ? parseUtc(spin.landsAt).getTime() : null;
  const lit = spin?.teamId ?? (fresh ? last.teamId : d.nextTeamId);
  const next = d.teams.find((x) => x.teamId === lit);

  useEffect(() => {
    if (!landsAt) return undefined;
    const timer = setTimeout(reload, Math.max(0, landsAt - (Date.now() + offset)) + 150);
    return () => clearTimeout(timer);
  }, [landsAt, reload, offset]);

  return (
    <>
      <Top t={t} what="Team draw" count={`${d.counts.drawn} of ${d.counts.players} drawn`} />
      <div style={{ display: "grid", gridTemplateColumns: d.pot ? "20vw minmax(0, 1fr)" : "minmax(0, 1fr)", gap: "1.7vw", flex: 1, minHeight: 0 }}>
        {d.pot && (
          <section className="panel" style={{ padding: "1.6vw", display: "flex", flexDirection: "column", gap: ".7vw", minHeight: 0, overflow: "hidden" }}>
            <div className="lab">Pot · {d.pot.name}</div>
            <div className="soft" style={{ fontSize: "1.15vw" }}>{d.pot.players.length} in the pot</div>
            {d.pot.players.slice(0, 9).map((p) => (
              <div key={p.poolPlayerId} className="ellipsis" style={{ fontSize: "1.35vw", padding: ".6vw .9vw", borderRadius: ".6vw", background: "rgba(var(--fg-rgb), .06)" }}>{p.name}</div>
            ))}
            {d.pot.players.length > 9 && <div className="soft" style={{ fontSize: "1.1vw" }}>and {d.pot.players.length - 9} more</div>}
            {d.pot.nextName && <div className="soft" style={{ fontSize: "1.05vw", marginTop: "auto" }}>Then {d.pot.nextName}: {d.pot.nextCount} players</div>}
          </section>
        )}
        <section style={{ display: "flex", flexDirection: "column", gap: "1.5vw", minHeight: 0, minWidth: 0 }}>
          <div className="panel" style={{ padding: "1.8vw 2.3vw", display: "flex", alignItems: "center", gap: "2.3vw" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: ".4vw", width: "22vw", flex: "none", minWidth: 0 }}>
              <div className="lab">{spin ? "Drawing for" : fresh ? "Drawn for" : "Next to draw"}</div>
              <div className="disp gold ellipsis" style={{ fontSize: "5.7vw", lineHeight: "5.9vw" }}>{next?.name ?? "—"}</div>
              {next && <div className="soft" style={{ fontSize: "1.25vw" }}>{plural(next.players, "player")}</div>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {spin ? (
                <Reel names={spin.names} startsAt={parseUtc(spin.pickedAt).getTime()} landsAt={landsAt} now={now} row={Math.round(window.innerWidth * 0.104)} fontSize={Math.round(window.innerWidth * 0.045)} />
              ) : (
                <div className="reel" style={{ height: "10.4vw", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                  {fresh ? (
                    <>
                      <span className="disp landed" style={{ fontSize: "4.5vw", lineHeight: "4.8vw", textAlign: "center" }}>{last.name}</span>
                      {(last.role || last.tierName) && <span className="soft" style={{ fontSize: "1.25vw" }}>{[last.role, last.tierName && `Tier ${last.tierName}`].filter(Boolean).join(" · ")}</span>}
                    </>
                  ) : (
                    <span className="soft" style={{ fontSize: "1.6vw" }}>Waiting for the next name</span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(d.teams.length, 6)}, minmax(0, 1fr))`, gap: "1.25vw", flex: 1, minHeight: 0 }}>
            {d.teams.map((x) => (
              <div key={x.teamId} className={`tile${x.teamId === lit ? " lit" : ""}`} style={{ gap: ".6vw", overflow: "hidden" }}>
                <div className="between"><span className="disp ellipsis" style={{ fontSize: "2vw" }}>{x.name}</span><span key={x.players} className="teko num pop-in" style={{ fontSize: "2.3vw" }}>{x.players}</span></div>
                {x.kept.map((k) => <div key={`k${k}`} className="soft ellipsis" style={{ fontSize: "1.2vw" }}>{k}</div>)}
                {x.drawn.map((p) => <div key={p.pickId} className={`ellipsis${fresh && p.pickId === last.pickId ? " disp gold landed" : ""}`} style={{ fontSize: fresh && p.pickId === last.pickId ? "1.5vw" : "1.25vw" }}>{p.name}</div>)}
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
