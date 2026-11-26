import { TrophyIcon } from "./icons";

// The tournament's champions, once its final is won: the one line at the top of the stats and matches pages.
export default function ChampionBanner({ name }) {
  if (!name) return null;
  return (
    <div role="status" className="kc-pane lined flush" style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", marginBottom: 18 }}>
      <span style={{ width: 44, height: 44, borderRadius: 22, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "var(--tint)", color: "var(--deep)", flex: "none" }}>
        <TrophyIcon size={22} />
      </span>
      <div>
        <div style={{ fontSize: 20, lineHeight: "25px", fontWeight: "var(--w-bold)" }}>{name}</div>
        <div className="kc-cap">Champions — they won the final.</div>
      </div>
    </div>
  );
}
