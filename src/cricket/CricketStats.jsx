import { useEffect, useState } from "react";
import { font, cricketTheme as theme } from "../theme";
import { getCricketStats } from "../api/tournamentsApi";
import ErrorBanner from "../ErrorBanner";
import { TrophyIcon } from "../icons";

// The cricket stats page: points table with net run rate, batting, bowling and fielding
// leaderboards, the fantasy-points MVP race, and the tournament's records.
//
// Everything arrives computed; this screen only lays it out. Which boards exist, who qualifies and
// how ties rank are all the server's call, so the page draws whatever boards it is sent.

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "table", label: "Points table" },
  { key: "batting", label: "Batting" },
  { key: "bowling", label: "Bowling" },
  { key: "fielding", label: "Fielding" },
  { key: "mvp", label: "MVP" },
];

const ON_DARK_SOFT = "rgba(247,245,239,0.7)";

const card = { background: theme.cream, color: theme.ink, borderRadius: 12 };
const cell = { padding: "0.55rem 0.6rem", fontSize: 14, textAlign: "right", whiteSpace: "nowrap" };
const head = { ...cell, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: theme.muted, fontWeight: 700 };

const RESULT_STYLE = {
  W: { background: "rgba(99,153,34,0.18)", color: theme.successInk },
  L: { background: "rgba(226,75,74,0.14)", color: "#a33" },
  T: { background: "rgba(18,36,59,0.1)", color: theme.ink },
  D: { background: "rgba(18,36,59,0.1)", color: theme.ink },
  NR: { background: "rgba(18,36,59,0.1)", color: theme.muted },
};

