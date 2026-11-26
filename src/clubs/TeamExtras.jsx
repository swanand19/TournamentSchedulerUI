import { useEffect, useState } from "react";
import { acceptEntry, declineEntry, getEntries, keepTeam, setEntryCode } from "../api/clubsApi";
import { Card, Errors, Logo } from "./parts";
import { button, plural, useRun } from "./style";

// Lasting teams on the web's Teams screen (TeamManagement): the organiser's entries (board Org-Entries, step 3) and a
// tournament team's "Keep this team" (C-23, step 2). The server decides who sees what: entries for owners before the
// start, keeping for the team's own admins (`team.canKeep`).

/** "Teams can enter with a code", the code to send, and the entries waiting for Accept or Decline (C-7, C-10). */
export function EntriesPanel({ tournamentId, theme, onTeamsChanged }) {
  const [entries, setEntries] = useState(null);
  const [notice, setNotice] = useState("");
  const [open, setOpen] = useState(null); // the entry whose squad is shown
  const r = useRun();

  useEffect(() => {
    r.run("load", async () => setEntries(await getEntries(tournamentId)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  if (!entries) return r.error ? <Errors message={r.error} /> : null;

  const toggle = async () => {
    const next = await r.run("switch", () => setEntryCode(tournamentId, !entries.open));
    if (next) setEntries(next);
  };

  const answer = async (row, accept) => {
    if (!accept && !window.confirm(`Decline ${row.teamName}? ${row.requestedBy} will hear that you didn't take the entry.`)) return;
    const next = await r.run(`answer-${row.entryId}`, () => (accept ? acceptEntry : declineEntry)(tournamentId, row.entryId));
    if (!next) return;
    setNotice(next.notice ?? "");
    setEntries(next);
    if (accept) onTeamsChanged();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
      <Card theme={theme}>
        <Errors message={r.error} />
        <label style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, cursor: entries.closed && !entries.open ? "default" : "pointer" }}>
          <input type="checkbox" role="switch" checked={entries.open} disabled={!!r.busy || (!!entries.closed && !entries.open)} onChange={toggle} style={{ width: 20, height: 20 }} />
          <span>
            <strong>Teams can enter with a code</strong>
            <span style={{ display: "block", fontSize: 14, color: theme.muted }}>
              {entries.closed ?? "Send the code to the lasting teams you want. You accept or decline each one."}
            </span>
          </span>
        </label>
        {entries.open && entries.code && (
          <>
            <code style={{ fontSize: 26, letterSpacing: "0.22em", fontWeight: 700 }}>{entries.code}</code>
            <span style={{ fontSize: 14, color: theme.muted }}>
              A team’s admin opens their team, chooses Enter a tournament and types it. Entries close when you approve the schedule.
            </span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => navigator.clipboard?.writeText(entries.shareText ?? entries.code)} style={button(theme)}>Copy the invitation</button>
              {entries.url && <button onClick={() => navigator.clipboard?.writeText(entries.url)} style={button(theme, "secondary")}>Copy the link</button>}
            </div>
          </>
        )}
      </Card>

      {notice && <Card theme={theme}><span>{notice}</span></Card>}

      {entries.waiting.length > 0 && (
        <>
          <h3 style={{ margin: "4px 0 0", fontSize: 15, letterSpacing: "0.12em", color: theme.onDarkMuted }}>Asking to enter · {entries.waiting.length}</h3>
          {entries.waiting.map((row) => {
            const blocked = row.players.filter((p) => p.reason);
            return (
              <Card key={row.entryId} theme={theme}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Logo link={row.logoUrl} name={row.clubName} size={44} theme={{ ...theme, onDark: theme.ink, surfaceOnDark: "var(--hair)", borderOnDark: "var(--hair)" }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <strong>{row.teamName}</strong>
                    <span style={{ display: "block", fontSize: 13, color: theme.muted }}>
                      {[row.area, plural(row.players.length, "player"), row.record].filter(Boolean).join(" · ")} · sent by {row.requestedBy}
                    </span>
                  </span>
                  <button onClick={() => setOpen(open === row.entryId ? null : row.entryId)} aria-expanded={open === row.entryId} style={button(theme, "secondary")}>
                    {open === row.entryId ? "Hide squad" : "See squad"}
                  </button>
                </div>
                {open === row.entryId && (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {row.players.map((p) => (
                      <li key={p.clubPlayerId} style={{ color: p.reason ? theme.muted : theme.ink }}>
                        {p.name}{p.isCaptain ? " · Captain" : ""}{p.detail ? ` · ${p.detail}` : ""}{p.reason ? ` — ${p.reason}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
                {row.problem && <span style={{ fontSize: 13, color: "var(--warn-ink)" }}>{row.problem} Ask them to change their name, or decline.</span>}
                {blocked.length > 0 && !row.problem && (
                  <span style={{ fontSize: 13, color: theme.muted }}>
                    {plural(blocked.length, "player")} already {blocked.length === 1 ? "has" : "have"} a place here and won’t come into the squad.
                  </span>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => answer(row, true)} disabled={!!r.busy || !!row.problem} style={button(theme)}>Accept</button>
                  <button onClick={() => answer(row, false)} disabled={!!r.busy} style={button(theme, "secondary")}>Decline</button>
                </div>
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
}

/** A kept team links to its page; a loose one offers "Keep" to its own admins (never the organiser for being organiser). */
export function KeepTeam({ team, tournamentId, theme, onKept, onOpenClub }) {
  const r = useRun();
  if (team.clubId) {
    return (
      <p style={{ margin: "10px 0 0", fontSize: 14 }}>
        {team.name} is a lasting team.{" "}
        {onOpenClub && (
          <button onClick={() => onOpenClub(team.clubId)} style={{ background: "none", border: "none", color: theme.successInk, textDecoration: "underline", cursor: "pointer", padding: 0, fontSize: 14 }}>
            Open the team’s page
          </button>
        )}
      </p>
    );
  }
  if (!team.canKeep) return null;
  const keep = async () => {
    if (!window.confirm(`Keep ${team.name} for other tournaments? Its players and admins come along when you enter another tournament.`)) return;
    const club = await r.run("keep", () => keepTeam(tournamentId, team.id));
    if (club) onKept(club);
  };
  return (
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
      <Errors message={r.error} />
      <span style={{ fontSize: 14, color: theme.muted }}>Keep {team.name} for other tournaments: the same players come along next time. Only the team’s admins see this.</span>
      <button onClick={keep} disabled={!!r.busy} style={{ ...button(theme, "secondary"), alignSelf: "flex-start" }}>Keep {team.name}</button>
    </div>
  );
}
