// TimerIcon (added (stoppage) time): the app's sizes on a cream card, then in context on the pitch.
import { TimerIcon, font, footballTheme } from "tournament-scheduler-ui";

const t = footballTheme;

export function Sizes() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, padding: 16, background: t.cream, color: t.ink, borderRadius: 12, fontFamily: font.body }}>
      <TimerIcon size={12} />
      <TimerIcon />
      <TimerIcon size={20} />
      <TimerIcon size={32} />
    </div>
  );
}

export function InContext() {
  return (
    <div style={{ background: t.background, color: t.onDark, padding: 20, fontFamily: font.body, fontSize: 14 }}>
      <button style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#555", color: t.cream, border: "none", borderRadius: 8, padding: "0.6rem 1rem", fontSize: 14, fontWeight: 600 }}><TimerIcon /> Add time</button>
    </div>
  );
}
