// FlagIcon (full time): the app's sizes on a cream card, then in context on the pitch.
import { FlagIcon, font, footballTheme } from "tournament-scheduler-ui";

const t = footballTheme;

export function Sizes() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, padding: 16, background: t.cream, color: t.ink, borderRadius: 12, fontFamily: font.body }}>
      <FlagIcon size={12} />
      <FlagIcon />
      <FlagIcon size={20} />
      <FlagIcon size={32} />
    </div>
  );
}

export function InContext() {
  return (
    <div style={{ background: t.background, color: t.onDark, padding: 20, fontFamily: font.body, fontSize: 14 }}>
      <div style={{ background: "rgba(242,169,59,0.15)", border: "1px solid #F2A93B", color: "#F7F5EF", padding: "0.8rem 1rem", borderRadius: 8, maxWidth: 440 }}>
        <FlagIcon /> Full time — Riverside FC 2-1 Hilltop United.
      </div>
    </div>
  );
}
