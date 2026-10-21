import { font, themeFor } from "./theme";
import { useState, useEffect } from "react";
import { getTeams, createTeam, updateTeam, deleteTeam, addPlayer, lookupPlayer, updatePlayer, deletePlayer, resetJoinCode, unlinkPlayer } from "./api/teamsApi";
import ErrorBanner from "./ErrorBanner";
import PlayerName from "./PlayerName";
import { OpenPlayerContext } from "./playerContext";
import { formatPhone, useAuthOptions } from "./useAuthOptions";
import {
  CRICKET_ROLES,
  BATTING_STYLES,
  BOWLING_ARMS,
  BOWLING_TYPES,
  cricketDraftFrom,
  cricketPayload,
  describePlayer,
  roleBowls,
  EMPTY_CRICKET_DRAFT,
} from "./cricket/cricketLabels";

const inputStyle = {
  padding: "0.4rem 0.6rem",
  borderRadius: 6,
  border: "1.5px solid #d8d4c8",
  fontSize: 14,
  background: "#fff",
  color: "#1B1B1B",
};

const emptyDraft = () => ({
  name: "",
  position: "",
  jerseyNumber: "",
  email: "",
  phone: "",
  cricket: { ...EMPTY_CRICKET_DRAFT },
});

/** The shirt number, and who else on the team wears it (team-mates may share one). */
function ShirtField({ team, playerId, value, onChange }) {
  const number = value === "" || value == null ? null : Number(value);
  const others = number == null || !team ? [] : team.players.filter((p) => p.jerseyNumber === number && p.id !== playerId);
  return (
    <>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#"
        aria-label="Shirt number"
        type="number"
        style={{ ...inputStyle, width: 60 }}
      />
      {others.length > 0 && (
        <span style={{ fontSize: 12, color: "#58625A" }}>Also worn by {others.map((p) => p.name).join(", ")}</span>
      )}
    </>
  );
}

/**
 * Adding a player starts from their email or number. If an account uses it the row shows the
 * person and adds them without a name (their account's name is used); if not, it's the full form
 * with the address already filled in. "Add without an email or number" goes straight to the form.
 */
