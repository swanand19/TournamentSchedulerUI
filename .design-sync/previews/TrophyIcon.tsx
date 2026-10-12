// TrophyIcon (the winner, in warnInk on cream): the app's sizes on a cream card, then in context on the pitch.
import { TrophyIcon, font, footballTheme } from "tournament-scheduler-ui";

const t = footballTheme;

export function Sizes() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, padding: 16, background: t.cream, color: t.ink, borderRadius: 12, fontFamily: font.body }}>
      <TrophyIcon size={12} />
      <TrophyIcon />
      <TrophyIcon size={20} />
      <TrophyIcon size={32} />
    </div>
  );
}

export function InContext() {
  return (
    <div style={{ background: t.background, color: t.onDark, padding: 20, fontFamily: font.body, fontSize: 14 }}>
      <div style={{ background: t.cream, color: t.ink, borderRadius: 12, padding: 14, maxWidth: 340, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <TrophyIcon size={22} style={{ color: t.warnInk }} />
          <span style={{ fontFamily: font.display, fontSize: 20 }}>RIVERSIDE FC</span>
        </div>
        <div style={{ fontSize: 14 }}><TrophyIcon size={14} title="Won on penalties" style={{ color: t.warnInk, marginInlineEnd: 4 }} />Riverside FC 1–1 Hilltop United</div>
      </div>
    </div>
  );
}
