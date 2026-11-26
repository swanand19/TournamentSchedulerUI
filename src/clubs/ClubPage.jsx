import { useCallback, useEffect, useRef, useState } from "react";
import {
  addClubAdmin,
  addClubPlayer,
  deleteClub,
  getClub,
  lookupClubPlayer,
  previewClubSquads,
  removeClubAdmin,
  removeClubLogo,
  removeClubPlayer,
  resetClubCode,
  setClubLogo,
  updateClub,
  updateClubPlayer,
} from "../api/clubsApi";
import { CRICKET_ROLES } from "../cricket/cricketLabels";
import Modal from "../Modal";
import PictureField from "../PictureField";
import { themeFor } from "../theme";
import InviteLink from "../InviteLink";
import { Card, Errors, Heading, Logo, Page } from "./parts";
import SquadQuestion from "./SquadQuestion";
import { button, input, label, plural, useRun } from "./style";

// A lasting team's page on the web (step 5 of docs/reusable-teams-plan.md; people see "team", the API says club), the
// phone's two boards in one page: who runs it and its totals, then Tournaments (being played / still to play / played,
// waiting entries for its admins) and Players (with the join code). Its admins also get the settings — name, place,
// logo, admins, the public page's link, delete. Anyone signed in may look (C-15); the server says who manages
// (`canManage`). A change that touches live squads comes back with `question` (step 4), asked in one dialog.

const SECTIONS = [
  { key: "live", title: "Being played" },
  { key: "upcoming", title: "Still to play" },
  { key: "past", title: "Played" },
];