function Pills({ items, active, onPick, label }) {
  return (
    <div role="tablist" aria-label={label} style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
      {items.map((t) => {
        const on = active === t.key;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={on}
            onClick={() => onPick(t.key)}
            style={{
              background: on ? theme.accent : "rgba(247,245,239,0.1)",
              color: on ? theme.accentInk : theme.cream,
              border: on ? `1px solid ${theme.accent}` : "1px solid rgba(247,245,239,0.22)",
              borderRadius: 999,
              padding: "0.4rem 0.85rem",
              fontSize: 14,
              fontWeight: on ? 700 : 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function Empty({ children }) {
  return (
    <div style={{ background: "rgba(247,245,239,0.05)", border: "1px dashed rgba(247,245,239,0.25)", borderRadius: 10, padding: "1.8rem 1rem", textAlign: "center" }}>
      <p style={{ fontSize: 14, color: ON_DARK_SOFT, margin: 0 }}>{children}</p>
    </div>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div style={{ background: "rgba(247,245,239,0.08)", border: "1px solid rgba(247,245,239,0.18)", borderRadius: 10, padding: "0.9rem 1rem" }}>
      <div className="num" style={{ fontFamily: font.display, fontSize: 28, color: theme.accent, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: ON_DARK_SOFT, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{label}</div>
      {hint && <div style={{ fontSize: 12, color: ON_DARK_SOFT, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function RankCell({ rank }) {
  // Gold, silver, bronze — light enough that the dark numeral stays readable on each.
  const medal = rank <= 3 ? ["#E8C35A", "#CDD2D7", "#DDAA7C"][rank - 1] : null;
  return (
    <td style={{ ...cell, textAlign: "left", width: 44, fontWeight: 700, color: theme.muted }}>
      {medal ? (
        <span style={{ display: "inline-grid", placeItems: "center", width: 24, height: 24, borderRadius: "50%", background: medal, color: theme.ink, fontSize: 12 }}>
          {rank}
        </span>
      ) : rank}
    </td>
  );
}

/** One leaderboard as a table: rank, player, the ranked figure, then its supporting columns. */
function Board({ board }) {
  if (!board.rows.length) {
    return <Empty>Nothing recorded yet for {board.title.toLowerCase()}.</Empty>;
  }

  return (
    <div>
      {board.qualification && (
        <p style={{ fontSize: 12, color: ON_DARK_SOFT, margin: "0 0 10px" }}>{board.qualification}</p>
      )}
      <div style={{ ...card, overflowX: "auto" }}>
        <table className="num" style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #E3DFD3" }}>
              <th style={{ ...head, textAlign: "left" }}>#</th>
              <th style={{ ...head, textAlign: "left" }}>Player</th>
              <th style={{ ...head, color: theme.deep }}>{board.valueLabel}</th>
              {board.columns.map((c) => <th key={c} style={head}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {board.rows.map((r, i) => (
              <tr key={`${r.playerId}-${i}`} style={{ borderBottom: "1px solid #EDEAE0" }}>
                <RankCell rank={r.rank} />
                <td style={{ ...cell, textAlign: "left", whiteSpace: "normal", minWidth: 140 }}>
                  <span style={{ fontWeight: 600 }}>{r.playerName}</span>
                  <span style={{ display: "block", fontSize: 12, color: theme.muted }}>
                    {r.teamName}{r.note ? ` · ${r.note}` : ""}
                  </span>
                </td>
                <td style={{ ...cell, fontFamily: font.display, fontSize: 18, color: theme.deep }}>{r.value}</td>
                {board.columns.map((c) => (
                  <td key={c} style={{ ...cell, color: "#4a4d52" }}>{r.detail[c] ?? "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** A family of boards (batting, bowling, fielding) with a chip to pick one. */
function BoardSet({ boards, label }) {
  const [active, setActive] = useState(boards[0]?.key);
  const board = boards.find((b) => b.key === active) ?? boards[0];
  if (!board) return <Empty>Nothing recorded yet.</Empty>;

  return (
    <div>
      <Pills items={boards.map((b) => ({ key: b.key, label: b.title }))} active={board.key} onPick={setActive} label={label} />
      <Board board={board} />
    </div>
  );
}

function PointsTable({ groups, notes }) {
  const anyPlayed = groups.some((g) => g.rows.some((r) => r.played > 0));
  const showDrawn = groups.some((g) => g.rows.some((r) => r.drawn > 0));

  return (
    <div>
      {!anyPlayed && <div style={{ marginBottom: 16 }}><Empty>The table fills in as matches are completed.</Empty></div>}

      {groups.map((g) => (
        <div key={g.groupName} style={{ marginBottom: 22 }}>
          {groups.length > 1 && (
            <h4 style={{ fontFamily: font.display, fontSize: 16, color: theme.accent, margin: "0 0 8px" }}>
              GROUP {g.groupName.toUpperCase()}
            </h4>
          )}
          <div style={{ ...card, overflowX: "auto" }}>
            <table className="num" style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #E3DFD3" }}>
                  <th style={{ ...head, textAlign: "left" }}>#</th>
                  <th style={{ ...head, textAlign: "left" }}>Team</th>
                  <th style={head}><abbr title="Played" style={{ textDecoration: "none" }}>P</abbr></th>
                  <th style={head}><abbr title="Won" style={{ textDecoration: "none" }}>W</abbr></th>
                  <th style={head}><abbr title="Lost" style={{ textDecoration: "none" }}>L</abbr></th>
                  <th style={{ ...head, color: theme.deep }}>Pts</th>
                  <th style={head}><abbr title="Net run rate" style={{ textDecoration: "none" }}>NRR</abbr></th>
                  <th style={head}><abbr title="Tied" style={{ textDecoration: "none" }}>T</abbr></th>
                  {showDrawn && <th style={head}><abbr title="Drawn" style={{ textDecoration: "none" }}>D</abbr></th>}
                  <th style={head}><abbr title="No result" style={{ textDecoration: "none" }}>NR</abbr></th>
                  <th style={head}>For</th>
                  <th style={head}>Against</th>
                  <th style={{ ...head, textAlign: "left" }}>Last 5</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.teamId} style={{ borderBottom: "1px solid #EDEAE0" }}>
                    <td style={{ ...cell, textAlign: "left", fontWeight: 700, color: theme.muted, width: 36 }}>{r.rank}</td>
                    <td style={{ ...cell, textAlign: "left", fontWeight: 600 }}>{r.teamName}</td>
                    <td style={cell}>{r.played}</td>
                    <td style={cell}>{r.won}</td>
                    <td style={cell}>{r.lost}</td>
                    <td style={{ ...cell, fontFamily: font.display, fontSize: 18, color: theme.deep }}>{r.points}</td>
                    <td style={{ ...cell, fontWeight: 600, color: r.netRunRate > 0 ? theme.successInk : r.netRunRate < 0 ? "#a33" : theme.ink }}>
                      {r.netRunRate > 0 ? "+" : ""}{r.netRunRate.toFixed(3)}
                    </td>
                    <td style={cell}>{r.tied}</td>
                    {showDrawn && <td style={cell}>{r.drawn}</td>}
                    <td style={cell}>{r.noResult}</td>
                    <td style={{ ...cell, color: "#4a4d52" }}>{r.runsFor}/{r.oversFor}</td>
                    <td style={{ ...cell, color: "#4a4d52" }}>{r.runsAgainst}/{r.oversAgainst}</td>
                    <td style={{ ...cell, textAlign: "left" }}>
                      <span style={{ display: "inline-flex", gap: 3 }}>
                        {r.form.length === 0 && <span style={{ color: theme.muted }}>—</span>}
                        {r.form.map((f, i) => (
                          <span key={i} title={{ W: "Won", L: "Lost", T: "Tied", D: "Drawn", NR: "No result" }[f]}
                            style={{ ...RESULT_STYLE[f], borderRadius: 4, padding: "1px 5px", fontSize: 11, fontWeight: 700 }}>
                            {f}
                          </span>
                        ))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <Notes notes={notes.slice(0, 2)} />
    </div>
  );
}

function RecordList({ title, records }) {
  return (
    <div style={{ ...card, padding: "0.9rem 1rem" }}>
      <h4 style={{ fontFamily: font.display, fontSize: 16, margin: "0 0 8px" }}>{title.toUpperCase()}</h4>
      {records.length === 0 && <p style={{ fontSize: 13, color: theme.muted, margin: 0 }}>Nothing yet.</p>}
      {records.map((r, i) => (
        <div key={i} style={{ padding: "5px 0", borderTop: i ? "1px solid #EDEAE0" : "none" }}>
          <div className="num" style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 14 }}>
            <span style={{ fontWeight: 600 }}>{r.teamName}</span>
            <strong style={{ color: theme.deep }}>{r.value}</strong>
          </div>
          <div style={{ fontSize: 12, color: theme.muted }}>{r.detail}</div>
        </div>
      ))}
    </div>
  );
}

function Overview({ stats }) {
  const s = stats.summary;
  const leaders = [
    ["Most runs", s.topRunScorer],
    ["Most wickets", s.topWicketTaker],
    ["MVP", s.mvp],
    ["Highest score", s.highestScore],
    ["Best bowling", s.bestBowling],
    ["Highest total", s.highestTeamTotal],
  ].filter(([, v]) => v);

  return (
    <div>
      <div className="cols" style={{ "--cols": 4, "--cols-sm": 2, gap: 10, marginBottom: 20 }}>
        <StatCard label="Matches" value={`${s.matchesCompleted}/${s.totalMatches}`}
          hint={s.matchesInProgress > 0 ? `${s.matchesInProgress} in progress` : undefined} />
        <StatCard label="Runs" value={s.totalRuns} hint={`${s.extras} extras`} />
        <StatCard label="Wickets" value={s.totalWickets} />
        <StatCard label="Sixes" value={s.sixes} hint={`${s.fours} fours`} />
        <StatCard label="Fifties" value={s.fifties} />
        <StatCard label="Hundreds" value={s.hundreds} />
      </div>

      {leaders.length > 0 && (
        <div style={{ ...card, padding: "1rem 1.2rem", marginBottom: 20 }}>
          <h4 style={{ fontFamily: font.display, fontSize: 16, margin: "0 0 10px" }}>LEADING THE WAY</h4>
          <div className="cols" style={{ "--cols": 2, gap: "8px 24px" }}>
            {leaders.map(([label, value]) => (
              <div key={label} style={{ fontSize: 14 }}>
                <span style={{ color: theme.muted }}>{label}: </span>
                <strong className="num">{value}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="cols" style={{ "--cols": 2, gap: 12 }}>
        <RecordList title="Highest totals" records={stats.records.highestTotals} />
        <RecordList title="Lowest totals" records={stats.records.lowestTotals} />
        <RecordList title="Biggest wins" records={stats.records.biggestWins} />
        <RecordList title="Highest partnerships" records={stats.records.highestPartnerships} />
      </div>

      <Notes notes={stats.notes} />
    </div>
  );
}

function Mvp({ stats }) {
  return (
    <div>
      <Board board={stats.mvp} />

      <h4 style={{ fontFamily: font.display, fontSize: 18, margin: "24px 0 10px" }}>PLAYER OF THE MATCH</h4>
      {stats.playersOfMatch.length === 0 && <Empty>Awarded to the highest points scorer once a match is complete.</Empty>}
      <div className="cols" style={{ "--cols": 2, gap: 10 }}>
        {stats.playersOfMatch.map((p) => (
          <div key={p.matchId} style={{ ...card, padding: "0.8rem 1rem", display: "flex", gap: 12, alignItems: "center" }}>
            <TrophyIcon size={22} style={{ color: theme.warnInk }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: theme.muted }}>M{p.matchNumber} · {p.fixture}</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{p.playerName} <span style={{ fontWeight: 400, color: theme.muted }}>· {p.teamName}</span></div>
              <div className="num" style={{ fontSize: 13 }}>{p.summary || "—"} · <strong>{p.points} pts</strong></div>
            </div>
          </div>
        ))}
      </div>

      <details style={{ ...card, padding: "0.9rem 1rem", marginTop: 20 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 14 }}>How MVP points are scored</summary>
        <table className="num" style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
          <tbody>
            {stats.pointsSystem.map((r, i) => (
              <tr key={i} style={{ borderTop: "1px solid #EDEAE0" }}>
                <td style={{ ...cell, textAlign: "left", color: theme.muted, fontSize: 12 }}>{r.category}</td>
                <td style={{ ...cell, textAlign: "left", whiteSpace: "normal" }}>{r.item}</td>
                <td style={{ ...cell, fontWeight: 700, color: r.points < 0 ? "#a33" : theme.deep }}>
                  {r.points > 0 ? "+" : ""}{r.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

function Notes({ notes }) {
  if (!notes?.length) return null;
  return (
    <div style={{ marginTop: 22, paddingTop: 14, borderTop: "1px solid rgba(247,245,239,0.15)" }}>
      <p style={{ fontSize: 11, color: ON_DARK_SOFT, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px", fontWeight: 700 }}>
        How these numbers are counted
      </p>
      {notes.map((n, i) => (
        <p key={i} style={{ fontSize: 13, color: ON_DARK_SOFT, margin: "0 0 6px", lineHeight: 1.5 }}>{n}</p>
      ))}
    </div>
  );
}

export default function CricketStats({ tournamentId, refreshKey }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("table");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError("");
      try {
        const data = await getCricketStats(tournamentId);
        if (!cancelled) setStats(data);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [tournamentId, refreshKey]);

  if (error) return <ErrorBanner message={error} />;
  if (!stats) return <p style={{ color: ON_DARK_SOFT }}>Loading stats…</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <h3 style={{ fontFamily: font.display, fontSize: 22, margin: 0 }}>TOURNAMENT STATS</h3>
        <span style={{ fontSize: 12, color: ON_DARK_SOFT }}>{stats.basis}</span>
      </div>

      <Pills items={TABS} active={tab} onPick={setTab} label="Stats sections" />

      <div key={tab} className="view-in">
        {tab === "overview" && <Overview stats={stats} />}
        {tab === "table" && <PointsTable groups={stats.pointsTable} notes={stats.notes} />}
        {tab === "batting" && <BoardSet boards={stats.battingBoards} label="Batting leaderboards" />}
        {tab === "bowling" && <BoardSet boards={stats.bowlingBoards} label="Bowling leaderboards" />}
        {tab === "fielding" && <BoardSet boards={stats.fieldingBoards} label="Fielding leaderboards" />}
        {tab === "mvp" && <Mvp stats={stats} />}
      </div>
    </div>
  );
}
