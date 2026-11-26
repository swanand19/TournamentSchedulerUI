import { useState } from "react";
import { font } from "../theme";
import ErrorBanner from "../ErrorBanner";
import { BallIcon, CardIcon, SwapIcon, TimerIcon, TrophyIcon, FlagIcon, TargetIcon, MissIcon } from "../icons";

// What happened, newest first, in the server's words — the same grammar as the phone app. An
// ordinary ball is a quiet line, a boundary glows gold, a wicket is a cream card edged in red (red
// only ever means a wicket or a red card), a fifty is a board-lettered panel, and every over ends
// with a rule across the feed so it reads in overs. Football: goals, cards and subs are cards, the
// periods are rules, clock stoppages are quiet lines. Lines that arrive while open drop in.

/** "Patil to Desai, FOUR" → what happened leads, who was involved follows. */
function split(text) {
  const at = text.indexOf(", ");
  return at < 0 ? { what: text, who: null } : { what: text.slice(at + 2), who: text.slice(0, at) };
}

const marker = (t) => ({
  width: 44,
  flexShrink: 0,
  textAlign: "right",
  fontFamily: font.condensed,
  fontSize: 19,
  lineHeight: 1,
  color: t.onDarkMuted,
  fontVariantNumeric: "tabular-nums",
});

function Chip({ t, label, tone }) {
  const background = { quiet: t.surfaceOnDark, extra: t.deckRaised, boundary: t.accent, wicket: t.dangerSolid }[tone];
  return (
    <span
      className="num"
      style={{
        width: 34,
        height: 34,
        flexShrink: 0,
        borderRadius: 17,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background,
        border: `1px solid ${tone === "quiet" ? t.borderOnDark : background}`,
        color: tone === "boundary" ? t.accentInk : t.onDark,
        fontFamily: font.display,
        fontSize: label.length > 2 ? 12 : 16,
      }}
    >
      {label}
    </span>
  );
}

function BallRow({ t, item }) {
  const boundary = item.kind === "Four" || item.kind === "Six";
  const { what, who } = split(item.text);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        minHeight: 48,
        padding: "4px 12px 4px 0",
        borderRadius: 12,
        borderLeft: `3px solid ${boundary ? t.accent : "transparent"}`,
        background: boundary ? t.accentSoft : "transparent",
      }}
    >
      <span style={{ ...marker(t), color: boundary ? t.accent : t.onDarkMuted }}>{item.marker}</span>
      <Chip t={t} label={item.chip ?? "·"} tone={boundary ? "boundary" : item.kind === "Extra" ? "extra" : "quiet"} />
      <div style={{ minWidth: 0 }}>
        <div
          style={
            boundary
              ? { fontFamily: font.display, fontSize: 20, letterSpacing: "0.02em", color: t.accent }
              : { fontWeight: 600, fontSize: 14, color: t.onDark }
          }
        >
          {what}
        </div>
        {who && <div style={{ fontSize: 12, color: t.onDarkMuted }}>{who}</div>}
        {item.detail && <div style={{ fontSize: 12, color: t.accent }}>{item.detail}</div>}
      </div>
    </div>
  );
}

const card = (t, edge) => ({
  display: "flex",
  alignItems: "center",
  gap: 12,
  background: t.cream,
  color: t.ink,
  borderRadius: 12,
  padding: "12px 14px 12px 8px",
  borderLeft: `5px solid ${edge}`,
  borderBottom: `2px solid ${t.deck}`,
});

function WicketCard({ t, item }) {
  const { who } = split(item.text);
  return (
    <div style={card(t, t.dangerSolid)}>
      <span style={{ ...marker(t), color: t.muted }}>{item.marker}</span>
      <Chip t={t} label={item.chip ?? "W"} tone="wicket" />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: font.condensed, fontSize: 18, letterSpacing: "0.12em", color: t.dangerSolid, lineHeight: 1 }}>Wicket</div>
        {item.detail && <div style={{ fontWeight: 600, fontSize: 16 }}>{item.detail}</div>}
        {who && <div style={{ fontSize: 12, color: t.muted }}>{who}</div>}
      </div>
    </div>
  );
}

function Milestone({ t, item }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: t.deck, border: `1.5px solid ${t.accent}`, borderRadius: 12, padding: "12px 14px" }}>
      <span aria-hidden="true" style={{ color: t.accent, fontSize: 20 }}>✦</span>
      <div>
        <div style={{ fontFamily: font.display, fontSize: 20, color: t.accent, letterSpacing: "0.02em" }}>{item.text}</div>
        {item.detail && <div style={{ fontSize: 12, color: t.onDarkMuted }}>{item.detail}</div>}
      </div>
    </div>
  );
}

