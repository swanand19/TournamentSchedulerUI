import { font, footballTheme as theme } from "./theme";
import { useState, useEffect } from "react";
import { getTournamentStats } from "./api/tournamentsApi";
import ErrorBanner from "./ErrorBanner";


const CREAM = "#F7F5EF";
const INK = "#1B1B1B";
const MUTED = "rgba(247,245,239,0.6)";

const BOARD_ICON = {
  goals: "⚽",
  assists: "🅰️",
  goalContributions: "✨",
  appearances: "👕",
  minutes: "⏱",
  yellowCards: "🟨",
  redCards: "🟥",
  discipline: "⚖️",
  shootouts: "🎯",
};

function medal(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

function StatCard({ label, value, hint }) {
  return (
    <div style={{ background: "rgba(247,245,239,0.08)", border: "1px solid rgba(247,245,239,0.18)", borderRadius: 10, padding: "0.9rem 1rem" }}>
      <div style={{ fontFamily: font.display, fontSize: 28, color: "#F2A93B", lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{label}</div>
      {hint && <div style={{ fontSize: 11, color: "rgba(247,245,239,0.7)", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function EmptyBoard({ message }) {
  return (
    <div style={{ background: "rgba(247,245,239,0.05)", border: "1px dashed rgba(247,245,239,0.2)", borderRadius: 10, padding: "2rem 1rem", textAlign: "center" }}>
      <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>{message}</p>
    </div>
  );
}

function PlayerBoard({ board }) {
  if (!board.rows.length) {
    return <EmptyBoard message={`Nothing recorded yet for ${board.title.toLowerCase()}.`} />;
  }

  const cell = { padding: "0.6rem 0.7rem", fontSize: 14 };
  const head = { ...cell, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: theme.muted, fontWeight: 700, whiteSpace: "nowrap" };

  return (
    <div>
      {board.note && (
        <p style={{ fontSize: 12, color: MUTED, margin: "0 0 12px", lineHeight: 1.5 }}>ℹ️ {board.note}</p>
      )}

      <div style={{ overflowX: "auto", background: CREAM, color: INK, borderRadius: 12 }}>
        <table className="num" style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #E3DFD3" }}>
              <th style={{ ...head, width: 52, textAlign: "left" }}>#</th>
              <th style={{ ...head, textAlign: "left" }}>Player</th>
              <th style={{ ...head, textAlign: "left" }}>Team</th>
              <th style={{ ...head, textAlign: "right" }}>{board.valueLabel}</th>
              {board.detailColumns.map((c) => (
                <th key={c} style={{ ...head, textAlign: "right" }}>{c}</th>
              ))}
              {board.showPerMatch && <th style={{ ...head, textAlign: "right" }}>Per match</th>}
              <th style={{ ...head, textAlign: "right" }}>Apps</th>
              <th style={{ ...head, textAlign: "right" }}>Mins</th>
            </tr>
          </thead>
          <tbody>
            {board.rows.map((r) => (
              <tr key={r.playerId} style={{ borderBottom: "1px solid #EDEAE0" }}>
                <td style={{ ...cell, fontWeight: 700, color: theme.muted }}>
                  {medal(r.rank) || r.rank}
                </td>
                <td style={cell}>
                  <span style={{ fontWeight: 600 }}>
                    {r.jerseyNumber != null && <span style={{ color: theme.muted }}>#{r.jerseyNumber} </span>}
                    {r.playerName}
                  </span>
                  {r.position && (
                    <span style={{ fontSize: 11, color: theme.muted, display: "block" }}>{r.position}</span>
                  )}
                </td>
                <td style={{ ...cell, color: "#1B4332", fontWeight: 600 }}>{r.teamName}</td>
                <td style={{ ...cell, textAlign: "right", fontFamily: font.display, fontSize: 18, color: "#1B4332" }}>
                  {r.value}
                </td>
                {board.detailColumns.map((c) => (
                  <td key={c} style={{ ...cell, textAlign: "right", color: "#5b5850" }}>
                    {r.detail[c] ?? 0}{c === "Success %" ? "%" : ""}
                  </td>
                ))}
                {board.showPerMatch && (
                  <td style={{ ...cell, textAlign: "right", color: "#5b5850" }}>
                    {r.perMatch != null ? r.perMatch.toFixed(2) : "—"}
                  </td>
                )}
                <td style={{ ...cell, textAlign: "right", color: theme.muted }}>{r.appearances}</td>
                <td style={{ ...cell, textAlign: "right", color: theme.muted }}>{r.minutesPlayed}'</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StandingsTable({ standings }) {
  if (!standings.length) return <EmptyBoard message="No teams in this tournament yet." />;
  if (standings.every((r) => r.played === 0)) {
    return <EmptyBoard message="The table fills in as matches are completed." />;
  }

  const cell = { padding: "0.6rem 0.5rem", fontSize: 14, textAlign: "right" };
  const head = { ...cell, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: theme.muted, fontWeight: 700 };
  const grouped = standings.reduce((acc, r) => {
    const key = r.groupName || "—";
    (acc[key] = acc[key] || []).push(r);
    return acc;
  }, {});

  return (
    <div>
      <p style={{ fontSize: 12, color: MUTED, margin: "0 0 12px", lineHeight: 1.5 }}>
        ℹ️ 3 points for a win, 1 for a draw. A match decided by a shootout counts as a win for the
        team that won it, and goals for and against use the score in normal time only.
      </p>

      {Object.entries(grouped).map(([groupName, rows]) => (
        <div key={groupName} style={{ marginBottom: 20 }}>
          {Object.keys(grouped).length > 1 && (
            <h4 style={{ fontFamily: font.display, fontSize: 16, color: "#F2A93B", margin: "0 0 8px" }}>
              GROUP {groupName}
            </h4>
          )}
          <div style={{ overflowX: "auto", background: CREAM, color: INK, borderRadius: 12 }}>
            <table className="num" style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #E3DFD3" }}>
                  <th style={{ ...head, width: 40, textAlign: "left" }}>#</th>
                  <th style={{ ...head, textAlign: "left" }}>Team</th>
                  <th style={head} title="Played">P</th>
                  <th style={head} title="Won">W</th>
                  <th style={head} title="Drawn">D</th>
                  <th style={head} title="Lost">L</th>
                  <th style={head} title="Goals for">GF</th>
                  <th style={head} title="Goals against">GA</th>
                  <th style={head} title="Goal difference">GD</th>
                  <th style={head} title="Clean sheets">CS</th>
                  <th style={head} title="Yellow cards">🟨</th>
                  <th style={head} title="Red cards">🟥</th>
                  <th style={{ ...head, color: "#1B4332" }} title="Points">PTS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.teamId} style={{ borderBottom: "1px solid #EDEAE0" }}>
                    <td style={{ ...cell, textAlign: "left", fontWeight: 700, color: theme.muted }}>{r.rank}</td>
                    <td style={{ ...cell, textAlign: "left", fontWeight: 600 }}>
                      {r.teamName}
                      {(r.shootoutsWon > 0 || r.shootoutsLost > 0) && (
                        <span style={{ fontSize: 11, color: "#8a4b1b", marginLeft: 6 }}>
                          🎯 {r.shootoutsWon}W-{r.shootoutsLost}L
                        </span>
                      )}
                    </td>
                    <td style={cell}>{r.played}</td>
                    <td style={cell}>{r.won}</td>
                    <td style={cell}>{r.drawn}</td>
                    <td style={cell}>{r.lost}</td>
                    <td style={cell}>{r.goalsFor}</td>
                    <td style={cell}>{r.goalsAgainst}</td>
                    <td style={cell}>{r.goalDifference > 0 ? `+${r.goalDifference}` : r.goalDifference}</td>
                    <td style={cell}>{r.cleanSheets}</td>
                    <td style={cell}>{r.yellowCards}</td>
                    <td style={cell}>{r.redCards}</td>
                    <td style={{ ...cell, fontWeight: 400, fontFamily: font.display, fontSize: 18, color: "#1B4332" }}>
                      {r.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function Overview({ stats }) {
  const s = stats.summary;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginBottom: 20 }}>
        <StatCard label="Matches played" value={`${s.matchesCompleted}/${s.totalMatches}`}
          hint={s.matchesInProgress > 0 ? `${s.matchesInProgress} in progress` : undefined} />
        <StatCard label="Goals" value={s.totalGoals} hint={`${s.goalsPerMatch} per match`} />
        <StatCard label="Assists" value={s.totalAssists} />
        <StatCard label="Yellow cards" value={s.totalYellowCards} />
        <StatCard label="Red cards" value={s.totalRedCards} />
        <StatCard label="Clean sheets" value={s.cleanSheets} />
        <StatCard label="Draws" value={s.matchesDrawn} />
        <StatCard label="Shootouts" value={s.shootoutsPlayed} />
        <StatCard label="Substitutions" value={s.totalSubstitutions} />
        <StatCard label="Players used" value={s.playersUsed} />
        <StatCard label="Teams" value={s.teamsInvolved} />
        {s.matchesAbandoned > 0 && <StatCard label="Abandoned" value={s.matchesAbandoned} />}
      </div>

      {(s.highestScoringMatch || s.biggestWin) && (
        <div style={{ background: CREAM, color: INK, borderRadius: 12, padding: "1rem 1.2rem", marginBottom: 20 }}>
          <h4 style={{ fontFamily: font.display, fontSize: 16, margin: "0 0 10px" }}>STANDOUT RESULTS</h4>
          {s.highestScoringMatch && (
            <p style={{ fontSize: 14, margin: "0 0 6px" }}>
              <strong style={{ color: "#8a4b1b" }}>Highest scoring:</strong> {s.highestScoringMatch}
            </p>
          )}
          {s.biggestWin && (
            <p style={{ fontSize: 14, margin: 0 }}>
              <strong style={{ color: "#8a4b1b" }}>Biggest win:</strong> {s.biggestWin}
            </p>
          )}
        </div>
      )}

      {/* Podium across the headline boards, so the overview answers "who's leading?" at a glance. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
        {stats.playerBoards
          .filter((b) => ["goals", "assists", "appearances", "minutes", "yellowCards", "redCards"].includes(b.key))
          .map((b) => (
            <div key={b.key} style={{ background: "rgba(247,245,239,0.06)", border: "1px solid rgba(247,245,239,0.15)", borderRadius: 10, padding: "0.9rem 1rem" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#F2A93B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                {BOARD_ICON[b.key]} {b.title}
              </div>
              {b.rows.slice(0, 3).map((r) => (
                <div key={r.playerId} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 14, padding: "3px 0" }}>
                  <span style={{ color: CREAM, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {medal(r.rank) || `${r.rank}.`} {r.playerName}
                    <span style={{ color: MUTED, fontSize: 11 }}> · {r.teamName}</span>
                  </span>
                  <strong style={{ color: "#F2A93B" }}>{r.value}</strong>
                </div>
              ))}
              {b.rows.length === 0 && <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>Nothing yet.</p>}
            </div>
          ))}
      </div>
    </div>
  );
}

export default function TournamentStats({ tournamentId, refreshKey }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getTournamentStats(tournamentId);
        if (!cancelled) setStats(data);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tournamentId, refreshKey]);

  if (loading) return <p style={{ color: MUTED }}>Loading stats…</p>;
  if (error) {
    return <ErrorBanner message={error} />;
  }
  if (!stats) return <p style={{ color: MUTED }}>No stats available.</p>;

  const tabs = [
    { key: "overview", label: "Overview", icon: "📊" },
    { key: "standings", label: "Table", icon: "🏆" },
    ...stats.playerBoards.map((b) => ({ key: b.key, label: b.title, icon: BOARD_ICON[b.key] || "•" })),
  ];

  const activeBoard = stats.playerBoards.find((b) => b.key === activeTab);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <h3 style={{ fontFamily: font.display, fontSize: 22, margin: 0 }}>TOURNAMENT STATS</h3>
        <span style={{ fontSize: 12, color: MUTED }}>{stats.basis}</span>
      </div>

      {/* Category tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        {tabs.map((t) => {
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                background: active ? "#F2A93B" : "rgba(247,245,239,0.1)",
                color: active ? INK : CREAM,
                border: active ? "1px solid #F2A93B" : "1px solid rgba(247,245,239,0.22)",
                borderRadius: 999,
                padding: "0.4rem 0.85rem",
                fontSize: 12,
                fontWeight: active ? 700 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {t.icon} {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === "overview" && <Overview stats={stats} />}
      {activeTab === "standings" && <StandingsTable standings={stats.standings} />}
      {activeBoard && <PlayerBoard board={activeBoard} />}

      {activeTab === "overview" && stats.notes.length > 0 && (
        <div style={{ marginTop: 22, paddingTop: 14, borderTop: "1px solid rgba(247,245,239,0.15)" }}>
          <p style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px", fontWeight: 700 }}>
            How these numbers are counted
          </p>
          {stats.notes.map((n, i) => (
            <p key={i} style={{ fontSize: 12, color: "rgba(247,245,239,0.7)", margin: "0 0 4px", lineHeight: 1.5 }}>• {n}</p>
          ))}
        </div>
      )}
    </div>
  );
}
