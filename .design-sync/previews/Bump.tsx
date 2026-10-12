// Bump marks the numbers that matter: goals on the football scoreboard, wickets on the cricket one.
import { Bump, BallIcon, cricketTheme, font, footballTheme } from "tournament-scheduler-ui";

const pitch = (theme: typeof footballTheme) => ({
  background: theme.background, padding: 20, fontFamily: font.body, color: theme.onDark,
});

export function FootballScoreboard() {
  const t = footballTheme;
  return (
    <div style={pitch(t)}>
      <div style={{ background: t.cream, color: t.ink, borderRadius: 14, padding: "1.5rem", textAlign: "center", maxWidth: 460 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.warnInk, letterSpacing: "0.08em", marginBottom: 12 }}>
          <span className="live-dot" />LIVE — SECOND HALF
        </div>
        <div className="scorebug">
          <div style={{ textAlign: "right", minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Riverside FC</div>
            <div className="num" style={{ fontSize: 12, color: t.muted, marginTop: 2 }}><BallIcon size={12} /> Rahul 23', 67'</div>
          </div>
          <div className="scorebug-score num" style={{ fontFamily: font.display, fontSize: 48, lineHeight: 1, color: t.deep, display: "flex", justifyContent: "center", gap: 14 }}>
            <Bump value={2} />
            <span style={{ color: t.muted, opacity: 0.5 }}>–</span>
            <Bump value={1} />
          </div>
          <div style={{ textAlign: "left", minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Hilltop United</div>
            <div className="num" style={{ fontSize: 12, color: t.muted, marginTop: 2 }}><BallIcon size={12} /> Arjun 41'</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CricketWickets() {
  const t = cricketTheme;
  return (
    <div style={pitch(t)}>
      <div style={{ background: t.surfaceOnDark, border: `1px solid ${t.borderOnDark}`, borderRadius: 12, padding: "1rem", textAlign: "center", maxWidth: 360 }}>
        <div style={{ fontSize: 12, color: t.onDarkMuted, letterSpacing: "0.05em" }}>STRIKERS v CHALLENGERS</div>
        <div className="num" style={{ fontFamily: font.display, fontSize: 40, lineHeight: 1.1, margin: "6px 0" }}>
          142/<Bump value={4} />
          <span style={{ fontSize: 18, color: t.onDarkMuted }}> (16.3/20)</span>
        </div>
        <div style={{ fontSize: 14, color: t.onDarkMuted }}>Strikers · RR 8.61 · need 37 off 21</div>
      </div>
    </div>
  );
}
