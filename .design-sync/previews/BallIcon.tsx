// BallIcon (goals: scorer lines under the scorebug and the Goal button): the app's sizes on a cream card, then in context on the pitch.
import { BallIcon, font, footballTheme } from "tournament-scheduler-ui";

const t = footballTheme;

export function Sizes() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, padding: 16, background: t.cream, color: t.ink, borderRadius: 12, fontFamily: font.body }}>
      <BallIcon size={12} />
      <BallIcon />
      <BallIcon size={20} />
      <BallIcon size={32} />
    </div>
  );
}

export function InContext() {
  return (
    <div style={{ background: t.background, color: t.onDark, padding: 20, fontFamily: font.body, fontSize: 14 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ background: t.cream, color: t.ink, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Riverside FC</div>
          <div className="num" style={{ fontSize: 12, color: t.muted, marginTop: 2 }}><BallIcon size={12} /> Rahul 23', 67'</div>
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: 8, background: t.accent, color: t.accentInk, border: "none", borderRadius: 10, padding: "0.9rem 1.4rem", fontSize: 16, fontWeight: 700 }}><BallIcon size={18} /> Goal</button>
      </div>
    </div>
  );
}
