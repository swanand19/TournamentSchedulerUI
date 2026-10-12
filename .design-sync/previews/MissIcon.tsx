// MissIcon (a missed or saved penalty, beside the scored ones): the app's sizes on a cream card, then in context on the pitch.
import { MissIcon, BallIcon, font, footballTheme } from "tournament-scheduler-ui";

const t = footballTheme;

export function Sizes() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, padding: 16, background: t.cream, color: t.ink, borderRadius: 12, fontFamily: font.body }}>
      <MissIcon size={12} />
      <MissIcon />
      <MissIcon size={20} />
      <MissIcon size={32} />
    </div>
  );
}

export function InContext() {
  return (
    <div style={{ background: t.background, color: t.onDark, padding: 20, fontFamily: font.body, fontSize: 14 }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <div style={{ background: "#F7F5EF", color: "#1B1B1B", borderRadius: 12, padding: "1rem", minWidth: 180 }}>
        <h4 style={{ fontFamily: font.display, fontSize: 16, margin: "0 0 8px", fontWeight: 400 }}>Riverside FC</h4>
        <div style={{ display: "flex", gap: 6 }}>
          <BallIcon size={20} />
          <BallIcon size={20} />
          <MissIcon size={20} style={{ color: t.dangerSolid }} />
          <BallIcon size={20} />
          <BallIcon size={20} />
        </div>
      </div>
      <div style={{ background: "#F7F5EF", color: "#1B1B1B", borderRadius: 12, padding: "1rem", minWidth: 180 }}>
        <h4 style={{ fontFamily: font.display, fontSize: 16, margin: "0 0 8px", fontWeight: 400 }}>Hilltop United</h4>
        <div style={{ display: "flex", gap: 6 }}>
          <BallIcon size={20} />
          <MissIcon size={20} style={{ color: t.dangerSolid }} />
          <BallIcon size={20} />
          <MissIcon size={20} style={{ color: t.dangerSolid }} />
        </div>
      </div>
      </div>
    </div>
  );
}
