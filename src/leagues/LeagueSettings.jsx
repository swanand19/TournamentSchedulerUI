import { useEffect, useState } from "react";
import {
  addLeagueOrganiser,
  addLeagueSeason,
  deleteLeague,
  getLeague,
  leagueCandidates,
  removeLeagueLogo,
  removeLeagueOrganiser,
  removeLeagueSeason,
  setLeagueLogo,
  updateLeague,
} from "../api/leaguesApi";
import PictureField from "../PictureField";
import { themeFor } from "../theme";
import { Card, Errors, Page } from "../clubs/parts";
import { button, input, label, useRun } from "../clubs/style";

// League settings (board League-Settings, its organisers only): name, short name and area, the logo, the organisers (as
// many as the league likes, never none), its seasons (take one out; tick in a tournament already run here), its public
// link, and deleting it — its tournaments stay.

export default function LeagueSettings({ leagueId, onBack, onDeleted }) {
  const [league, setLeague] = useState(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [short, setShort] = useState("");
  const [area, setArea] = useState("");
  const [contact, setContact] = useState("");
  const [candidates, setCandidates] = useState(null);
  const [copied, setCopied] = useState(false);
  const r = useRun();
  const theme = themeFor(league?.sport ?? "Cricket");

  const show = (l) => {
    setLeague(l);
    setName(l.name);
    setShort(l.shortName);
    setArea(l.area ?? "");
  };

  useEffect(() => {
    getLeague(leagueId).then(show).catch((e) => setError(e.message));
  }, [leagueId]);

  if (!league) {
    return (
      <Page theme={theme} back="The league" onBack={onBack} title="League settings">
        <Errors message={error} />
      </Page>
    );
  }

  const changed = name.trim() !== league.name || short.trim() !== league.shortName || (area.trim() || null) !== (league.area ?? null);
  const save = async (e) => {
    e.preventDefault();
    const l = await r.run("save", () => updateLeague(league.leagueId, { name: name.trim(), shortName: short.trim(), area: area.trim() || null }));
    if (l) show(l);
  };
  const addOrganiser = async (e) => {
    e.preventDefault();
    const l = await r.run("organiser", () => addLeagueOrganiser(league.leagueId, contact.trim()));
    if (l) {
      show(l);
      setContact("");
    }
  };
  const removeOrganiser = async (o) => {
    if (!window.confirm(o.isMe ? `Stop running ${league.name}?` : `Remove ${o.name}? They won't be able to start its seasons or change it any more.`)) return;
    const l = await r.run("organiser", () => removeLeagueOrganiser(league.leagueId, o.userId));
    if (l) (o.isMe ? onBack() : show(l));
  };
  const takeOut = async (s) => {
    if (!window.confirm(`Take ${s.name} out of ${league.name}? The tournament stays, still public; the other seasons are numbered again.`)) return;
    const l = await r.run("season", () => removeLeagueSeason(league.leagueId, s.tournamentId));
    if (l) show(l);
  };
  const tickIn = async (tournamentId) => {
    const l = await r.run("season", () => addLeagueSeason(league.leagueId, tournamentId));
    if (l) {
      show(l);
      setCandidates(null);
    }
  };
  const showCandidates = async () => {
    const list = await r.run("candidates", () => leagueCandidates(league.sport));
    if (list) setCandidates(list);
  };
  const remove = async () => {
    if (!window.confirm(`Delete ${league.name}? Its tournaments stay, with their results, just not grouped any more.`)) return;
    const ok = await r.run("delete", () => deleteLeague(league.leagueId));
    if (ok) onDeleted();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(league.share.url);
      setCopied(true);
    } catch {
      window.prompt("Copy the league's link:", league.share.url);
    }
  };

  return (
    <Page theme={theme} back={league.name} onBack={onBack} eyebrow={league.name} title="League settings" width={640}>
      <Errors message={r.error} />
      {!league.canManage ? (
        <p style={{ color: theme.onDarkMuted }}>Only the league’s organisers can change it.</p>
      ) : (
        <>
          <Card theme={theme}>
            <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={label(theme)} htmlFor="league-name">League name</label>
              <input id="league-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} style={input} />
              <label style={label(theme)} htmlFor="league-short">Short name, shown on tournaments</label>
              <input id="league-short" value={short} onChange={(e) => setShort(e.target.value.toUpperCase())} maxLength={8} style={input} />
              <label style={label(theme)} htmlFor="league-area">Where it’s played (optional)</label>
              <input id="league-area" value={area} onChange={(e) => setArea(e.target.value)} maxLength={60} placeholder="e.g. Pune" style={input} />
              <button type="submit" disabled={!changed || !name.trim() || !!r.busy} style={{ ...button(theme), alignSelf: "flex-start" }}>Save</button>
            </form>
            <PictureField
              label="Logo"
              hint="Square. Shown on the league's page and beside its seasons."
              shape="square"
              link={league.logoUrl}
              name={league.name}
              upload={(image) => setLeagueLogo(league.leagueId, image)}
              remove={() => removeLeagueLogo(league.leagueId)}
              onChanged={(url) => setLeague({ ...league, logoUrl: url })}
              theme={theme}
            />
          </Card>

          <Card theme={theme}>
            <strong>Organisers</strong>
            {league.organisers.map((o) => (
              <div key={o.userId} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44 }}>
                <span style={{ flex: 1 }}>{o.name}{o.isMe ? " (you)" : ""}</span>
                {o.canRemove && (
                  <button type="button" onClick={() => removeOrganiser(o)} disabled={!!r.busy} style={button(theme, "secondary")}>
                    {o.isMe ? "Step down" : "Remove"}
                  </button>
                )}
              </div>
            ))}
            <form onSubmit={addOrganiser} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <label htmlFor="organiser" style={{ ...label(theme), flexBasis: "100%", marginBottom: 0 }}>Add an organiser (they need an account)</label>
              <input id="organiser" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="friend@example.com" style={input} />
              <button type="submit" disabled={!contact.trim() || !!r.busy} style={button(theme)}>Add</button>
            </form>
            <span style={{ fontSize: 13, color: theme.muted }}>Organisers start new seasons and own the seasons they start. A season’s own owners and scorers stay as they are.</span>
          </Card>

          <Card theme={theme}>
            <strong>Seasons</strong>
            {league.seasons.map((s) => (
              <div key={s.tournamentId} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44 }}>
                <span style={{ width: 24, textAlign: "center", fontWeight: 700, color: theme.muted }}>{s.number}</span>
                <span style={{ flex: 1 }}>{s.name}{s.hidden ? " · hidden by KickCricket" : ""}</span>
                <button type="button" onClick={() => takeOut(s)} disabled={!!r.busy} style={button(theme, "secondary")}>Take out</button>
              </div>
            ))}
            {candidates == null ? (
              <button type="button" onClick={showCandidates} disabled={!!r.busy} style={{ ...button(theme, "secondary"), alignSelf: "flex-start" }}>
                + Add a tournament as a season
              </button>
            ) : candidates.length === 0 ? (
              <span style={{ fontSize: 14, color: theme.muted }}>No other {theme.label.toLowerCase()} tournaments of yours to add.</span>
            ) : (
              candidates.map((c) => (
                <div key={c.tournamentId} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, borderTop: "1px solid #e4e0d4" }}>
                  <span style={{ flex: 1 }}>
                    <strong style={{ display: "block", fontWeight: 600 }}>{c.name}</strong>
                    <span style={{ fontSize: 13, color: theme.muted }}>{c.line}</span>
                  </span>
                  <button type="button" onClick={() => tickIn(c.tournamentId)} disabled={!!r.busy} style={button(theme)}>Add</button>
                </div>
              ))
            )}
            <span style={{ fontSize: 13, color: theme.muted }}>Seasons are numbered in date order.</span>
          </Card>

          {league.share?.url && (
            <Card theme={theme}>
              <strong>Anyone can find and watch this league</strong>
              <span style={{ fontSize: 13, color: theme.muted }}>Its page, every season, winners and all-time stats. Emails and numbers are never shown.</span>
              <button type="button" onClick={copy} style={{ ...button(theme, "secondary"), alignSelf: "flex-start" }}>{copied ? "Link copied" : "Copy the league’s link"}</button>
            </Card>
          )}

          <button type="button" onClick={remove} disabled={!!r.busy} style={{ ...button(theme, "danger"), alignSelf: "flex-start" }}>Delete the league</button>
          <span style={{ fontSize: 13, color: theme.onDarkMuted }}>Its tournaments stay, just not grouped any more.</span>
        </>
      )}
    </Page>
  );
}
