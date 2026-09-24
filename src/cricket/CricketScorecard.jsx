import { useEffect, useState } from "react";
import { font, cricketTheme as theme } from "../theme";
import { getCricketScorecard } from "../api/cricketApi";
import ErrorBanner from "../ErrorBanner";

// The card as it would be printed: one block per innings, batting above bowling, with the extras
// spelled out and the fall of wickets underneath. Every number arrives folded from the deliveries,
// so there is nothing to compute here.

const cell = { padding: "0.3rem 0.5rem", fontSize: 12, textAlign: "right", whiteSpace: "nowrap" };
const nameCell = { ...cell, textAlign: "left", width: "100%" };
const head = { ...cell, color: theme.muted, fontWeight: 700, fontSize: 11, letterSpacing: "0.05em" };

function BattingTable({ rows }) {
  return (
    <table className="num" style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={{ ...head, textAlign: "left" }}>BATTING</th>
          <th style={head}>R</th>
          <th style={head}>B</th>
          <th style={head}>4s</th>
          <th style={head}>6s</th>
          <th style={head}>SR</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.playerId} style={{ borderTop: "1px solid #e5e2d8", opacity: r.hasBatted ? 1 : 0.55 }}>
            <td style={nameCell}>
              <strong>{r.playerName}</strong>
              {r.isStriker && <span title="On strike" style={{ color: theme.accentInk }}> *</span>}
              <div style={{ fontSize: 11, color: theme.muted }}>{r.dismissalText}</div>
            </td>
            <td style={{ ...cell, fontWeight: 700 }}>{r.hasBatted ? r.runs : ""}</td>
            <td style={cell}>{r.hasBatted ? r.ballsFaced : ""}</td>
            <td style={cell}>{r.hasBatted ? r.fours : ""}</td>
            <td style={cell}>{r.hasBatted ? r.sixes : ""}</td>
            <td style={cell}>{r.hasBatted && r.ballsFaced > 0 ? r.strikeRate.toFixed(1) : ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BowlingTable({ rows }) {
  if (rows.length === 0) return null;
  return (
    <table className="num" style={{ width: "100%", borderCollapse: "collapse", marginTop: 14 }}>
      <thead>
        <tr>
          <th style={{ ...head, textAlign: "left" }}>BOWLING</th>
          <th style={head}>O</th>
          <th style={head}>M</th>
          <th style={head}>R</th>
          <th style={head}>W</th>
          <th style={head}>ECON</th>
          <th style={head}>WD</th>
          <th style={head}>NB</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.playerId} style={{ borderTop: "1px solid #e5e2d8" }}>
            <td style={nameCell}>{r.playerName}</td>
            <td style={cell}>{r.overs}</td>
            <td style={cell}>{r.maidens}</td>
            <td style={cell}>{r.runs}</td>
            <td style={{ ...cell, fontWeight: 700 }}>{r.wickets}</td>
            <td style={cell}>{r.economy.toFixed(2)}</td>
            <td style={cell}>{r.wides}</td>
            <td style={cell}>{r.noBalls}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function InningsBlock({ innings }) {
  const extras = [
    innings.byes && `b ${innings.byes}`,
    innings.legByes && `lb ${innings.legByes}`,
    innings.wides && `w ${innings.wides}`,
    innings.noBalls && `nb ${innings.noBalls}`,
    innings.penaltyRuns && `pen ${innings.penaltyRuns}`,
  ].filter(Boolean).join(", ");

  return (
    <div style={{ background: theme.cream, color: theme.ink, borderRadius: 12, padding: "1rem 1.1rem", marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10, gap: 10 }}>
        <h4 style={{ fontFamily: font.display, fontSize: 16, margin: 0 }}>
          {innings.battingTeamName.toUpperCase()}
          {innings.isSuperOver && <span style={{ color: theme.accentInk, fontSize: 12 }}> · SUPER OVER</span>}
          {innings.isFollowOn && <span style={{ color: theme.muted, fontSize: 12 }}> · following on</span>}
        </h4>
        <span style={{ fontFamily: font.display, fontSize: 20 }}>
          {innings.runs}/{innings.wickets}
          <span style={{ fontSize: 14, color: theme.muted }}> ({innings.overs})</span>
        </span>
      </div>

      <BattingTable rows={innings.batting} />

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, borderTop: "1px solid #e5e2d8", padding: "0.4rem 0.5rem" }}>
        <span style={{ color: theme.muted }}>Extras {extras && `(${extras})`}</span>
        <strong>{innings.extrasTotal}</strong>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, borderTop: "2px solid #d8d4c8", padding: "0.4rem 0.5rem" }}>
        <strong>Total</strong>
        <strong>
          {innings.runs}/{innings.wickets} ({innings.overs} ov, RR {innings.runRate.toFixed(2)})
        </strong>
      </div>

      {innings.fallOfWickets.length > 0 && (
        <p style={{ fontSize: 11, color: theme.muted, margin: "8px 0 0", lineHeight: 1.6 }}>
          <strong style={{ color: theme.ink }}>Fall of wickets: </strong>
          {innings.fallOfWickets
            .map((f) => `${f.wicketNumber}-${f.runs} (${f.playerName}, ${f.overs})`)
            .join(", ")}
        </p>
      )}

      <BowlingTable rows={innings.bowling} />
    </div>
  );
}

export default function CricketScorecard({ matchId, refreshKey }) {
  const [card, setCard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getCricketScorecard(matchId);
        if (!cancelled) setCard(data);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [matchId, refreshKey]);

  if (error) return <ErrorBanner message={error} />;
  if (!card) return <p style={{ color: theme.onDarkMuted, fontSize: 14 }}>Loading scorecard…</p>;

  return (
    <div style={{ fontFamily: font.body }}>
      {card.tossSummary && (
        <p style={{ color: theme.onDarkMuted, fontSize: 12, marginTop: 0 }}>{card.tossSummary}.</p>
      )}
      {card.innings.length === 0 && (
        <p style={{ color: theme.onDarkMuted, fontSize: 14 }}>Nothing has been bowled yet.</p>
      )}
      {card.innings.map((i) => <InningsBlock key={i.inningsId} innings={i} />)}
      {card.resultSummary && (
        <p style={{ fontFamily: font.display, fontSize: 16, color: theme.accent, textAlign: "center" }}>
          {card.resultSummary}
        </p>
      )}
    </div>
  );
}
