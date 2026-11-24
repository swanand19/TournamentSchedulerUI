import { useEffect, useState } from "react";
import { createTournament } from "../api/tournamentsApi";
import { themeFor, font } from "../theme";
import { Card, Errors, Heading, Logo, Page } from "../clubs/parts";
import { button, input, label, useRun } from "../clubs/style";

// A league's page on the web (canvas "Leagues and seasons", the phone's boards in one page): who runs it and its totals,
// then Seasons (being played, still to play, played, each with its winner), Stats (every season or one; Batting · Bowling
// · Fielding · MVP — football: Scoring · Playing · Discipline — each a row of leaderboard chips, as a tournament's Stats
// tab) and Teams (titles, and every team's record). The same page serves the signed-out link (/leagues/<code>) through
// `source`; there a season links to its live scores. Organisers get "Start Season N" and the settings.

const SECTIONS = [
  { key: "live", title: "BEING PLAYED" },
  { key: "upcoming", title: "STILL TO PLAY" },
  { key: "past", title: "PLAYED" },
];

export default function LeaguePage({ source, back, onBack, onOpenSeason, onSettings, onOpenPlayer, onCreated, onGone }) {
  const [league, setLeague] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("seasons");
  const theme = themeFor(league?.sport ?? "Cricket");

  useEffect(() => {
    source
      .get()
      .then((l) => {
        setLeague(l);
        document.title = `${l.name} · KickCricket`;
      })
      .catch((e) => {
        if (e.status === 404 && onGone) onGone(e.message);
        else setError(e.message);
      });
  }, [source, onGone]);

  if (!league) {
    return (
      <Page theme={theme} back={back} onBack={onBack} title="League">
        <Errors message={error} />
        {!error && <p style={{ color: theme.onDarkMuted }}>Loading…</p>}
      </Page>
    );
  }

  const runBy = league.runBy.length === 0 ? null : `Run by ${league.runBy.length === 1 ? league.runBy[0] : `${league.runBy.slice(0, -1).join(", ")} and ${league.runBy.at(-1)}`}`;
  return (
    <Page
      theme={theme}
      back={back}
      onBack={onBack}
      eyebrow={[`${theme.label} league`, league.area].filter(Boolean).join(" · ")}
      title={league.name}
      logo={league.logoUrl ?? null}
      logoName={league.shortName}
    >
      {runBy && <p style={{ margin: 0, color: theme.onDarkMuted }}>{runBy}</p>}
      <Card theme={theme} style={{ flexDirection: "row", justifyContent: "space-around", textAlign: "center", padding: "0.8rem" }}>
        {[
          [league.totals.seasons, league.totals.seasons === 1 ? "Season" : "Seasons"],
          [league.totals.teams, league.totals.teams === 1 ? "Team" : "Teams"],
          [league.totals.matches, league.totals.matches === 1 ? "Match" : "Matches"],
          [league.totals.champions, league.totals.champions === 1 ? "Champion" : "Champions"],
        ].map(([n, word]) => (
          <div key={word}>
            <div style={{ fontFamily: font.display, fontSize: 26 }}>{n}</div>
            <div style={{ fontSize: 13, color: theme.muted }}>{word}</div>
          </div>
        ))}
      </Card>
      {league.canManage && onSettings && (
        <button type="button" onClick={onSettings} style={{ ...button(theme, "secondary"), color: theme.onDark, borderColor: theme.borderOnDark, alignSelf: "flex-start" }}>
          League settings
        </button>
      )}

      <div role="tablist" aria-label="League" style={{ display: "flex", gap: 24, borderBottom: `1px solid ${theme.borderOnDark}` }}>
        {[
          ["seasons", "Seasons"],
          ["stats", "Stats"],
          ["teams", "Teams"],
        ].map(([key, text]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            style={{ background: "none", border: "none", borderBottom: `3px solid ${tab === key ? theme.accent : "transparent"}`, color: tab === key ? theme.onDark : theme.onDarkMuted, fontWeight: 600, fontSize: 15, padding: "0.6rem 0", marginBottom: -1, cursor: "pointer", minHeight: 44 }}
          >
            {text}
          </button>
        ))}
      </div>

      {tab === "seasons" && <Seasons league={league} theme={theme} source={source} onOpenSeason={onOpenSeason} onCreated={onCreated} />}
      {tab === "stats" && <Stats league={league} theme={theme} source={source} onOpenPlayer={onOpenPlayer} />}
      {tab === "teams" && <Teams league={league} theme={theme} source={source} />}
    </Page>
  );
}

