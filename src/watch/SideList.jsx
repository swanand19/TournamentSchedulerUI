import { font } from "../theme";
import PlayerName from "../PlayerName";
import { BallIcon, CardIcon, SwapIcon } from "../icons";

// One side on a team sheet: the squad before the start, the XI or starting line-up after, then the
// bench. Football rows carry what happened to the player; cricket rows the batting order and C / WK.
// Names open profiles (through PlayerName's context).

function Mark({ t, kind, minute }) {
  const glyph =
    kind === "Goal" ? <BallIcon size={13} />
    : kind === "YellowCard" ? <CardIcon size={13} color={t.yellowCard} />
    : kind === "RedCard" ? <CardIcon size={13} color={t.dangerSolid} />
    : <SwapIcon size={13} style={{ color: kind === "SubbedOn" ? t.successInk : t.muted }} />;
  const label = { Goal: "Goal", YellowCard: "Yellow card", RedCard: "Red card", SubbedOn: "On", SubbedOff: "Off" }[kind];
  return (
    <span title={`${label} ${minute}`} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, color: t.muted }}>
      {glyph}
      {kind === "SubbedOn" ? "on " : kind === "SubbedOff" ? "off " : ""}
      {minute}
    </span>
  );
}

function Row({ t, player, sport, bench, first }) {
  // Cricket numbers the XI by batting order; before the toss (no order yet) the shirt number shows.
  const number = sport === "cricket" && player.battingOrder != null ? (bench ? null : player.battingOrder) : player.jerseyNumber;
  const tags = [player.isCaptain && "C", player.isWicketKeeper && "WK"].filter(Boolean);
  return (
    <li style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 48, padding: "6px 16px", borderTop: first ? "none" : `1px solid rgba(var(--fg-rgb), 0.08)` }}>
      <span className="num" style={{ width: 28, textAlign: "center", fontFamily: font.display, fontSize: 18, color: bench ? t.muted : t.deep }}>
        {number ?? "–"}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>
          <PlayerName playerId={player.playerId}>{player.name}</PlayerName>
        </span>
        {tags.map((x) => (
          <span key={x} style={{ marginInlineStart: 6, background: t.tint, color: t.deep, borderRadius: 4, padding: "0 5px", fontSize: 11, fontWeight: 700 }}>
            {x}
          </span>
        ))}
        {player.role && <span style={{ display: "block", fontSize: 12, color: t.muted }}>{player.role}</span>}
      </span>
      {player.marks.length > 0 && (
        <span style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end", maxWidth: 160 }}>
          {player.marks.map((m, i) => <Mark key={i} t={t} kind={m.kind} minute={m.minute} />)}
        </span>
      )}
    </li>
  );
}

export default function SideList({ theme: t, side, sport }) {
  return (
    <section style={{ background: t.cream, color: t.ink, borderRadius: 14, overflow: "hidden", borderBottom: `2px solid ${t.deck}` }}>
      <header style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: "1px solid rgba(var(--fg-rgb), 0.1)" }}>
        <h3 style={{ margin: 0, flex: 1, fontFamily: font.display, fontWeight: 400, fontSize: 22, color: t.deep }}>{side.name}</h3>
        <span style={{ fontSize: 12, fontWeight: 600, color: t.muted }}>{side.heading}</span>
      </header>
      {side.players.length === 0 ? (
        <p style={{ margin: 0, padding: 16, fontSize: 14, color: t.muted }}>{side.name} hasn't added players yet.</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {side.players.map((p, i) => <Row key={p.playerId} t={t} player={p} sport={sport} first={i === 0} />)}
        </ul>
      )}
      {side.bench.length > 0 && (
        <>
          <div style={{ background: "var(--chip)", padding: "4px 16px", fontSize: 12, fontWeight: 600, color: t.muted }}>
            {sport === "cricket" ? "Also in the squad" : "Bench"}
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {side.bench.map((p, i) => <Row key={p.playerId} t={t} player={p} sport={sport} bench first={i === 0} />)}
          </ul>
        </>
      )}
    </section>
  );
}
