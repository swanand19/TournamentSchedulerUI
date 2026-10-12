// TargetIcon (penalties: the shootout label and the result line): the app's sizes on a cream card, then in context on the pitch.
import { TargetIcon, font, footballTheme } from "tournament-scheduler-ui";

const t = footballTheme;

export function Sizes() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, padding: 16, background: t.cream, color: t.ink, borderRadius: 12, fontFamily: font.body }}>
      <TargetIcon size={12} />
      <TargetIcon />
      <TargetIcon size={20} />
      <TargetIcon size={32} />
    </div>
  );
}

export function InContext() {
  return (
    <div style={{ background: t.background, color: t.onDark, padding: 20, fontFamily: font.body, fontSize: 14 }}>
      <div style={{ background: "#F7F5EF", color: "#1B1B1B", borderRadius: 14, padding: "1.25rem", textAlign: "center", maxWidth: 380 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#8a4b1b", letterSpacing: "0.08em" }}><TargetIcon size={14} /> PENALTY SHOOTOUT</div>
        <div className="num" style={{ fontSize: 14, color: t.warnInk, fontWeight: 700, marginTop: 8 }}><TargetIcon size={14} /> 4 - 3 on penalties — Riverside FC win</div>
      </div>
    </div>
  );
}
