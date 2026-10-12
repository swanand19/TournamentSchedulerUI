// ScoringControls wraps the scoring pad: live for the person holding the scorer lock, dimmed for everyone else.
import { ScoringControls, BallIcon, CardIcon, SwapIcon, PauseIcon, TimerIcon, StopIcon, font, footballTheme } from "tournament-scheduler-ui";

const t = footballTheme;
const eventBtn = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  background: "rgba(247,245,239,0.1)", color: t.cream, border: "1px solid rgba(247,245,239,0.25)",
  borderRadius: 10, padding: "0.9rem 0.6rem", fontSize: 16, fontWeight: 700, cursor: "pointer",
};
const btn = (color: string) => ({
  display: "inline-flex", alignItems: "center", gap: 6, background: color, color: t.cream, border: "none",
  borderRadius: 8, padding: "0.6rem 1rem", fontSize: 14, fontWeight: 600, cursor: "pointer",
});

function Pad() {
  return (
    <>
      <div className="cols" style={{ "--cols": 4, "--cols-sm": 2, gap: 8, marginBottom: 10 } as React.CSSProperties}>
        <button style={{ ...eventBtn, background: t.accent, color: t.accentInk, borderColor: "transparent" }}><BallIcon size={18} /> Goal</button>
        <button style={eventBtn}><CardIcon size={18} color="#F4C430" /> Yellow card</button>
        <button style={eventBtn}><CardIcon size={18} color={t.danger} /> Red card</button>
        <button style={eventBtn}><SwapIcon size={18} /> Substitution</button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button style={btn(t.warnInk)}><PauseIcon /> Stop play</button>
        <button style={btn("#555")}><TimerIcon /> Add time</button>
        <button style={btn("#555")}><StopIcon /> End second half</button>
      </div>
    </>
  );
}

const Page = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: t.background, color: t.onDark, padding: 20, fontFamily: font.body, maxWidth: 640 }}>{children}</div>
);

export function YouAreScoring() {
  return (
    <Page>
      <ScoringControls locked={false}><Pad /></ScoringControls>
    </Page>
  );
}

export function SomeoneElseIsScoring() {
  return (
    <Page>
      <div style={{ background: "rgba(247,245,239,0.08)", border: "1px solid rgba(247,245,239,0.25)", borderRadius: 10, padding: "0.8rem 1rem", marginBottom: 14, fontSize: 14 }}>
        <strong>Priya Nair</strong> is scoring this match. You can follow it here; the scoring buttons are off.
      </div>
      <ScoringControls locked><Pad /></ScoringControls>
    </Page>
  );
}
