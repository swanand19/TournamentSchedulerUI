import { TrophyIcon } from "./icons";
import { font } from "./theme";

// The tournament's champions, once its final is won: the one line at the top of the stats page.
export default function ChampionBanner({ name, theme }) {
  if (!name) return null;
  return (
    <div role="status" style={{ display: "flex", alignItems: "center", gap: 12, background: theme.accent, color: theme.accentInk, borderRadius: 12, padding: "0.8rem 1rem", marginBottom: 16 }}>
      <TrophyIcon size={26} />
      <div>
        <div style={{ fontFamily: font.display, fontSize: 20, lineHeight: 1.1 }}>{name.toUpperCase()}</div>
        <div style={{ fontSize: 13 }}>Champions — they won the final.</div>
      </div>
    </div>
  );
}