function Seasons({ league, theme, source, onOpenSeason, onCreated }) {
  const [starting, setStarting] = useState(false);
  const [name, setName] = useState(`${league.shortName} ${league.nextSeason}`);
  const r = useRun();

  const start = async (e) => {
    e.preventDefault();
    const t = await r.run("start", () => createTournament(name.trim(), league.sport, undefined, undefined, league.leagueId));
    if (t) onCreated?.(t);
  };

  return (
    <>
      <Errors message={r.error} />
      {league.canManage && !source.isPublic && (
        starting ? (
          <Card theme={theme}>
            <form onSubmit={start} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label htmlFor="season-name" style={label(theme)}>
                New {theme.label.toLowerCase()} tournament · Season {league.nextSeason} of {league.name}
              </label>
              <input id="season-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} style={input} />
              <p style={{ margin: 0, fontSize: 13, color: theme.muted }}>
                Public, like every tournament: anyone can find and watch it. Bring back earlier seasons’ teams from its Teams page.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="submit" disabled={!name.trim() || !!r.busy} style={button(theme)}>{r.busy ? "Creating…" : "Create tournament"}</button>
                <button type="button" onClick={() => setStarting(false)} style={button(theme, "secondary")}>Cancel</button>
              </div>
            </form>
          </Card>
        ) : (
          <button type="button" onClick={() => setStarting(true)} style={{ ...button(theme), alignSelf: "flex-start" }}>
            + Start Season {league.nextSeason}
          </button>
        )
      )}
      {league.seasons.length === 0 ? (
        <p style={{ color: theme.onDarkMuted }}>
          {league.canManage ? "No seasons yet. Start Season 1, or tick tournaments you've already run here in from the league's settings." : "Its first season shows here once it starts."}
        </p>
      ) : (
        SECTIONS.map((section) => {
          const rows = league.seasons.filter((s) => s.section === section.key);
          if (rows.length === 0) return null;
          return (
            <div key={section.key} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Heading theme={theme}>{section.title}</Heading>
              {rows.map((s) => {
                const href = source.isPublic && s.liveCode ? `/live/${s.liveCode}` : null;
                const body = (
                  <>
                    <span aria-hidden="true" style={{ width: 52, height: 52, borderRadius: 14, border: `1px ${s.section === "upcoming" ? "dashed" : "solid"} ${s.section === "live" ? theme.accent : "#d8d4c8"}`, display: "inline-flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 9, letterSpacing: "0.08em", color: theme.muted, fontWeight: 600 }}>SEASON</span>
                      <span style={{ fontSize: 20, fontWeight: 700 }}>{s.number}</span>
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ display: "block", fontWeight: 600 }}>{s.title}</strong>
                      <span style={{ fontSize: 13, color: theme.muted }}>{s.hidden ? `${s.line} · hidden by KickCricket` : s.line}</span>
                    </span>
                    {s.section === "live" ? (
                      <span style={{ fontSize: 12, fontWeight: 700, padding: "0.25rem 0.6rem", borderRadius: 6, background: "#d93c3c", color: "#fff" }}>LIVE</span>
                    ) : s.championName ? (
                      <span style={{ fontSize: 12, fontWeight: 700, padding: "0.25rem 0.6rem", borderRadius: 6, background: theme.accent, color: theme.accentInk }}>🏆 Won</span>
                    ) : null}
                  </>
                );
                const rowStyle = { display: "flex", alignItems: "center", gap: 12, background: theme.cream, color: theme.ink, borderRadius: 10, padding: "0.8rem 1rem", textAlign: "left", textDecoration: "none", border: "none", width: "100%", boxSizing: "border-box", cursor: "pointer", fontSize: 15 };
                if (href) return <a key={s.tournamentId} href={href} className="pressable" style={rowStyle}>{body}</a>;
                if (!source.isPublic && (s.canOpen || s.liveCode))
                  return <button key={s.tournamentId} type="button" className="pressable" onClick={() => onOpenSeason?.(s)} style={rowStyle}>{body}</button>;
                return <div key={s.tournamentId} style={{ ...rowStyle, cursor: "default" }}>{body}</div>;
              })}
            </div>
          );
        })
      )}
    </>
  );
}