function AddPlayerRow({ tournamentId, team, isCricket, showPhone, theme, playerPayload, onAdded }) {
  const [step, setStep] = useState("find"); // find | account | form
  const [contact, setContact] = useState("");
  const [found, setFound] = useState(null);
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState(emptyDraft());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const change = (field, value) => setDraft((d) => ({ ...d, [field]: value }));

  const reset = () => {
    setStep("find");
    setContact("");
    setFound(null);
    setNote("");
    setDraft(emptyDraft());
    setError("");
  };

  const run = async (fn) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const find = () =>
    contact.trim() &&
    run(async () => {
      const result = await lookupPlayer(tournamentId, team.id, contact.trim());
      if (result.found) {
        setFound(result);
        setStep("account");
        return;
      }
      setDraft({ ...emptyDraft(), [result.kind === "Email" ? "email" : "phone"]: result.kind === "Email" ? result.contact : formatPhone(result.contact) });
      setNote(
        `No account uses ${result.display} yet. Add their name; they'll be linked when they sign up.` +
          (result.waitingIn ? ` (A place in ${result.waitingIn} is already waiting on it.)` : ""),
      );
      setStep("form");
    });

  const addFound = () =>
    run(async () => {
      await addPlayer(tournamentId, team.id, {
        [found.kind === "Email" ? "email" : "phone"]: found.contact,
        jerseyNumber: draft.jerseyNumber ? Number(draft.jerseyNumber) : null,
        position: isCricket ? null : draft.position.trim() || null,
      });
      reset();
      onAdded();
    });

  const addTyped = () =>
    draft.name.trim() &&
    run(async () => {
      await addPlayer(tournamentId, team.id, playerPayload(draft));
      reset();
      onAdded();
    });

  const primary = { background: theme.accent, color: theme.accentInk, border: "none", borderRadius: 6, padding: "0.4rem 0.9rem", fontWeight: 600, fontSize: 14, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1 };
  const quiet = { background: "none", border: "none", color: theme.muted, textDecoration: "underline", fontSize: 13, cursor: "pointer", padding: "0.4rem 0.2rem" };
  const row = { display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", alignItems: "center" };

  return (
    <div>
      {error && <p role="alert" style={{ color: "#a33", fontSize: 13, margin: "10px 0 0" }}>{error}</p>}
      {step === "find" && (
        <div style={row}>
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && find()}
            placeholder={showPhone ? "Their email or mobile number" : "Their sign-in email"}
            aria-label={showPhone ? "Player's email or mobile number" : "Player's sign-in email"}
            autoComplete="off"
            style={{ ...inputStyle, flex: 1, minWidth: 220 }}
          />
          <button onClick={find} disabled={busy || !contact.trim()} style={primary}>
            {busy ? "Finding…" : "Find"}
          </button>
          <button onClick={() => setStep("form")} style={quiet}>
            Add someone without an email or number
          </button>
        </div>
      )}

      {step === "account" && found && (
        <div style={{ marginTop: 10, background: theme.tint, borderRadius: 8, padding: "0.7rem 0.9rem", fontSize: 14 }}>
          <strong>{found.name}</strong>
          <span style={{ color: theme.muted }}>
            {found.playsFor
              ? ` already plays for ${found.playsFor} in this tournament, so they can't join another team.`
              : ` has an account (${found.display}). Their own name${isCricket ? " and cricket profile are" : " is"} used.`}
          </span>
          <div style={{ ...row, marginTop: 8 }}>
            {!found.playsFor && (
              <>
                <ShirtField team={team} value={draft.jerseyNumber} onChange={(v) => change("jerseyNumber", v)} />
                {!isCricket && (
                  <input
                    value={draft.position}
                    onChange={(e) => change("position", e.target.value)}
                    placeholder="Position"
                    aria-label="Position"
                    style={{ ...inputStyle, width: 110 }}
                  />
                )}
                <button onClick={addFound} disabled={busy} style={primary}>
                  {busy ? "Adding…" : `Add to ${team.name}`}
                </button>
              </>
            )}
            <button onClick={reset} style={quiet}>Use another email or number</button>
          </div>
        </div>
      )}

      {step === "form" && (
        <>
          {note && <p style={{ fontSize: 13, color: theme.muted, margin: "10px 0 0" }}>{note}</p>}
          <div style={row}>
            <PlayerFields draft={draft} onChange={change} isCricket={isCricket} showPhone={showPhone} team={team} />
            <button onClick={addTyped} disabled={busy || !draft.name.trim()} style={primary}>
              {busy ? "Adding…" : "Add player"}
            </button>
            <button onClick={reset} style={quiet}>Back</button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * The add and edit forms differ only in where they sit, so the fields live here once. Football
 * keeps its free-text position; cricket replaces it with a role and the batting and bowling
 * styles, which are structured because leaderboards will need to filter on them later.
 *
 * The email (and, once the server can text codes, mobile number) links the place to the player's
 * account, now or when they sign up with it. A linked player's name and cricket profile are their
 * own, so those fields are shown but locked.
 */
function PlayerFields({ draft, onChange, isCricket, linked = false, showPhone = false, team = null, playerId = null }) {
  const setCricket = (field, value) =>
    onChange("cricket", { ...draft.cricket, [field]: value });

  const bowls = roleBowls(draft.cricket.primaryRole);
  const ownFields = linked ? { disabled: true, title: "Set by the player on their own account" } : {};

  return (
    <>
      <input
        value={draft.name}
        onChange={(e) => onChange("name", e.target.value)}
        placeholder="Player name"
        aria-label="Player name"
        {...ownFields}
        style={{ ...inputStyle, flex: 1, minWidth: 120 }}
      />
      <ShirtField team={team} playerId={playerId} value={draft.jerseyNumber} onChange={(v) => onChange("jerseyNumber", v)} />
      <input
        value={draft.email}
        onChange={(e) => onChange("email", e.target.value)}
        placeholder="Their sign-in email (optional)"
        aria-label="Player's sign-in email"
        type="email"
        autoComplete="off"
        title="Links this place to their account, now or when they sign up"
        style={{ ...inputStyle, width: 210 }}
      />
      {showPhone && (
        <input
          value={draft.phone}
          onChange={(e) => onChange("phone", e.target.value)}
          placeholder="Mobile number (optional)"
          aria-label="Player's mobile number"
          type="tel"
          autoComplete="off"
          title="Links this place to their account when they sign in with this number"
          style={{ ...inputStyle, width: 170 }}
        />
      )}

      {!isCricket && (
        <input
          value={draft.position}
          onChange={(e) => onChange("position", e.target.value)}
          placeholder="Position"
          aria-label="Position"
          style={{ ...inputStyle, width: 110 }}
        />
      )}

      {isCricket && (
        <>
          <select
            aria-label="Role"
            {...ownFields}
            value={draft.cricket.primaryRole}
            onChange={(e) => setCricket("primaryRole", e.target.value)}
            style={{ ...inputStyle, width: 155 }}
          >
            {CRICKET_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          <select
            aria-label="Batting style"
            {...ownFields}
            value={draft.cricket.battingStyle}
            onChange={(e) => setCricket("battingStyle", e.target.value)}
            style={{ ...inputStyle, width: 135 }}
          >
            <option value="">Batting style…</option>
            {BATTING_STYLES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          {/* A pure batter is not asked how they bowl. */}
          {bowls && (
            <>
              <select
                aria-label="Bowling arm"
                {...ownFields}
                value={draft.cricket.bowlingArm}
                onChange={(e) => setCricket("bowlingArm", e.target.value)}
                style={{ ...inputStyle, width: 110 }}
              >
                <option value="">Arm…</option>
                {BOWLING_ARMS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
              <select
                aria-label="Bowling type"
                {...ownFields}
                value={draft.cricket.bowlingType}
                onChange={(e) => setCricket("bowlingType", e.target.value)}
                style={{ ...inputStyle, width: 125 }}
              >
                <option value="">Type…</option>
                {BOWLING_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </>
          )}

          <input
            value={draft.cricket.battingOrderPreference}
            onChange={(e) => setCricket("battingOrderPreference", e.target.value)}
            placeholder="Bat #"
            aria-label="Usual batting position"
            {...ownFields}
            type="number"
            min="1"
            max="11"
            title="Usual position in the batting order"
            style={{ ...inputStyle, width: 70 }}
          />
        </>
      )}
    </>
  );
}

/**
 * Owners (`canEdit`) manage teams and players here: names, numbers, emails that link a place to a
 * player's account, and each team's join code. Everyone else in the tournament sees the same
 * teams read-only, and a player can leave their own team (`onLeftTeam` then re-checks what they
 * can still see).
 */
/** Player names on this page open their profile (`onOpenPlayer(playerId)`). */
export default function TeamManagement({ onOpenPlayer, ...props }) {
  return (
    <OpenPlayerContext.Provider value={onOpenPlayer ?? null}>
      <TeamManagementBody {...props} />
    </OpenPlayerContext.Provider>
  );
}

function TeamManagementBody({ tournamentId, onBack, sport = "Football", canEdit = true, onLeftTeam }) {
  const theme = themeFor(sport);
  const isCricket = sport === "Cricket";
  const options = useAuthOptions();
  const [busyId, setBusyId] = useState(null);
  const [copiedTeamId, setCopiedTeamId] = useState(null);

  const [teams, setTeams] = useState([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [editingTeamName, setEditingTeamName] = useState("");
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [editingPlayer, setEditingPlayer] = useState(null); // { teamId, playerId }
  const [editingPlayerDraft, setEditingPlayerDraft] = useState(emptyDraft());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);


  const loadTeams = async () => {
    if (!tournamentId) return;
    setLoading(true);
    try {
      const data = await getTeams(tournamentId);
      setTeams(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTeams();
  }, [tournamentId]);

  const handleCreateTeam = async () => {
    const name = newTeamName.trim();
    if (!name || creatingTeam) return;
    setError("");
    setCreatingTeam(true);
    try {
      await createTeam(tournamentId, name);
      setNewTeamName("");
      loadTeams();
    } catch (e) {
      setError(e.message);
    } finally {
      setCreatingTeam(false);
    }
  };

  const startEditTeam = (team) => {
    setEditingTeamId(team.id);
    setEditingTeamName(team.name);
  };

  const saveEditTeam = async (id) => {
    const name = editingTeamName.trim();
    if (!name) return;
    setError("");
    try {
      await updateTeam(tournamentId, id, name);
      setEditingTeamId(null);
      loadTeams();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDeleteTeam = async (id) => {
    if (!confirm("Delete this team and all its players?")) return;
    setError("");
    try {
      await deleteTeam(tournamentId, id);
      loadTeams();
    } catch (e) {
      setError(e.message);
    }
  };

  // The appointment that counts is the per-match one made when the XI is picked; this only
  // decides who that screen pre-selects.
  const handleSetCaptain = async (team, playerId) => {
    setError("");
    try {
      await updateTeam(tournamentId, team.id, team.name, {
        defaultCaptainPlayerId: playerId || null,
      });
      loadTeams();
    } catch (e) {
      setError(e.message);
    }
  };

  // Football sends a position and no cricket block; cricket sends the reverse. Never both — a
  // tournament is played under one sport.
  // The email is always sent: "" clears it (and unlinks the place unless its number still matches).
  // The number only while its field is shown; otherwise it's left as it is.
  const playerPayload = (draft) => ({
    name: draft.name.trim(),
    position: isCricket ? null : draft.position.trim() || null,
    jerseyNumber: draft.jerseyNumber ? Number(draft.jerseyNumber) : null,
    email: draft.email.trim(),
    phone: options.phone || draft.phone ? draft.phone.trim() : undefined,
    cricket: isCricket ? cricketPayload(draft.cricket) : null,
  });

  // One request at a time per button, so a double click can't reset a code twice.
  const runFor = async (id, action) => {
    if (busyId) return;
    setBusyId(id);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const copyCode = async (team) => {
    try {
      await navigator.clipboard.writeText(team.joinCode);
      setCopiedTeamId(team.id);
      setTimeout(() => setCopiedTeamId((id) => (id === team.id ? null : id)), 2000);
    } catch {
      setError("Couldn't copy the code. Select it and copy it yourself.");
    }
  };

  const handleResetCode = (team) => {
    if (!confirm(`Make a new join code for ${team.name}?\n\nThe old code stops working. Anyone who already joined stays in the team.`)) return;
    runFor(`code-${team.id}`, async () => {
      await resetJoinCode(tournamentId, team.id);
      await loadTeams();
    });
  };

  // An owner fixing a wrong link, or a player leaving their own team.
  const handleUnlink = (team, player) => {
    const question = player.isMe
      ? `Leave ${team.name}?\n\nYour name stays on the team sheet, but it won't be linked to you any more.`
      : `Unlink ${player.name}${player.email || player.phone ? ` (${player.email ?? formatPhone(player.phone)})` : ""}?\n\nTheir name stays on the team; it just won't be linked to their account.`;
    if (!confirm(question)) return;
    runFor(`unlink-${player.id}`, async () => {
      await unlinkPlayer(tournamentId, team.id, player.id);
      if (player.isMe && !canEdit && (await onLeftTeam?.()) === false) return; // gone home
      await loadTeams();
    });
  };

  const startEditPlayer = (teamId, player) => {
    setEditingPlayer({ teamId, playerId: player.id });
    setEditingPlayerDraft({
      name: player.name,
      position: player.position || "",
      jerseyNumber: player.jerseyNumber ?? "",
      email: player.email || "",
      phone: formatPhone(player.phone),
      cricket: cricketDraftFrom(player.cricket),
      linked: player.isLinked,
    });
  };

  const saveEditPlayer = async () => {
    const { teamId, playerId } = editingPlayer;
    if (!editingPlayerDraft.name.trim()) return;
    setError("");
    try {
      await updatePlayer(tournamentId, teamId, playerId, playerPayload(editingPlayerDraft));
      setEditingPlayer(null);
      loadTeams();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDeletePlayer = async (teamId, playerId) => {
    setError("");
    try {
      await deletePlayer(tournamentId, teamId, playerId);
      loadTeams();
    } catch (e) {
      setError(e.message);
    }
  };

  if (!tournamentId) {
    return (
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "2.5rem 2rem", color: theme.onDark, textAlign: "center" }}>
        <p style={{ color: theme.onDarkMuted, marginBottom: 16 }}>No tournament selected.</p>
        <button
          onClick={onBack}
          style={{ background: theme.accent, color: theme.accentInk, border: "none", borderRadius: 8, padding: "0.7rem 1.4rem", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
        >
          ← Back
        </button>
      </div>
    );
  }

  const smallButton = { background: "none", border: "1px solid #ccc", borderRadius: 6, padding: "0.2rem 0.6rem", fontSize: 12, cursor: "pointer", minHeight: 32 };
  const chip = (bg, fg) => ({ fontSize: 11, fontWeight: 700, padding: "0.1rem 0.45rem", borderRadius: 5, background: bg, color: fg, marginLeft: 6, whiteSpace: "nowrap" });

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "2.5rem clamp(1rem, 4vw, 2rem)", color: theme.onDark, fontFamily: font.body }}>
      <button
        onClick={onBack}
        style={{ background: theme.surfaceOnDark, color: theme.onDark, border: `1px solid ${theme.borderOnDark}`, borderRadius: 8, padding: "0.5rem 1rem", fontSize: 14, cursor: "pointer", marginBottom: 20 }}
      >
        ← Back
      </button>

      <h2 style={{ fontFamily: font.display, fontSize: 28, margin: "0 0 1.2rem" }}>{canEdit ? <>MANAGE TEAMS &amp; PLAYERS</> : "TEAMS"}</h2>

      <ErrorBanner message={error} />

      {canEdit && (
        <div style={{ background: theme.cream, color: theme.ink, borderRadius: 12, padding: "1.2rem", marginBottom: 20, display: "flex", gap: 10 }}>
          <input
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
            placeholder="New team name"
            aria-label="New team name"
            disabled={creatingTeam}
            style={{ ...inputStyle, flex: 1, padding: "0.6rem 0.8rem", borderRadius: 8, fontSize: 14 }}
          />
          <button
            onClick={handleCreateTeam}
            disabled={creatingTeam}
            style={{ background: theme.deep, color: theme.cream, border: "none", borderRadius: 8, padding: "0.6rem 1.2rem", fontWeight: 600, cursor: creatingTeam ? "not-allowed" : "pointer", fontSize: 14, opacity: creatingTeam ? 0.6 : 1 }}
          >
            {creatingTeam ? "Adding…" : "Add team"}
          </button>
        </div>
      )}

      {loading && <p style={{ color: theme.onDarkMuted }}>Loading…</p>}
      {!loading && teams.length === 0 && (
        <p style={{ color: theme.onDarkMuted, fontSize: 14 }}>{canEdit ? "No teams yet. Add the first one above." : "No teams yet."}</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {teams.map((team) => (
          <div key={team.id} style={{ background: theme.cream, color: theme.ink, borderRadius: 12, padding: "1rem 1.2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {editingTeamId === team.id ? (
                <div style={{ display: "flex", gap: 8, flex: 1 }}>
                  <input
                    value={editingTeamName}
                    onChange={(e) => setEditingTeamName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEditTeam(team.id)}
                    style={{ ...inputStyle, flex: 1, fontSize: 14 }}
                  />
                  <button onClick={() => saveEditTeam(team.id)} style={{ background: theme.successSolid, color: "#fff", border: "none", borderRadius: 6, padding: "0.4rem 0.8rem", fontSize: 14, cursor: "pointer" }}>
                    Save
                  </button>
                  <button onClick={() => setEditingTeamId(null)} style={{ background: "transparent", border: "1px solid #ccc", borderRadius: 6, padding: "0.4rem 0.8rem", fontSize: 14, cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <span
                    onClick={() => setExpandedTeamId(expandedTeamId === team.id ? null : team.id)}
                    style={{ fontWeight: 600, fontSize: 16, cursor: "pointer" }}
                  >
                    {theme.icon} {team.name} <span style={{ fontSize: 14, color: theme.muted }}>({team.players.length} players)</span>
                    {team.players.some((p) => p.isMe) && <span style={chip(theme.tint, theme.successInk)}>YOUR TEAM</span>}
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {canEdit && (
                      <>
                        <button onClick={() => startEditTeam(team)} style={{ background: "none", border: "1px solid #ccc", borderRadius: 6, padding: "0.3rem 0.7rem", fontSize: 12, cursor: "pointer" }}>
                          Rename
                        </button>
                        <button onClick={() => handleDeleteTeam(team.id)} style={{ background: "none", border: `1px solid ${theme.danger}`, color: "#a33", borderRadius: 6, padding: "0.3rem 0.7rem", fontSize: 12, cursor: "pointer" }}>
                          Delete
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setExpandedTeamId(expandedTeamId === team.id ? null : team.id)}
                      style={{ background: "none", border: "1px solid #ccc", borderRadius: 6, padding: "0.3rem 0.7rem", fontSize: 12, cursor: "pointer" }}
                    >
                      {expandedTeamId === team.id ? "Hide players" : "Players"}
                    </button>
                  </div>
                </>
              )}
            </div>

            {expandedTeamId === team.id && (
              <div style={{ marginTop: 12, borderTop: "1px solid #e5e2d8", paddingTop: 12 }}>
                {/* Owners share this; players type it under "Join a team" and pick their name. */}
                {canEdit && team.joinCode && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: theme.tint, borderRadius: 8, padding: "0.6rem 0.8rem", marginBottom: 12, fontSize: 14 }}>
                    <span style={{ color: theme.muted }}>Join code</span>
                    <strong style={{ fontFamily: font.condensed, fontSize: 24, letterSpacing: "0.18em", lineHeight: 1 }}>{team.joinCode}</strong>
                    <button onClick={() => copyCode(team)} style={smallButton}>
                      {copiedTeamId === team.id ? "Copied" : "Copy"}
                    </button>
                    <button onClick={() => handleResetCode(team)} disabled={busyId === `code-${team.id}`} style={smallButton}>
                      {busyId === `code-${team.id}` ? "Making…" : "New code"}
                    </button>
                    <span style={{ color: theme.muted, fontSize: 12, flexBasis: "100%" }}>
                      Players enter it under “Join a team”, then pick their name — or join as a new player.
                    </span>
                  </div>
                )}

                {canEdit && isCricket && team.players.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 14 }}>
                    <span id={`captain-${team.id}`} style={{ color: theme.muted }}>Usual captain</span>
                    <select
                      aria-labelledby={`captain-${team.id}`}
                      value={team.defaultCaptainPlayerId ?? ""}
                      onChange={(e) => handleSetCaptain(team, e.target.value ? Number(e.target.value) : null)}
                      style={{ ...inputStyle, minWidth: 180 }}
                    >
                      <option value="">Not set</option>
                      {team.players.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <span style={{ color: theme.muted, fontSize: 12 }}>
                      pre-selected when an XI is picked
                    </span>
                  </div>
                )}

                {team.players.map((p) =>
                  editingPlayer && editingPlayer.teamId === team.id && editingPlayer.playerId === p.id ? (
                    <div key={p.id} style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <PlayerFields
                        draft={editingPlayerDraft}
                        onChange={(field, value) => setEditingPlayerDraft((d) => ({ ...d, [field]: value }))}
                        isCricket={isCricket}
                        linked={editingPlayerDraft.linked}
                        showPhone={options.phone || !!editingPlayerDraft.phone}
                        team={team}
                        playerId={p.id}
                      />
                      <button onClick={saveEditPlayer} style={{ background: theme.successSolid, color: "#fff", border: "none", borderRadius: 6, padding: "0.4rem 0.7rem", fontSize: 12, cursor: "pointer" }}>
                        Save
                      </button>
                      <button onClick={() => setEditingPlayer(null)} style={{ background: "transparent", border: "1px solid #ccc", borderRadius: 6, padding: "0.4rem 0.7rem", fontSize: 12, cursor: "pointer" }}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#EDEAE0", padding: "0.4rem 0.7rem", borderRadius: 6, fontSize: 14, marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
                      <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                        {p.jerseyNumber != null && <strong>#{p.jerseyNumber} </strong>}
                        {p.isLinked ? <PlayerName playerId={p.id}>{p.name}</PlayerName> : p.name}
                        {isCricket && team.defaultCaptainPlayerId === p.id && (
                          <strong title="Usual captain" style={{ color: theme.successInk }}> (c)</strong>
                        )}
                        {isCricket
                          ? describePlayer(p.cricket) && (
                              <span style={{ color: theme.muted }}> · {describePlayer(p.cricket)}</span>
                            )
                          : p.position && <span style={{ color: theme.muted }}> · {p.position}</span>}
                        {p.isMe && <span style={chip(theme.accentSoft, theme.warnInk)}>YOU</span>}
                        {p.isLinked && !p.isMe && <span style={chip(theme.tint, theme.successInk)} title="Signed in to the app">LINKED</span>}
                        {canEdit && (p.email || p.phone) && (
                          <span style={{ color: theme.muted, fontSize: 12 }}>
                            {" "}{p.isLinked ? p.email ?? formatPhone(p.phone) : `· waiting for ${p.email ?? formatPhone(p.phone)} to sign up`}
                          </span>
                        )}
                      </span>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        {canEdit && (
                          <button onClick={() => startEditPlayer(team.id, p)} style={smallButton}>
                            Edit
                          </button>
                        )}
                        {(canEdit ? p.isLinked || p.email || p.phone : p.isMe) && (
                          <button onClick={() => handleUnlink(team, p)} disabled={busyId === `unlink-${p.id}`} style={smallButton}>
                            {p.isMe && !canEdit ? "Leave team" : "Unlink"}
                          </button>
                        )}
                        {canEdit && (
                          <button onClick={() => handleDeletePlayer(team.id, p.id)} style={{ ...smallButton, border: `1px solid ${theme.danger}`, color: "#a33" }}>
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  )
                )}
                {team.players.length === 0 && <p style={{ fontSize: 14, color: theme.muted }}>No players yet.</p>}

                {canEdit && (
                  <AddPlayerRow
                    tournamentId={tournamentId}
                    team={team}
                    isCricket={isCricket}
                    showPhone={options.phone}
                    theme={theme}
                    playerPayload={playerPayload}
                    onAdded={loadTeams}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