export default function ClubPage({ clubId, ask, onBack, onOpenTournament, onEnter, onGone }) {
  const [club, setClub] = useState(null);
  const [tab, setTab] = useState(ask ? "players" : "tournaments");
  const [editing, setEditing] = useState(null); // a player, or "new"
  const [question, setQuestion] = useState(null);
  const loadRun = useRun();
  const act = useRun();
  const asked = useRef(false);
  const theme = themeFor(club?.sport ?? "Cricket");

  const show = useCallback((next) => {
    setClub(next);
    if (next?.question?.live?.length) setQuestion(next.question);
  }, []);

  useEffect(() => {
    loadRun.run("load", async () => show(await getClub(clubId)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  // From the "joined" notification: the live tournaments that player could join, once, for the team's admins.
  useEffect(() => {
    if (!ask || asked.current || !club?.canManage) return;
    asked.current = true;
    previewClubSquads(club.clubId, ask)
      .then((q) => q.live.length > 0 && setQuestion(q))
      .catch(() => {});
  }, [ask, club]);

  if (!club) {
    return (
      <Page theme={theme} back="Your tournaments" onBack={onBack} title="Team">
        {loadRun.error ? <Errors message={loadRun.error} /> : <p style={{ color: theme.onDarkMuted }}>Loading…</p>}
      </Page>
    );
  }

  const admins = club.admins.map((a) => a.name);
  const runBy = admins.length === 0 ? null : `Run by ${admins.length === 1 ? admins[0] : `${admins.slice(0, -1).join(", ")} and ${admins.at(-1)}`}`;
  const me = club.players.find((p) => p.isMe);

  const leave = async () => {
    if (!me || !window.confirm(`Leave ${club.name}? Tournaments you have played for it stay as they were.`)) return;
    const next = await act.run("leave", () => removeClubPlayer(club.clubId, me.clubPlayerId));
    if (next) club.canManage ? show(next) : onGone();
  };

  const newCode = async () => {
    if (!window.confirm(`Make a new invite link and code for ${club.name}? The old ones stop working. Everyone already in the team stays.`)) return;
    const next = await act.run("code", () => resetClubCode(club.clubId));
    if (next) show(next);
  };

  return (
    <Page theme={theme} back="Your tournaments" onBack={onBack} logo={club.logoUrl} eyebrow={[`${theme.label} team`, club.area].filter(Boolean).join(" · ")} title={club.name}>
      {runBy && <p style={{ margin: 0, color: theme.onDarkMuted }}>{runBy}</p>}
      <Errors message={act.error} />

      <Card theme={theme} style={{ flexDirection: "row", justifyContent: "space-around", textAlign: "center", padding: "0.8rem" }}>
        {[
          [club.totals.tournaments, club.totals.tournaments === 1 ? "Tournament" : "Tournaments"],
          [club.totals.matches, club.totals.matches === 1 ? "Match" : "Matches"],
          [club.totals.won, "Won"],
          [club.totals.titles, club.totals.titles === 1 ? "Title" : "Titles"],
        ].map(([value, word]) => (
          <div key={word}>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{value}</div>
            <div style={{ fontSize: 13, color: theme.muted }}>{word}</div>
          </div>
        ))}
      </Card>

      <div role="tablist" aria-label="Team" className="kc-seg">
        {[
          ["tournaments", `Tournaments · ${club.tournaments.length}`],
          ["players", `Players · ${club.players.length}`],
        ].map(([key, text]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            type="button"
          >
            {text}
          </button>
        ))}
      </div>

      {tab === "tournaments" ? (
        <>
          {club.canManage && (
            <button onClick={() => onEnter(null)} style={{ ...button(theme), alignSelf: "flex-start" }}>
              Enter a tournament
            </button>
          )}
          {club.tournaments.length === 0 ? (
            <p style={{ color: theme.onDarkMuted }}>
              {club.canManage ? "Ask an organiser for their tournament's entry code, then enter it here." : `When ${club.name} plays in a tournament, it shows here with its result.`}
            </p>
          ) : (
            SECTIONS.map((s) => {
              const rows = club.tournaments.filter((t) => t.section === s.key);
              if (rows.length === 0) return null;
              return (
                <div key={s.key} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Heading theme={theme}>{s.title} · {rows.length}</Heading>
                  {rows.map((t) => {
                    const open = t.entryId != null ? () => onEnter(t.entryId) : t.canOpen ? () => onOpenTournament(t.tournamentId) : null;
                    const tag = t.entryId != null ? "Waiting" : t.section === "live" ? "In play" : t.champion ? "🏆 Won" : null;
                    return (
                      <button
                        key={`${t.tournamentId}-${t.entryId ?? 0}`}
                        onClick={open ?? undefined}
                        disabled={!open}
                        className={open ? "pressable" : undefined}
                        style={{ display: "flex", alignItems: "center", gap: 12, background: theme.cream, color: theme.ink, border: "none", borderRadius: 10, padding: "0.8rem 1rem", textAlign: "left", cursor: open ? "pointer" : "default" }}
                      >
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ display: "block", fontWeight: 600 }}>{t.name}</strong>
                          <span style={{ fontSize: 13, color: theme.muted }}>
                            {t.teamName !== club.name && t.teamName ? `As ${t.teamName} · ` : ""}
                            {t.line}
                          </span>
                        </span>
                        {tag && <span style={{ fontSize: 12, fontWeight: 700, padding: "0.25rem 0.6rem", borderRadius: 6, background: "var(--chip)", color: theme.muted, whiteSpace: "nowrap" }}>{tag}</span>}
                        {open && <span aria-hidden="true">→</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </>
      ) : (
        <>
          {club.canManage && (
            <button onClick={() => setEditing("new")} style={{ ...button(theme), alignSelf: "flex-start" }}>
              Add player
            </button>
          )}
          {me && !club.canManage && (
            <Card theme={theme}>
              <strong>You play for {club.name}</strong>
              <span style={{ fontSize: 14, color: theme.muted }}>Not playing for it any more? Leave the team; its past tournaments keep your name.</span>
              <button onClick={leave} disabled={!!act.busy} style={{ ...button(theme, "secondary"), alignSelf: "flex-start" }}>
                Leave team
              </button>
            </Card>
          )}
          {club.players.length === 0 && <p style={{ color: theme.onDarkMuted }}>No players yet.</p>}
          {club.players.map((p) => (
            <button
              key={p.clubPlayerId}
              onClick={club.canManage ? () => setEditing(p) : undefined}
              disabled={!club.canManage}
              className={club.canManage ? "pressable" : undefined}
              style={{ display: "flex", alignItems: "center", gap: 12, background: theme.cream, color: theme.ink, border: "none", borderRadius: 10, padding: "0.7rem 1rem", textAlign: "left", cursor: club.canManage ? "pointer" : "default" }}
            >
              <Logo link={p.photoUrl} name={p.name} size={36} theme={{ ...theme, onDark: theme.ink, surfaceOnDark: "var(--hair)", borderOnDark: "var(--hair)" }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontWeight: 600 }}>
                  {p.jerseyNumber != null ? `#${p.jerseyNumber} ` : ""}
                  {p.name}
                  {p.isMe ? " (you)" : ""}
                </strong>
                <span style={{ display: "block", fontSize: 13, color: theme.muted }}>
                  {[club.sport === "Cricket" ? (CRICKET_ROLES.find((r) => r.value === p.cricket?.primaryRole)?.label ?? "Role not set") : p.position || "No position set", p.isLinked ? "on the app" : p.isWaiting ? "waiting for sign-up" : null]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              {(p.isCaptain || p.isAdmin) && (
                <span style={{ fontSize: 12, fontWeight: 700, padding: "0.25rem 0.6rem", borderRadius: 6, background: "var(--chip)", color: theme.muted }}>{p.isCaptain ? "Captain" : "Admin"}</span>
              )}
            </button>
          ))}
          {club.canManage && club.joinCode && (
            <Card theme={theme}>
              <span style={label(theme)}>Invite players</span>
              <InviteLink invite={club.invite} teamName={club.name} buttonStyle={button(theme)} mutedColor={theme.muted} />
              <span style={label(theme)}>Or they type this code</span>
              <code style={{ fontSize: 28, letterSpacing: "0.25em", fontWeight: 700 }}>{club.joinCode}</code>
              <span style={{ fontSize: 14, color: theme.muted }}>They enter it under “Join a team”, then pick their name, or join as new.</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => navigator.clipboard?.writeText(club.joinCode)} style={button(theme)}>
                  Copy code
                </button>
                <button onClick={newCode} disabled={!!act.busy} style={button(theme, "secondary")}>
                  New link
                </button>
              </div>
            </Card>
          )}
        </>
      )}

      {club.canManage && <Settings club={club} theme={theme} onChanged={show} onGone={onGone} />}

      {editing && <PlayerDialog club={club} player={editing === "new" ? null : editing} theme={theme} onClose={() => setEditing(null)} onSaved={show} />}
      {question && <SquadQuestion club={club} question={question} theme={theme} onClose={() => setQuestion(null)} onSaved={(next) => setClub(next)} />}
    </Page>
  );
}

/** Adding or editing a player: the email or number first (someone on the app is added by it), or a name. */
function PlayerDialog({ club, player, theme, onClose, onSaved }) {
  const cricket = club.sport === "Cricket";
  const [contact, setContact] = useState("");
  const [found, setFound] = useState(null);
  const [step, setStep] = useState(player ? "form" : "find");
  const [name, setName] = useState(player?.name ?? "");
  const [jersey, setJersey] = useState(player?.jerseyNumber ?? "");
  const [position, setPosition] = useState(player?.position ?? "");
  const [role, setRole] = useState(player?.cricket?.primaryRole ?? "Batter");
  const [email, setEmail] = useState(player?.email ?? "");
  const [captain, setCaptain] = useState(!!player?.isCaptain);
  const r = useRun();

  const body = () => ({
    name: name.trim(),
    jerseyNumber: jersey === "" ? null : Number(jersey),
    position: cricket ? null : position.trim() || null,
    email: player ? email.trim() : email.trim() || null,
    cricket: cricket ? { ...(player?.cricket ?? {}), primaryRole: role } : null,
  });

  const lookUp = async (e) => {
    e.preventDefault();
    const res = await r.run("find", () => lookupClubPlayer(club.clubId, contact.trim()));
    if (!res) return;
    if (res.found) return setFound(res);
    if (res.kind === "Email") setEmail(res.contact);
    setStep("form");
  };

  const save = async (e) => {
    e?.preventDefault();
    const next = await r.run("save", async () => {
      let answer = found
        ? await addClubPlayer(club.clubId, found.kind === "Email" ? { email: found.contact } : { phone: found.contact })
        : player
          ? await updateClubPlayer(club.clubId, player.clubPlayerId, body())
          : await addClubPlayer(club.clubId, body());
      if (player && captain !== player.isCaptain)
        answer = await updateClub(club.clubId, { name: club.name, area: club.area, setCaptain: true, captainClubPlayerId: captain ? player.clubPlayerId : null });
      return answer;
    });
    if (next) {
      onSaved(next);
      onClose();
    }
  };

  const remove = async () => {
    if (!window.confirm(`Take ${player.name} off ${club.name}? Tournaments they played stay as they were.`)) return;
    const next = await r.run("remove", () => removeClubPlayer(club.clubId, player.clubPlayerId));
    if (next) {
      onSaved(next);
      onClose();
    }
  };

  return (
    <Modal labelledBy="club-player-title" onClose={onClose} panelStyle={{ background: theme.cream, color: theme.ink, borderRadius: 14, padding: "1.2rem", display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 id="club-player-title" style={{ margin: 0, fontSize: 20 }}>{player ? player.name : `Add a player to ${club.name}`}</h2>
      <Errors message={r.error} />
      {step === "find" && !found && (
        <form onSubmit={lookUp} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label htmlFor="club-contact" style={label(theme)}>Their email or mobile number</label>
          <input id="club-contact" value={contact} onChange={(e) => setContact(e.target.value)} style={input} autoFocus />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="submit" disabled={!contact.trim() || !!r.busy} style={button(theme)}>{r.busy ? "Looking…" : "Find"}</button>
            <button type="button" onClick={() => setStep("form")} style={button(theme, "secondary")}>Add someone without one</button>
          </div>
        </form>
      )}
      {found && (
        <>
          <p style={{ margin: 0 }}>
            <strong>{found.name}</strong> uses {found.display}.{found.alreadyIn ? ` They're in ${club.name} already.` : ""}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} disabled={found.alreadyIn || !!r.busy} style={button(theme)}>Add to {club.name}</button>
            <button onClick={() => setFound(null)} style={button(theme, "secondary")}>Use another</button>
          </div>
        </>
      )}
      {step === "form" && !found && (
        <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={label(theme)}>
            Player name
            <input value={name} onChange={(e) => setName(e.target.value)} disabled={player?.isLinked} style={{ ...input, width: "100%", marginTop: 4 }} />
          </label>
          <label style={label(theme)}>
            Shirt number (optional)
            <input type="number" min={0} max={999} value={jersey} onChange={(e) => setJersey(e.target.value)} style={{ ...input, width: "100%", marginTop: 4 }} />
          </label>
          {cricket ? (
            <label style={label(theme)}>
              Role
              <select value={role} onChange={(e) => setRole(e.target.value)} disabled={player?.isLinked} style={{ ...input, width: "100%", marginTop: 4 }}>
                {CRICKET_ROLES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
              </select>
            </label>
          ) : (
            <label style={label(theme)}>
              Position (optional)
              <input value={position} onChange={(e) => setPosition(e.target.value)} style={{ ...input, width: "100%", marginTop: 4 }} />
            </label>
          )}
          {!player?.isLinked && (
            <label style={label(theme)}>
              Their sign-in email (optional)
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...input, width: "100%", marginTop: 4 }} />
            </label>
          )}
          {player && (
            <label style={{ display: "flex", gap: 8, alignItems: "center", minHeight: 44 }}>
              <input type="checkbox" checked={captain} onChange={(e) => setCaptain(e.target.checked)} style={{ width: 20, height: 20 }} />
              Team captain (captains it in each new tournament it enters)
            </label>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="submit" disabled={!name.trim() || !!r.busy} style={button(theme)}>{player ? "Save changes" : "Add to team"}</button>
            <button type="button" onClick={onClose} style={button(theme, "secondary")}>Cancel</button>
            {player && <button type="button" onClick={remove} disabled={!!r.busy} style={{ ...button(theme, "danger"), marginLeft: "auto" }}>Take off the team</button>}
          </div>
        </form>
      )}
    </Modal>
  );
}

/** The team's settings, for its admins: name and place, logo, admins, the public page's link, delete. */
function Settings({ club, theme, onChanged, onGone }) {
  const [name, setName] = useState(club.name);
  const [area, setArea] = useState(club.area ?? "");
  const [contact, setContact] = useState("");
  const r = useRun();
  const changed = name.trim() !== club.name || (area.trim() || null) !== (club.area ?? null);

  const save = async (e) => {
    e.preventDefault();
    const next = await r.run("save", () => updateClub(club.clubId, { name: name.trim(), area: area.trim() || null, setCaptain: false }));
    if (next) onChanged(next);
  };
  const addAdmin = async (body) => {
    const next = await r.run("admin", () => addClubAdmin(club.clubId, body));
    if (next) {
      setContact("");
      onChanged(next);
    }
  };
  const dropAdmin = async (a) => {
    if (!window.confirm(a.isMe ? `Stop running ${club.name}?` : `Remove ${a.name} as an admin?`)) return;
    const next = await r.run("admin", () => removeClubAdmin(club.clubId, a.userId));
    if (next) onChanged(next);
  };
  const remove = async () => {
    if (!window.confirm(`Delete ${club.name}? Its players and admins go with it. Tournaments it played stay as they are.`)) return;
    if ((await r.run("delete", () => deleteClub(club.clubId))) !== undefined) onGone();
  };
  const candidates = club.players.filter((p) => p.isLinked && !p.isAdmin);

  return (
    <>
      <Heading theme={theme}>Team settings</Heading>
      <Errors message={r.error} />
      <Card theme={theme}>
        <form onSubmit={save} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ ...label(theme), flex: "1 1 220px" }}>
            Team name
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} style={{ ...input, width: "100%", marginTop: 4 }} />
          </label>
          <label style={{ ...label(theme), flex: "1 1 160px" }}>
            Where it plays
            <input value={area} onChange={(e) => setArea(e.target.value)} maxLength={60} placeholder="e.g. Pune" style={{ ...input, width: "100%", marginTop: 4 }} />
          </label>
          <button type="submit" disabled={!changed || !name.trim() || !!r.busy} style={button(theme)}>Save</button>
        </form>
        <PictureField
          label="Logo"
          hint="Square. Shown beside the team's name, on its page and on Home."
          shape="square"
          link={club.logoUrl}
          name={club.name}
          upload={(image) => setClubLogo(club.clubId, image)}
          remove={() => removeClubLogo(club.clubId)}
          onChanged={(url) => onChanged({ ...club, logoUrl: url })}
          theme={theme}
        />
      </Card>

      <Card theme={theme}>
        <strong>Team admins</strong>
        <span style={{ fontSize: 14, color: theme.muted }}>
          They change the team’s players and admins, enter it into tournaments and run its squads there. They don’t score: only a
          tournament’s organisers and scorers do.
        </span>
        {club.admins.map((a) => (
          <div key={a.userId} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44 }}>
            <span style={{ flex: 1 }}>{a.name}{a.isMe ? " (you)" : ""}</span>
            {a.canRemove && <button onClick={() => dropAdmin(a)} disabled={!!r.busy} style={button(theme, "secondary")}>{a.isMe ? "Step down" : "Remove"}</button>}
          </div>
        ))}
        {club.admins.length < 3 && (
          <>
            {candidates.map((p) => (
              <button key={p.clubPlayerId} onClick={() => addAdmin({ clubPlayerId: p.clubPlayerId })} disabled={!!r.busy} style={{ ...button(theme, "secondary"), alignSelf: "flex-start" }}>
                Make {p.name} an admin
              </button>
            ))}
            <form onSubmit={(e) => { e.preventDefault(); addAdmin({ contact: contact.trim() }); }} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input aria-label="Another admin's email or mobile number" placeholder="Or someone's email or number" value={contact} onChange={(e) => setContact(e.target.value)} style={input} />
              <button type="submit" disabled={!contact.trim() || !!r.busy} style={button(theme)}>Add admin</button>
            </form>
          </>
        )}
      </Card>

      {club.share?.url && (
        <Card theme={theme}>
          <strong>The team’s page</strong>
          <span style={{ fontSize: 14, color: theme.muted }}>Anyone with the link sees its tournaments, results and players’ names, without signing in. Never emails, numbers or photos.</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => navigator.clipboard?.writeText(club.share.url)} style={button(theme)}>Copy link</button>
            <a href={club.share.url} target="_blank" rel="noreferrer" style={{ ...button(theme, "secondary"), textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Open</a>
          </div>
        </Card>
      )}

      <button onClick={remove} disabled={!!r.busy} style={{ ...button(theme, "danger"), alignSelf: "flex-start" }}>
        Delete team
      </button>
      <span style={{ fontSize: 13, color: theme.onDarkMuted }}>{plural(club.players.length, "player")} · deleting leaves its tournament squads as ordinary teams.</span>
    </>
  );
}
