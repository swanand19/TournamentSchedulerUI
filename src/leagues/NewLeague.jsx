import { useEffect, useState } from "react";
import { createLeague, leagueCandidates } from "../api/leaguesApi";
import { themeFor } from "../theme";
import { Card, Errors, Page, Tick } from "../clubs/parts";
import { button, input, label, useRun } from "../clubs/style";

// Starting a league (board League-New): its name, the short name each season is named with ("CPL 4"), where it's played,
// and tournaments already run here that become its first seasons, numbered in date order. The logo is added from the
// league's settings once it exists.

export default function NewLeague({ sport, onBack, onCreated }) {
  const theme = themeFor(sport);
  const [name, setName] = useState("");
  const [short, setShort] = useState("");
  const [area, setArea] = useState("");
  const [candidates, setCandidates] = useState(null);
  const [ticked, setTicked] = useState(new Set());
  const r = useRun();

  useEffect(() => {
    leagueCandidates(sport).then(setCandidates).catch((e) => r.setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport]);

  const order = (candidates ?? []).filter((c) => ticked.has(c.tournamentId)).map((c) => c.tournamentId);
  const toggle = (id) =>
    setTicked((t) => {
      const next = new Set(t);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const start = async (e) => {
    e.preventDefault();
    const league = await r.run("create", () =>
      createLeague({ name: name.trim(), shortName: short.trim() || null, sport, area: area.trim() || null, tournamentIds: order }),
    );
    if (league) onCreated(league.leagueId);
  };

  return (
    <Page theme={theme} back="Your tournaments" onBack={onBack} eyebrow={`${theme.label} league`} title="New league" width={640}>
      <p style={{ margin: 0, color: theme.onDarkMuted }}>A league is the tournament you run again and again. Each time you run it is a season.</p>
      <Errors message={r.error} />
      <form onSubmit={start} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Card theme={theme}>
          <label style={label(theme)} htmlFor="new-league-name">Name</label>
          <input id="new-league-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="e.g. Corporate Premier League" style={input} />
          <label style={label(theme)} htmlFor="new-league-short">Short name, shown on tournaments</label>
          <input id="new-league-short" value={short} onChange={(e) => setShort(e.target.value.toUpperCase())} maxLength={8} placeholder="e.g. CPL" style={input} />
          <span style={{ fontSize: 13, color: theme.muted }}>Each new season is named with it: CPL 4. Left empty, it’s made from the name.</span>
          <label style={label(theme)} htmlFor="new-league-area">Where it’s played (optional)</label>
          <input id="new-league-area" value={area} onChange={(e) => setArea(e.target.value)} maxLength={60} placeholder="e.g. Pune" style={input} />
        </Card>
        <Card theme={theme}>
          <strong>Earlier seasons on KickCricket</strong>
          <span style={{ fontSize: 13, color: theme.muted }}>Tick tournaments you ran here before. They become Season 1, 2… in date order, with their winners and stats.</span>
          {candidates == null ? (
            <span style={{ color: theme.muted }}>Loading…</span>
          ) : candidates.length === 0 ? (
            <span style={{ color: theme.muted }}>None yet: its first season will be the next one you start.</span>
          ) : (
            candidates.map((c) => {
              const n = order.indexOf(c.tournamentId) + 1;
              return (
                <Tick
                  key={c.tournamentId}
                  theme={theme}
                  on={ticked.has(c.tournamentId)}
                  onToggle={() => toggle(c.tournamentId)}
                  title={n > 0 ? `${c.name} — Season ${n}` : c.name}
                  detail={c.line}
                />
              );
            })
          )}
          <span style={{ fontSize: 13, color: theme.muted }}>Only {theme.label.toLowerCase()} tournaments you own, and not in another league.</span>
        </Card>
        <p style={{ margin: 0, fontSize: 13, color: theme.onDarkMuted }}>
          Leagues are public, like every tournament: anyone can find and watch a league and every season in it. Emails and numbers are never shown.
        </p>
        <button type="submit" disabled={!name.trim() || !!r.busy} style={{ ...button(theme), alignSelf: "flex-start" }}>{r.busy ? "Starting…" : "Start the league"}</button>
      </form>
    </Page>
  );
}