function Rule({ t, item }) {
  const hair = { flex: 1, minWidth: 16, height: 1, background: t.borderOnDark };
  return (
    <div style={{ padding: "8px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={hair} />
        <span style={{ fontFamily: font.condensed, fontSize: 18, letterSpacing: "0.12em", color: t.onDark, textAlign: "center" }}>
          {item.kind === "Period" && item.marker ? `${item.marker} · ` : ""}
          {item.text}
        </span>
        <span style={hair} />
      </div>
      {item.detail && <div style={{ fontSize: 12, color: t.onDarkMuted, textAlign: "center" }}>{item.detail}</div>}
    </div>
  );
}

function Result({ t, item }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: t.deck, border: `1px solid ${t.accentSoft}`, borderRadius: 16, padding: "16px 18px" }}>
      <TrophyIcon size={22} style={{ color: t.accent }} />
      <div>
        <div style={{ fontFamily: font.display, fontSize: 22, color: t.accent }}>{item.text}</div>
        {item.detail && <div style={{ fontSize: 14, color: t.onDarkMuted }}>{item.detail}</div>}
      </div>
    </div>
  );
}

function EventCard({ t, item }) {
  const looks = {
    Goal: { edge: t.accent, icon: <BallIcon size={16} style={{ color: t.warnInk }} /> },
    YellowCard: { edge: t.yellowCard, icon: <CardIcon size={16} color={t.yellowCard} /> },
    SecondYellow: { edge: t.dangerSolid, icon: <CardIcon size={16} color={t.dangerSolid} /> },
    RedCard: { edge: t.dangerSolid, icon: <CardIcon size={16} color={t.dangerSolid} /> },
    Substitution: { edge: t.successSolid, icon: <SwapIcon size={16} style={{ color: t.successInk }} /> },
  };
  const { edge, icon } = looks[item.kind] ?? looks.Goal;
  return (
    <div style={card(t, edge)}>
      <span className="num" style={{ minWidth: 52, background: t.accent, color: t.accentInk, borderRadius: 8, padding: "6px 8px", textAlign: "center", fontFamily: font.display, fontSize: 18 }}>
        {item.marker}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 16 }}>
          {icon}
          {item.text}
        </div>
        {item.detail && <div style={{ fontSize: 12, color: t.muted }}>{item.detail}</div>}
      </div>
      {item.chip && <span className="num" style={{ fontFamily: font.display, fontSize: 24, color: t.deep }}>{item.chip}</span>}
    </div>
  );
}

function Section({ t, item }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: t.surfaceOnDark, border: `1px solid ${t.borderOnDark}`, borderRadius: 12, padding: "12px 14px", fontWeight: 600, fontSize: 14 }}>
      <FlagIcon size={16} style={{ color: t.accent }} />
      {item.text}
    </div>
  );
}

function Quiet({ t, item }) {
  const icon =
    item.kind === "Penalty" ? (item.text.endsWith("scores") ? <TargetIcon size={16} /> : <MissIcon size={16} />)
    : item.kind === "Clock" ? <TimerIcon size={16} />
    : <span aria-hidden="true">ⓘ</span>;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 40, paddingRight: 12, color: t.onDarkMuted }}>
      <span style={marker(t)}>{item.marker}</span>
      {icon}
      <div style={{ flex: 1, fontSize: 14 }}>
        {item.text}
        {item.detail && <div style={{ fontSize: 12 }}>{item.detail}</div>}
      </div>
      {item.chip && <span className="num" style={{ fontFamily: font.display, fontSize: 18, color: t.onDark }}>{item.chip}</span>}
    </div>
  );
}

function Row({ t, item }) {
  switch (item.kind) {
    case "Dot": case "Run": case "Extra": case "Four": case "Six":
      return <BallRow t={t} item={item} />;
    case "Wicket":
      return <WicketCard t={t} item={item} />;
    case "Milestone":
      return <Milestone t={t} item={item} />;
    case "OverEnd": case "Period":
      return <Rule t={t} item={item} />;
    case "Result":
      return <Result t={t} item={item} />;
    case "Goal": case "YellowCard": case "SecondYellow": case "RedCard": case "Substitution":
      return <EventCard t={t} item={item} />;
    case "Innings": case "Toss":
      return <Section t={t} item={item} />;
    default:
      return <Quiet t={t} item={item} />;
  }
}

export default function ActivityFeed({ theme: t, sport, items, hasMore, loadingMore, moreError, onLoadMore }) {
  const [seenUpTo] = useState(() => items.reduce((m, i) => Math.max(m, i.id), 0));

  if (items.length === 0) {
    return (
      <div style={{ border: `1px dashed ${t.borderOnDark}`, borderRadius: 12, padding: "1.5rem", textAlign: "center", color: t.onDarkMuted, fontSize: 14 }}>
        {sport === "cricket" ? "Nothing yet. Every ball appears here." : "Nothing yet. Goals, cards and subs appear here."}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {items.map((item) => (
        <div key={item.id} className={item.id > seenUpTo ? "drop-in" : undefined}>
          <Row t={t} item={item} />
        </div>
      ))}
      <ErrorBanner message={moreError} />
      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={loadingMore}
          style={{ minHeight: 44, background: "transparent", color: t.onDark, border: `1px solid ${t.borderOnDark}`, borderRadius: 8, padding: "0.5rem 1rem", fontWeight: 600, cursor: "pointer" }}
        >
          {loadingMore ? "Loading…" : sport === "cricket" ? "Earlier overs" : "Earlier in the match"}
        </button>
      )}
    </div>
  );
}
