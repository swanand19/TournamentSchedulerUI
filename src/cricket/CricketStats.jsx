import { useEffect, useState } from "react";
import { useSource } from "../api/source";
import ErrorBanner from "../ErrorBanner";
import ChampionBanner from "../ChampionBanner";
import { TrophyIcon } from "../icons";
import { CheckIcon } from "../ui/icons";
import PlayerName from "../PlayerName";
import { LinesToggle, RowWithLines } from "../PlayerLines";
import { useOpenRows } from "../statsRows";
import { OpenPlayerContext } from "../playerContext";

// The cricket stats page in three views, the phone hub's tabs (2026-11-26, the canvas's "Web · Stats"
// boards): Table (points tables with net run rate and form), Summary (totals, who leads, MVP, team
// records) and Stats (the players' batting, bowling, fielding and MVP boards as full tables, a row
// unfolding into the player's innings or spells). The public page shows all three, one after another.
//
// Everything arrives computed; this screen only lays it out. Which boards exist, who qualifies and
// how ties rank are all the server's call, so the page draws whatever boards it is sent.

const FAMILIES = [
  { key: "batting", label: "Batting" },
  { key: "bowling", label: "Bowling" },
  { key: "fielding", label: "Fielding" },
  { key: "mvp", label: "MVP" },
];

const RESULT_STYLE = {
  W: { background: "var(--success-tint)", color: "var(--success-ink)" },
  L: { background: "var(--danger-tint)", color: "var(--danger-ink)" },
  T: { background: "var(--chip)", color: "var(--ink)" },
  D: { background: "var(--chip)", color: "var(--ink)" },
  NR: { background: "var(--chip)", color: "var(--muted)" },
};

const abbr = (title, text) => <abbr title={title} style={{ textDecoration: "none" }}>{text}</abbr>;

function Empty({ children }) {
  return <p className="kc-sub" style={{ margin: "8px 0" }}>{children}</p>;
}

function Tile({ label, value, hint }) {
  return (
    <div className="kc-pane lined flush" style={{ padding: "16px 18px" }}>
      <div className="num kc-figure" style={{ fontSize: 30, lineHeight: "34px", color: "var(--deep)" }}>{value}</div>
      <div className="kc-cap" style={{ color: "var(--ink)", marginTop: 2 }}>{label}</div>
      {hint && <div className="kc-cap">{hint}</div>}
    </div>
  );
}

function Rank({ rank }) {
  return <td style={{ textAlign: "center", width: 48, color: "var(--muted)", fontSize: 16 }}>{rank}</td>;
}

