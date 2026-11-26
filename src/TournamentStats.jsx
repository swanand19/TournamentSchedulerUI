import { useState, useEffect } from "react";
import { useSource } from "./api/source";
import ErrorBanner from "./ErrorBanner";
import ChampionBanner from "./ChampionBanner";
import PlayerName from "./PlayerName";
import { LinesToggle, RowWithLines } from "./PlayerLines";
import { footballUnfold, useOpenRows } from "./statsRows";
import { OpenPlayerContext } from "./playerContext";
import { CheckIcon } from "./ui/icons";

// The football stats page in three views, the phone hub's tabs (2026-11-26): Table (group
// standings, 3/1/0), Summary (totals, standout results, who leads each headline board) and Stats (every
// player board as a full table; goals, assists and G+A rows unfold into the player's own, match by
// match). The public page shows all three, one after another.

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

function PlayerBoard({ board, tournamentId }) {
  const [open, toggle] = useOpenRows(board.key);
  if (!board.rows.length) return <Empty>Nothing recorded yet for {board.title.toLowerCase()}.</Empty>;
  // Goals, assists and G+A rows unfold into the player's goals and assists, match by match.
  const unfold = footballUnfold(board.key);
  const columns = 5 + board.detailColumns.length + (board.showPerMatch ? 1 : 0);

  return (
    <div>
      <div className="kc-pane lined flush kc-tbl">
        <table className="kc-st num" style={{ minWidth: 560 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "center" }}>#</th>
              <th className="l">Player</th>
              <th>{board.valueLabel}</th>
              {board.detailColumns.map((c) => <th key={c}>{c}</th>)}
              {board.showPerMatch && <th>Per match</th>}
              <th>Apps</th>
              <th>Mins</th>
            </tr>
          </thead>
          <tbody>
            {board.rows.map((r) => (
              <RowWithLines key={r.playerId} rowKey={r.playerId} open={open.has(r.playerId)} unfold={unfold} tournamentId={tournamentId} playerId={r.playerId} colSpan={columns}>
                <tr>
                  <td style={{ textAlign: "center", width: 48, color: "var(--muted)", fontSize: 16 }}>{r.rank}</td>
                  <td className="l" style={{ whiteSpace: "normal", minWidth: 170 }}>
                    <span style={{ fontWeight: "var(--w-strong)" }}>
                      {r.jerseyNumber != null && <span style={{ color: "var(--muted)", fontWeight: 400 }}>#{r.jerseyNumber} </span>}
                      <PlayerName playerId={r.playerId}>{r.playerName}</PlayerName>
                    </span>
                    {unfold && <LinesToggle open={open.has(r.playerId)} onToggle={() => toggle(r.playerId)} noun={unfold.noun[0].toUpperCase() + unfold.noun.slice(1)} name={r.playerName} />}
                    <span className="kc-cap" style={{ display: "block" }}>{[r.teamName, r.position].filter(Boolean).join(" · ")}</span>
                  </td>
                  <td className="kc-figure" style={{ fontSize: 20, color: "var(--deep)" }}>{r.value}</td>
                  {board.detailColumns.map((c) => (
                    <td key={c}>{r.detail[c] ?? 0}{c === "Success %" ? "%" : ""}</td>
                  ))}
                  {board.showPerMatch && <td>{r.perMatch != null ? r.perMatch.toFixed(2) : "—"}</td>}
                  <td style={{ color: "var(--muted)" }}>{r.appearances}</td>
                  <td style={{ color: "var(--muted)" }}>{r.minutesPlayed}'</td>
                </tr>
              </RowWithLines>
            ))}
          </tbody>
        </table>
      </div>
      {board.note && <p className="kc-cap" style={{ marginTop: 14 }}>{board.note}</p>}
    </div>
  );
}

function StandingsTable({ standings }) {
  if (!standings.length) return <Empty>No teams in this tournament yet.</Empty>;
  const grouped = standings.reduce((acc, r) => {
    const key = r.groupName || "—";
    (acc[key] = acc[key] || []).push(r);
    return acc;
  }, {});
  const many = Object.keys(grouped).length > 1;

  return (
    <div>
      {standings.every((r) => r.played === 0) && <Empty>The table fills in as matches are completed.</Empty>}
      {Object.entries(grouped).map(([groupName, rows]) => (
        <section key={groupName} style={{ marginBottom: 26 }}>
          {many && (
            <div className="kc-sechd" style={{ marginTop: 8 }}>
              <h2 className="kc-h2">Group {groupName}</h2>
            </div>
          )}
          <div className="kc-pane lined flush kc-tbl">
            <table className="kc-st num" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "center" }}>#</th>
                  <th className="l">Team</th>
                  <th title="Played">P</th>
                  <th title="Won">W</th>
                  <th title="Drawn">D</th>
                  <th title="Lost">L</th>
                  <th title="Goals for">GF</th>
                  <th title="Goals against">GA</th>
                  <th title="Goal difference">GD</th>
                  <th title="Clean sheets">CS</th>
                  <th title="Yellow cards">YC</th>
                  <th title="Red cards">RC</th>
                  <th title="Points">Pts</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.teamId}>
                    <td style={{ textAlign: "center", width: 48, color: "var(--muted)", fontSize: 16 }}>{r.rank}</td>
                    <td className="l" style={{ fontWeight: "var(--w-strong)" }}>
                      {r.teamName}
                      {(r.shootoutsWon > 0 || r.shootoutsLost > 0) && (
                        <span className="kc-cap" style={{ marginLeft: 6 }}>
                          shootouts {r.shootoutsWon}W-{r.shootoutsLost}L
                        </span>
                      )}
                    </td>
                    <td>{r.played}</td>
                    <td>{r.won}</td>
                    <td>{r.drawn}</td>
                    <td>{r.lost}</td>
                    <td>{r.goalsFor}</td>
                    <td>{r.goalsAgainst}</td>
                    <td>{r.goalDifference > 0 ? `+${r.goalDifference}` : r.goalDifference}</td>
                    <td>{r.cleanSheets}</td>
                    <td>{r.yellowCards}</td>
                    <td>{r.redCards}</td>
                    <td className="kc-figure" style={{ fontSize: 20, color: "var(--deep)" }}>{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <p className="kc-cap">
        3 points for a win, 1 for a draw. A match decided by a shootout counts as a win for the team that won it, and
        goals for and against use the score in normal time only.
      </p>
    </div>
  );
}

function Summary({ stats }) {
  const s = stats.summary;
  return (
    <div>
      <ChampionBanner name={stats.championName} />
      <div className="cols" style={{ "--cols": 4, "--cols-sm": 2, gap: 12 }}>
        <Tile label="Matches played" value={`${s.matchesCompleted}/${s.totalMatches}`} hint={s.matchesInProgress > 0 ? `${s.matchesInProgress} in progress` : undefined} />
        <Tile label="Goals" value={s.totalGoals} hint={`${s.goalsPerMatch} per match`} />
        <Tile label="Assists" value={s.totalAssists} />
        <Tile label="Clean sheets" value={s.cleanSheets} />
        <Tile label="Yellow cards" value={s.totalYellowCards} />
        <Tile label="Red cards" value={s.totalRedCards} />
        <Tile label="Draws" value={s.matchesDrawn} />
        <Tile label="Shootouts" value={s.shootoutsPlayed} />
        <Tile label="Substitutions" value={s.totalSubstitutions} />
        <Tile label="Players used" value={s.playersUsed} />
        <Tile label="Teams" value={s.teamsInvolved} />
        {s.matchesAbandoned > 0 && <Tile label="Abandoned" value={s.matchesAbandoned} />}
      </div>

      {(s.highestScoringMatch || s.biggestWin) && (
        <>
          <div className="kc-sechd"><h2 className="kc-h2">Standout results</h2></div>
          <div className="kc-pane lined flush" style={{ padding: "6px 20px" }}>
            {s.highestScoringMatch && (
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 0" }}>
                <span className="kc-sub">Highest scoring</span>
                <strong style={{ fontWeight: "var(--w-strong)", textAlign: "right" }}>{s.highestScoringMatch}</strong>
              </div>
            )}
            {s.biggestWin && (
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 0", borderTop: s.highestScoringMatch ? "1px solid var(--hair)" : "none" }}>
                <span className="kc-sub">Biggest win</span>
                <strong style={{ fontWeight: "var(--w-strong)", textAlign: "right" }}>{s.biggestWin}</strong>
              </div>
            )}
          </div>
        </>
      )}

      {/* Who leads the headline boards, so the summary answers "who's leading?" at a glance. */}
      <div className="kc-sechd"><h2 className="kc-h2">Leading the way</h2></div>
      <div className="cols" style={{ "--cols": 3, "--cols-sm": 1, gap: 12 }}>
        {stats.playerBoards
          .filter((b) => ["goals", "assists", "appearances", "minutes", "yellowCards", "redCards"].includes(b.key))
          .map((b) => (
            <div key={b.key} className="kc-pane lined flush" style={{ padding: "16px 20px" }}>
              <h3 style={{ fontSize: 17, margin: "0 0 8px", fontWeight: "var(--w-strong)" }}>{b.title}</h3>
              {b.rows.slice(0, 3).map((r, i) => (
                <div key={r.playerId} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "7px 0", borderTop: i ? "1px solid var(--hair)" : "none" }}>
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <span style={{ color: "var(--muted)" }}>{r.rank}.</span> <PlayerName playerId={r.playerId}>{r.playerName}</PlayerName>
                    <span className="kc-cap"> · {r.teamName}</span>
                  </span>
                  <strong className="num" style={{ color: "var(--deep)", fontWeight: "var(--w-strong)" }}>{r.value}</strong>
                </div>
              ))}
              {b.rows.length === 0 && <p className="kc-cap" style={{ margin: 0 }}>Nothing yet.</p>}
            </div>
          ))}
      </div>

      {stats.notes.length > 0 && (
        <div style={{ marginTop: 26, paddingTop: 14, borderTop: "1px solid var(--hair)" }}>
          <p className="kc-cap" style={{ margin: "0 0 6px", color: "var(--ink)", fontWeight: "var(--w-strong)" }}>How these numbers are counted</p>
          {stats.notes.map((n, i) => (
            <p key={i} className="kc-cap" style={{ margin: "0 0 4px", lineHeight: 1.5 }}>{n}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function Players({ stats, tournamentId }) {
  const [active, setActive] = useState(stats.playerBoards[0]?.key);
  const board = stats.playerBoards.find((b) => b.key === active) ?? stats.playerBoards[0];
  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div className="kc-chips" role="tablist" aria-label="Leaderboards">
          {stats.playerBoards.map((b) => (
            <button key={b.key} type="button" role="tab" className="kc-chip" aria-selected={board?.key === b.key} onClick={() => setActive(b.key)}>
              {board?.key === b.key && <CheckIcon />} {b.title}
            </button>
          ))}
        </div>
      </div>
      <p className="kc-cap" style={{ margin: "12px 0 18px" }}>{stats.basis}</p>
      {board ? (
        <div key={board.key} className="view-in">
          <PlayerBoard board={board} tournamentId={tournamentId} />
        </div>
      ) : (
        <Empty>Nothing recorded yet.</Empty>
      )}
    </div>
  );
}

/** Player names on this page open their profile (`onOpenPlayer(playerId)`). `view`: table | summary | stats, or all three. */
export default function TournamentStats({ onOpenPlayer, ...props }) {
  return (
    <OpenPlayerContext.Provider value={onOpenPlayer ?? null}>
      <TournamentStatsBody {...props} />
    </OpenPlayerContext.Provider>
  );
}

function TournamentStatsBody({ tournamentId, refreshKey, view }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const src = useSource();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError("");
      try {
        const data = await src.stats(tournamentId);
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

  if (view === "table") return <StandingsTable standings={stats.standings} />;
  if (view === "summary") return <Summary stats={stats} />;
  if (view === "stats") return <Players stats={stats} tournamentId={tournamentId} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="kc-sechd" style={{ marginTop: 0 }}><h2 className="kc-h2">Table</h2></div>
      <StandingsTable standings={stats.standings} />
      <div className="kc-sechd"><h2 className="kc-h2">Summary</h2></div>
      <Summary stats={stats} />
      <div className="kc-sechd"><h2 className="kc-h2">Players</h2></div>
      <Players stats={stats} tournamentId={tournamentId} />
    </div>
  );
}