function Stats({ league, theme, source, onOpenPlayer }) {
  const [season, setSeason] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [groupKey, setGroupKey] = useState(null);
  const [boardKeys, setBoardKeys] = useState({});
  const [all, setAll] = useState(false);

  useEffect(() => {
    let live = true;
    source
      .stats(season)
      .then((s) => live && setStats(s))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [source, season]);

  const group = stats?.groups.find((g) => g.key === groupKey) ?? stats?.groups[0];
  const board = group ? (group.boards.find((b) => b.key === boardKeys[group.key]) ?? group.boards[0]) : null;
  const rows = board ? (all ? board.rows : board.rows.slice(0, 5)) : [];
  const chip = (on) => ({
    minHeight: 36,
    whiteSpace: "nowrap",
    flexShrink: 0,
    background: on ? theme.accent : "rgba(247,245,239,0.1)",
    color: on ? theme.accentInk : theme.onDark,
    border: on ? `1px solid ${theme.accent}` : "1px solid rgba(247,245,239,0.22)",
    borderRadius: 999,
    padding: "0.35rem 0.9rem",
    fontSize: 14,
    fontWeight: on ? 700 : 500,
    cursor: "pointer",
  });
  const row = { display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 };

  return (
    <>
      <div role="group" aria-label="Seasons" style={row}>
        <button type="button" aria-pressed={season == null} onClick={() => setSeason(null)} style={chip(season == null)}>All seasons</button>
        {[...league.seasons].sort((a, b) => b.number - a.number).map((s) => (
          <button key={s.number} type="button" aria-pressed={season === s.number} onClick={() => setSeason(s.number)} style={chip(season === s.number)}>
            Season {s.number}
          </button>
        ))}
      </div>
      <Errors message={error} />
      {!stats ? (
        !error && <p style={{ color: theme.onDarkMuted }}>Loading…</p>
      ) : (
        <>
          <div role="tablist" aria-label="Stats" style={{ display: "flex", gap: 6, background: "rgba(247,245,239,0.08)", borderRadius: 999, padding: 4 }}>
            {stats.groups.map((g) => (
              <button
                key={g.key}
                role="tab"
                aria-selected={group?.key === g.key}
                onClick={() => {
                  setGroupKey(g.key);
                  setAll(false);
                }}
                style={{ flex: 1, minHeight: 40, borderRadius: 999, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14, background: group?.key === g.key ? "rgba(247,245,239,0.22)" : "transparent", color: theme.onDark }}
              >
                {g.title}
              </button>
            ))}
          </div>
          {group && group.boards.length > 1 && (
            <div role="group" aria-label={`${group.title} leaderboards`} style={row}>
              {group.boards.map((b) => (
                <button
                  key={b.key}
                  type="button"
                  aria-pressed={board?.key === b.key}
                  onClick={() => {
                    setBoardKeys((k) => ({ ...k, [group.key]: b.key }));
                    setAll(false);
                  }}
                  style={chip(board?.key === b.key)}
                >
                  {b.title}
                </button>
              ))}
            </div>
          )}
          {board && (
            <Card theme={theme} style={{ gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                <strong style={{ fontSize: 17 }}>{board.title}</strong>
                <span style={{ fontSize: 13, color: theme.muted }}>{stats.basis.split(" · ")[0]}</span>
              </div>
              {board.qualification && <span style={{ fontSize: 13, color: theme.muted }}>{board.qualification}</span>}
              {rows.length === 0 && <p style={{ color: theme.muted, margin: "8px 0" }}>Nobody yet.</p>}
              {rows.map((r, i) => {
                const content = (
                  <>
                    <span style={{ width: 22, textAlign: "center", color: theme.muted, fontWeight: 700 }}>{r.rank}</span>
                    <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                      <strong style={{ display: "block", fontWeight: 600 }}>{r.name}</strong>
                      <span style={{ fontSize: 13, color: theme.muted }}>{r.line}</span>
                    </span>
                    <span style={{ fontFamily: font.display, fontSize: 22 }}>{r.value}</span>
                  </>
                );
                const style = { display: "flex", alignItems: "center", gap: 12, padding: "0.6rem 0", background: "none", border: "none", borderTop: "1px solid #e4e0d4", width: "100%", boxSizing: "border-box", color: theme.ink, fontSize: 15 };
                return onOpenPlayer ? (
                  <button key={`${r.playerId}-${i}`} type="button" onClick={() => onOpenPlayer(r)} style={{ ...style, cursor: "pointer" }}>{content}</button>
                ) : (
                  <div key={`${r.playerId}-${i}`} style={style}>{content}</div>
                );
              })}
              {!all && board.rows.length > 5 && (
                <button type="button" onClick={() => setAll(true)} style={{ ...button(theme, "secondary"), marginTop: 6 }}>See all {board.rows.length}</button>
              )}
            </Card>
          )}
          {stats.notes.map((n) => (
            <p key={n} style={{ margin: 0, fontSize: 13, color: theme.onDarkMuted }}>{n}</p>
          ))}
        </>
      )}
    </>
  );
}

function Teams({ league, theme, source }) {
  const [teams, setTeams] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    source.teams().then(setTeams).catch((e) => setError(e.message));
  }, [source]);
  const seasonsLine = league.totals.seasons === 1 ? "Season 1" : league.totals.seasons > 1 ? `Seasons 1–${league.totals.seasons}` : "";
  const th = { textAlign: "right", fontSize: 12, color: theme.muted, fontWeight: 600, padding: "0 0 8px 6px" };
  const td = { textAlign: "right", padding: "10px 0 10px 6px", borderTop: "1px solid #e4e0d4", fontVariantNumeric: "tabular-nums" };

  if (!teams) return error ? <Errors message={error} /> : <p style={{ color: theme.onDarkMuted }}>Loading…</p>;
  return (
    <>
      {teams.titles.length > 0 && (
        <Card theme={theme}>
          <strong style={{ fontSize: 17 }}>Titles</strong>
          {teams.titles.map((t) => (
            <div key={t.name} style={{ display: "flex", alignItems: "center", gap: 12, borderTop: "1px solid #e4e0d4", paddingTop: 8 }}>
              <Logo name={t.name} link={null} size={36} theme={{ ...theme, surfaceOnDark: theme.accent, onDark: theme.accentInk }} />
              <span style={{ flex: 1 }}>
                <strong style={{ display: "block", fontWeight: 600 }}>{t.name}</strong>
                <span style={{ fontSize: 13, color: theme.muted }}>{t.seasons.length === 1 ? `Season ${t.seasons[0]}` : `Seasons ${t.seasons.join(", ")}`}</span>
              </span>
              <span style={{ fontFamily: font.display, fontSize: 22 }}>🏆 {t.count}</span>
            </div>
          ))}
        </Card>
      )}
      <Card theme={theme}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <strong style={{ fontSize: 17 }}>Every team</strong>
          <span style={{ fontSize: 13, color: theme.muted }}>{seasonsLine}</span>
        </div>
        {teams.teams.length === 0 ? (
          <p style={{ color: theme.muted, margin: 0 }}>No teams yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: "left", paddingLeft: 0 }}>Team</th>
                  <th style={th}>Seasons</th>
                  <th style={th}>Played</th>
                  <th style={th}>Won</th>
                  <th style={th}>Win %</th>
                </tr>
              </thead>
              <tbody>
                {teams.teams.map((t, i) => (
                  <tr key={`${t.name}-${i}`}>
                    <td style={{ ...td, textAlign: "left", paddingLeft: 0, fontWeight: 600 }}>{t.name}</td>
                    <td style={td}>{t.seasons}</td>
                    <td style={td}>{t.played}</td>
                    <td style={td}>{t.won}</td>
                    <td style={td}>{t.winPercent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p style={{ margin: 0, fontSize: 13, color: theme.onDarkMuted }}>{teams.note}</p>
    </>
  );
}
