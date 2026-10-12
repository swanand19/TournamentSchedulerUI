// Modal is the scoring console's dialog: a cream card over a dark backdrop, heading in Anton.
import { Modal, BallIcon, CardIcon, font, footballTheme } from "tournament-scheduler-ui";

const t = footballTheme;
const panel = { background: t.cream, color: t.ink, borderRadius: 14, padding: "1.5rem" };
const heading = { fontFamily: font.display, fontSize: 20, margin: "0 0 6px", fontWeight: 400 };
const solid = { background: t.deep, color: t.cream, border: "none", borderRadius: 8, padding: "0.75rem", fontSize: 14, fontWeight: 700, cursor: "pointer" };

export function AbandonMatch() {
  return (
    <div style={{ fontFamily: font.body }}>
      <Modal labelledBy="abandon-title" onClose={() => {}} panelStyle={panel}>
        <h3 id="abandon-title" style={heading}>ABANDON MATCH</h3>
        <p style={{ fontSize: 14, color: t.muted, margin: "0 0 16px", lineHeight: 1.5 }}>
          For a match that can't finish normally — called off, a walkover, or a side that can't
          continue. This closes the match and can't be undone.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button style={solid}>Award the match to Riverside FC</button>
          <button style={solid}>Award the match to Hilltop United</button>
          <button className="num" style={{ ...solid, background: "#EDEAE0", color: t.ink, fontWeight: 600 }}>
            Keep the score as it stands (2–1)
          </button>
          <button style={{ background: "transparent", color: t.ink, border: "1px solid #ccc", borderRadius: 8, padding: "0.6rem", fontSize: 14, cursor: "pointer", marginTop: 4 }}>
            Keep playing
          </button>
        </div>
      </Modal>
    </div>
  );
}

export function RecordGoal() {
  const players: [string, string, boolean][] = [["7", "Rahul Mehta", false], ["9", "Arjun Rao", true], ["10", "Kabir Shah", false], ["11", "Dev Patel", false]];
  const pickRow = { width: "100%", textAlign: "left" as const, color: t.ink, padding: "0.5rem 0.7rem", borderRadius: 6, fontSize: 14, cursor: "pointer" };
  const label = { fontSize: 12, color: t.muted, marginBottom: 6 };
  return (
    <div style={{ fontFamily: font.body }}>
      <Modal labelledBy="event-title" onClose={() => {}} panelStyle={panel}>
        <h3 id="event-title" style={{ ...heading, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <BallIcon /> GOAL
        </h3>
        <p style={label}>Team</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {["Riverside FC", "Hilltop United"].map((name, i) => (
            <button key={name} style={{ flex: 1, padding: "0.5rem", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", border: "none", background: i === 0 ? "#1B4332" : "#EDEAE0", color: i === 0 ? "#F7F5EF" : "#1B1B1B" }}>
              {name}
            </button>
          ))}
        </div>
        <p style={label}>Scorer</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          {players.map(([n, name, booked]) => (
            <button key={n} aria-pressed={n === "9"} style={{ ...pickRow, background: n === "9" ? t.tint : "#EDEAE0", border: n === "9" ? `1.5px solid ${t.deep}` : "1.5px solid transparent", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span><strong>#{n} </strong>{name}</span>
              {booked && <CardIcon color="#F4C430" title="Booked" />}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button style={{ flex: 1, padding: "0.6rem", borderRadius: 8, background: "transparent", border: "1px solid #ccc", cursor: "pointer", fontSize: 14 }}>Cancel</button>
          <button style={{ flex: 1, padding: "0.6rem", borderRadius: 8, background: t.successSolid, color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>Record goal</button>
        </div>
      </Modal>
    </div>
  );
}
