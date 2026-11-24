import { useState } from "react";
import { bringBackOptions, bringBackTeams } from "../api/leaguesApi";
import { Tick } from "../clubs/parts";
import { button, useRun } from "../clubs/style";

// "Bring back teams" on a league season's teams page before it starts (board League-BringBack): one earlier season at a
// time, newest first; each team comes back with the squad it ended with and keeps its league record and titles. A team
// already here, or whose name is taken, is greyed with the server's reason.

export default function BringBack({ tournamentId, league, theme, onDone }) {
  const [options, setOptions] = useState(null);
  const [season, setSeason] = useState(null);
  const [ticked, setTicked] = useState(new Set());
  const [notice, setNotice] = useState("");
  const r = useRun();

  const open = async () => {
    const o = await r.run("open", () => bringBackOptions(tournamentId));
    if (o) setOptions(o);
  };
  const bring = async () => {
    const res = await r.run("bring", () => bringBackTeams(tournamentId, [...ticked]));
    if (res) {
      setNotice(res.notice);
      setOptions(null);
      setTicked(new Set());
      onDone();
    }
  };
  const toggle = (id) =>
    setTicked((t) => {
      const next = new Set(t);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const shown = options?.seasons.find((s) => s.number === season) ?? options?.seasons[0];
  return (
    <section style={{ background: theme.cream, color: theme.ink, borderRadius: 12, padding: "1rem 1.2rem", display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
      <strong>Season {league.season} of {league.name}</strong>
      {r.error && <p role="alert" style={{ margin: 0, color: "#8a1c14" }}>{r.error}</p>}
      {notice && <p style={{ margin: 0, fontSize: 14 }}>{notice}</p>}
      {!options ? (
        <button type="button" onClick={open} disabled={!!r.busy} style={{ ...button(theme, "secondary"), alignSelf: "flex-start" }}>Bring back teams</button>
      ) : options.seasons.length === 0 ? (
        <p style={{ margin: 0, color: theme.muted }}>The league’s earlier seasons have no teams to bring back.</p>
      ) : (
        <>
          <span style={{ fontSize: 13, color: theme.muted }}>They keep their league record and titles, and come back with the squad they ended with. Change it afterwards as usual.</span>
          <div role="group" aria-label="Season" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {options.seasons.map((s) => (
              <button
                key={s.number}
                type="button"
                aria-pressed={shown?.number === s.number}
                onClick={() => setSeason(s.number)}
                style={{ minHeight: 36, borderRadius: 999, padding: "0.3rem 0.9rem", cursor: "pointer", fontWeight: 600, border: `1px solid ${theme.ink}33`, background: shown?.number === s.number ? theme.accent : "transparent", color: shown?.number === s.number ? theme.accentInk : theme.ink }}
              >
                {s.name}
              </button>
            ))}
          </div>
          {shown?.teams.map((t) => (
            <Tick key={t.teamId} theme={theme} on={ticked.has(t.teamId)} reason={t.reason} onToggle={() => toggle(t.teamId)} title={t.name} detail={t.line} />
          ))}
          <span style={{ fontSize: 13, color: theme.muted }}>A new team with an old team’s name starts its own record. Two teams in one season can’t share a name.</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={bring} disabled={ticked.size === 0 || !!r.busy} style={button(theme)}>
              {ticked.size === 0 ? "Bring back teams" : `Bring back ${ticked.size === 1 ? "1 team" : `${ticked.size} teams`}`}
            </button>
            <button type="button" onClick={() => setOptions(null)} style={button(theme, "secondary")}>Cancel</button>
          </div>
        </>
      )}
    </section>
  );
}
