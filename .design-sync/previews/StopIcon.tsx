// StopIcon (the end of a period): the app's sizes on a cream card, then in context on the pitch.
import { StopIcon, font, footballTheme } from "tournament-scheduler-ui";

const t = footballTheme;

export function Sizes() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, padding: 16, background: t.cream, color: t.ink, borderRadius: 12, fontFamily: font.body }}>
      <StopIcon size={12} />
      <StopIcon />
      <StopIcon size={20} />
      <StopIcon size={32} />
    </div>
  );
}

export function InContext() {
  return (
    <div style={{ background: t.background, color: t.onDark, padding: 20, fontFamily: font.body, fontSize: 14 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ background: t.cream, color: t.warnInk, borderRadius: 12, padding: 14, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}><StopIcon size={14} /> END OF FIRST HALF</div>
        <button style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#555", color: t.cream, border: "none", borderRadius: 8, padding: "0.6rem 1rem", fontSize: 14, fontWeight: 600 }}><StopIcon /> End second half</button>
      </div>
    </div>
  );
}
