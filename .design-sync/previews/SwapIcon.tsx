// SwapIcon (a substitution): the app's sizes on a cream card, then in context on the pitch.
import { SwapIcon, font, footballTheme } from "tournament-scheduler-ui";

const t = footballTheme;

export function Sizes() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, padding: 16, background: t.cream, color: t.ink, borderRadius: 12, fontFamily: font.body }}>
      <SwapIcon size={12} />
      <SwapIcon />
      <SwapIcon size={20} />
      <SwapIcon size={32} />
    </div>
  );
}

export function InContext() {
  return (
    <div style={{ background: t.background, color: t.onDark, padding: 20, fontFamily: font.body, fontSize: 14 }}>
      <button style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(247,245,239,0.1)", color: t.cream, border: "1px solid rgba(247,245,239,0.25)", borderRadius: 10, padding: "0.9rem 1rem", fontSize: 16, fontWeight: 700 }}><SwapIcon size={18} /> Substitution</button>
    </div>
  );
}