/** One leaderboard as a table: rank, player, the ranked figure, then its supporting columns. */
function Board({ board, unfold, tournamentId }) {
  const [open, toggle] = useOpenRows(board.key);
  if (!board.rows.length) return <Empty>Nothing recorded yet for {board.title.toLowerCase()}.</Empty>;
  return (
    <div className="kc-pane lined flush kc-tbl">
      <table className="kc-st num" style={{ minWidth: 520 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "center" }}>#</th>
            <th className="l">Player</th>
            <th>{board.valueLabel}</th>
            {board.columns.map((c) => <th key={c}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {board.rows.map((r, i) => (
            <RowWithLines key={`${r.playerId}-${i}`} rowKey={`${r.playerId}-${i}`} open={open.has(i)} unfold={unfold} tournamentId={tournamentId} playerId={r.playerId} colSpan={3 + board.columns.length}>
              <tr>
                <Rank rank={r.rank} />
                <td className="l" style={{ whiteSpace: "normal", minWidth: 160 }}>
                  <span style={{ fontWeight: "var(--w-strong)" }}><PlayerName playerId={r.playerId}>{r.playerName}</PlayerName></span>
                  {unfold && <LinesToggle open={open.has(i)} onToggle={() => toggle(i)} noun={unfold.noun} name={r.playerName} />}
                  <span className="kc-cap" style={{ display: "block" }}>
                    {r.teamName}{r.note ? ` · ${r.note}` : ""}
                  </span>
                </td>
                <td className="kc-figure" style={{ fontSize: 20, color: "var(--deep)" }}>{r.value}</td>
                {board.columns.map((c) => (
                  <td key={c}>{r.detail[c] ?? "—"}</td>
                ))}
              </tr>
            </RowWithLines>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A family of boards (batting, bowling, fielding) with a chip to pick one. */
/** `unfold`: what each row opens into (batting boards: innings; bowling: spells). */
function BoardSet({ boards, label, unfold, tournamentId }) {
  const [active, setActive] = useState(boards[0]?.key);
  const board = boards.find((b) => b.key === active) ?? boards[0];
  if (!board) return <Empty>Nothing recorded yet.</Empty>;
  return (
    <div>
      <div className="kc-chips" role="tablist" aria-label={label} style={{ margin: "16px 0 20px" }}>
        {boards.map((b) => (
          <button key={b.key} type="button" role="tab" className="kc-chip" aria-selected={b.key === board.key} onClick={() => setActive(b.key)}>
            {b.key === board.key && <CheckIcon />} {b.title}
          </button>
        ))}
      </div>
      <Board board={board} unfold={unfold} tournamentId={tournamentId} />
      {board.qualification && <p className="kc-cap" style={{ marginTop: 14 }}>{board.qualification}</p>}
    </div>
  );
}

function PointsTable({ groups, notes }) {
  const anyPlayed = groups.some((g) => g.rows.some((r) => r.played > 0));
  const showDrawn = groups.some((g) => g.rows.some((r) => r.drawn > 0));
  return (
    <div>
      {!anyPlayed && <Empty>The table fills in as matches are completed.</Empty>}
      {groups.map((g) => (
        <section key={g.groupName} style={{ marginBottom: 26 }}>
          {groups.length > 1 && (
            <div className="kc-sechd" style={{ marginTop: 8 }}>
              <h2 className="kc-h2">Group {g.groupName}</h2>
            </div>
          )}
          <div className="kc-pane lined flush kc-tbl">
            <table className="kc-st num" style={{ minWidth: 680 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "center" }}>#</th>
                  <th className="l">Team</th>
                  <th>{abbr("Played", "P")}</th>
                  <th>{abbr("Won", "W")}</th>
                  <th>{abbr("Lost", "L")}</th>
                  <th>{abbr("Points", "Pts")}</th>
                  <th>{abbr("Net run rate", "NRR")}</th>
                  <th>{abbr("Tied", "T")}</th>
                  {showDrawn && <th>{abbr("Drawn", "D")}</th>}
                  <th>{abbr("No result", "NR")}</th>
                  <th>For</th>
                  <th>Against</th>
                  <th className="l">Last 5</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.teamId}>
                    <Rank rank={r.rank} />
                    <td className="l" style={{ fontWeight: "var(--w-strong)" }}>{r.teamName}</td>
                    <td>{r.played}</td>
                    <td>{r.won}</td>
                    <td>{r.lost}</td>
                    <td className="kc-figure" style={{ fontSize: 20, color: "var(--deep)" }}>{r.points}</td>
                    <td style={{ color: r.netRunRate > 0 ? "var(--success-ink)" : r.netRunRate < 0 ? "var(--danger-ink)" : "var(--ink)" }}>
                      {r.netRunRate > 0 ? "+" : ""}{r.netRunRate.toFixed(3)}
                    </td>
                    <td>{r.tied}</td>
                    {showDrawn && <td>{r.drawn}</td>}
                    <td>{r.noResult}</td>
                    <td style={{ color: "var(--muted)" }}>{r.runsFor}/{r.oversFor}</td>
                    <td style={{ color: "var(--muted)" }}>{r.runsAgainst}/{r.oversAgainst}</td>
                    <td className="l">
                      <span style={{ display: "inline-flex", gap: 4 }}>
                        {r.form.length === 0 && <span style={{ color: "var(--muted)" }}>—</span>}
                        {r.form.map((f, i) => (
                          <span key={i} title={{ W: "Won", L: "Lost", T: "Tied", D: "Drawn", NR: "No result" }[f]} style={{ ...RESULT_STYLE[f], borderRadius: 6, padding: "1px 6px", fontSize: 12, fontWeight: "var(--w-strong)" }}>
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
        </section>
      ))}
      <Notes notes={notes.slice(0, 2)} />
    </div>
  );
}

function RecordList({ title, records }) {
  return (
    <div className="kc-pane lined flush" style={{ padding: "16px 20px" }}>
      <h3 style={{ fontSize: 17, margin: "0 0 8px", fontWeight: "var(--w-strong)" }}>{title}</h3>
      {records.length === 0 && <p className="kc-cap" style={{ margin: 0 }}>Nothing yet.</p>}
      {records.map((r, i) => (
        <div key={i} style={{ padding: "8px 0", borderTop: i ? "1px solid var(--hair)" : "none" }}>
          <div className="num" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontWeight: "var(--w-strong)" }}>{r.teamName}</span>
            <strong style={{ color: "var(--deep)", fontWeight: "var(--w-strong)" }}>{r.value}</strong>
          </div>
          <div className="kc-cap">{r.detail}</div>
        </div>
      ))}
    </div>
  );
}

function Summary({ stats }) {
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
      <ChampionBanner name={stats.championName} />
      <div className="cols" style={{ "--cols": 3, "--cols-sm": 2, gap: 12 }}>
        <Tile label="Matches played" value={`${s.matchesCompleted}/${s.totalMatches}`} hint={s.matchesInProgress > 0 ? `${s.matchesInProgress} in progress` : undefined} />
        <Tile label="Runs" value={s.totalRuns} hint={`${s.extras} extras`} />
        <Tile label="Wickets" value={s.totalWickets} />
        <Tile label="Sixes" value={s.sixes} hint={`${s.fours} fours`} />
        <Tile label="Fifties" value={s.fifties} />
        <Tile label="Hundreds" value={s.hundreds} />
      </div>

      {leaders.length > 0 && (
        <>
          <div className="kc-sechd"><h2 className="kc-h2">Leading the way</h2></div>
          <div className="kc-pane lined flush" style={{ padding: "6px 20px" }}>
            {leaders.map(([label, value], i) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 0", borderTop: i ? "1px solid var(--hair)" : "none" }}>
                <span className="kc-sub">{label}</span>
                <strong className="num" style={{ fontWeight: "var(--w-strong)", textAlign: "right" }}>{value}</strong>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="kc-sechd"><h2 className="kc-h2">Team records</h2></div>
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
    <div style={{ marginTop: 20 }}>
      <Board board={stats.mvp} />

      <div className="kc-sechd"><h2 className="kc-h2">Player of the match</h2></div>
      {stats.playersOfMatch.length === 0 && <Empty>Awarded to the highest points scorer once a match is complete.</Empty>}
      <div className="cols" style={{ "--cols": 2, gap: 12 }}>
        {stats.playersOfMatch.map((p) => (
          <div key={p.matchId} className="kc-pane lined flush" style={{ padding: "14px 18px", display: "flex", gap: 12, alignItems: "center" }}>
            <TrophyIcon size={22} style={{ color: "var(--deep)" }} />
            <div style={{ minWidth: 0 }}>
              <div className="kc-cap">Match {p.matchNumber} · {p.fixture}</div>
              <div style={{ fontWeight: "var(--w-strong)" }}>
                <PlayerName playerId={p.playerId}>{p.playerName}</PlayerName> <span style={{ fontWeight: 400, color: "var(--muted)" }}>· {p.teamName}</span>
              </div>
              <div className="num" style={{ fontSize: 14 }}>{p.summary || "—"} · <strong style={{ fontWeight: "var(--w-strong)" }}>{p.points} pts</strong></div>
            </div>
          </div>
        ))}
      </div>

      <details className="kc-pane lined flush" style={{ padding: "16px 20px", marginTop: 20 }}>
        <summary style={{ cursor: "pointer", fontWeight: "var(--w-strong)" }}>How MVP points are scored</summary>
        <table className="kc-st num" style={{ marginTop: 10 }}>
          <tbody>
            {stats.pointsSystem.map((r, i) => (
              <tr key={i}>
                <td className="l kc-cap">{r.category}</td>
                <td className="l" style={{ whiteSpace: "normal" }}>{r.item}</td>
                <td style={{ fontWeight: "var(--w-strong)", color: r.points < 0 ? "var(--danger-ink)" : "var(--deep)" }}>
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
    <div style={{ marginTop: 26, paddingTop: 14, borderTop: "1px solid var(--hair)" }}>
      <p className="kc-cap" style={{ margin: "0 0 6px", color: "var(--ink)", fontWeight: "var(--w-strong)" }}>How these numbers are counted</p>
      {notes.map((n, i) => (
        <p key={i} className="kc-cap" style={{ margin: "0 0 6px", lineHeight: 1.5 }}>{n}</p>
      ))}
    </div>
  );
}

function Players({ stats, tournamentId }) {
  const [family, setFamily] = useState("batting");
  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div className="kc-seg filter" role="tablist" aria-label="Leaderboards">
          {FAMILIES.map((f) => (
            <button key={f.key} type="button" role="tab" aria-selected={family === f.key} onClick={() => setFamily(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
        <span className="kc-grow" />
        <span className="kc-cap">{stats.basis}</span>
      </div>
      <div key={family} className="view-in">
        {family === "batting" && <BoardSet boards={stats.battingBoards} label="Batting leaderboards" unfold={{ kinds: ["batting"], noun: "Innings" }} tournamentId={tournamentId} />}
        {family === "bowling" && <BoardSet boards={stats.bowlingBoards} label="Bowling leaderboards" unfold={{ kinds: ["bowling"], noun: "Spells" }} tournamentId={tournamentId} />}
        {family === "fielding" && <BoardSet boards={stats.fieldingBoards} label="Fielding leaderboards" />}
        {family === "mvp" && <Mvp stats={stats} />}
      </div>
    </div>
  );
}

/** Player names on this page open their profile (`onOpenPlayer(playerId)`). `view`: table | summary | stats, or all three. */
export default function CricketStats({ onOpenPlayer, ...props }) {
  return (
    <OpenPlayerContext.Provider value={onOpenPlayer ?? null}>
      <CricketStatsBody {...props} />
    </OpenPlayerContext.Provider>
  );
}

function CricketStatsBody({ tournamentId, refreshKey, view }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const src = useSource();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError("");
      try {
        const data = await src.cricketStats(tournamentId);
        if (!cancelled) setStats(data);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [src, tournamentId, refreshKey]);

  if (error) return <ErrorBanner message={error} />;
  if (!stats) return <p className="kc-cap">Loading stats…</p>;

  if (view === "table") return <PointsTable groups={stats.pointsTable} notes={stats.notes} />;
  if (view === "summary") return <Summary stats={stats} />;
  if (view === "stats") return <Players stats={stats} tournamentId={tournamentId} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="kc-sechd" style={{ marginTop: 0 }}><h2 className="kc-h2">Points table</h2></div>
      <PointsTable groups={stats.pointsTable} notes={[]} />
      <div className="kc-sechd"><h2 className="kc-h2">Summary</h2></div>
      <Summary stats={stats} />
      <div className="kc-sechd"><h2 className="kc-h2">Players</h2></div>
      <Players stats={stats} tournamentId={tournamentId} />
    </div>
  );
}
