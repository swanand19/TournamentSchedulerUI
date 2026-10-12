// CardIcon keeps the referee's colour (yellow #F4C430, red theme.danger) whatever the text colour around it.
import { CardIcon, font, footballTheme } from "tournament-scheduler-ui";

const t = footballTheme;
const YELLOW = "#F4C430";

export function YellowAndRed() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, padding: 16, background: t.cream, color: t.ink, borderRadius: 12, fontFamily: font.body }}>
      <CardIcon size={16} color={YELLOW} />
      <CardIcon size={24} color={YELLOW} />
      <CardIcon size={16} color={t.danger} />
      <CardIcon size={24} color={t.danger} />
    </div>
  );
}

export function InContext() {
  const btn = {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(247,245,239,0.1)",
    color: t.cream, border: "1px solid rgba(247,245,239,0.25)", borderRadius: 10, padding: "0.9rem 1rem", fontSize: 16, fontWeight: 700,
  };
  return (
    <div style={{ background: t.background, padding: 20, fontFamily: font.body, display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button style={btn}><CardIcon size={18} color={YELLOW} /> Yellow card</button>
      <button style={btn}><CardIcon size={18} color={t.danger} /> Red card</button>
      <div style={{ background: t.cream, color: t.ink, borderRadius: 6, padding: "0.5rem 0.7rem", fontSize: 14, display: "flex", alignItems: "center", gap: 24 }}>
        <span><strong>#9 </strong>Arjun Rao</span>
        <CardIcon color={YELLOW} title="Booked" />
      </div>
    </div>
  );
}
