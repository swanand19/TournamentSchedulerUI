// BanIcon (an abandoned or forfeited match): the app's sizes on a cream card, then in context on the pitch.
import { BanIcon, font, footballTheme } from "tournament-scheduler-ui";

const t = footballTheme;

export function Sizes() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, padding: 16, background: t.cream, color: t.ink, borderRadius: 12, fontFamily: font.body }}>
      <BanIcon size={12} />
      <BanIcon />
      <BanIcon size={20} />
      <BanIcon size={32} />
    </div>
  );
}

export function InContext() {
  return (
    <div style={{ background: t.background, color: t.onDark, padding: 20, fontFamily: font.body, fontSize: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
        <button style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid rgba(226,75,74,0.6)", color: "#F4A3A3", borderRadius: 8, padding: "0.6rem 1rem", fontSize: 14, fontWeight: 600 }}><BanIcon /> Abandon match…</button>
        <div style={{ background: t.cream, color: "#a33", borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 700 }}><BanIcon size={14} /> Match abandoned — Riverside FC win by forfeit</div>
      </div>
    </div>
  );
}
