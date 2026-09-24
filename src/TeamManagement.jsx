import { font, themeFor } from "./theme";
import { useState, useEffect } from "react";
import { getTeams, createTeam, updateTeam, deleteTeam, addPlayer, updatePlayer, deletePlayer } from "./api/teamsApi";
import ErrorBanner from "./ErrorBanner";
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
  cricket: { ...EMPTY_CRICKET_DRAFT },
});

/**
 * The add and edit forms differ only in where they sit, so the fields live here once. Football
 * keeps its free-text position; cricket replaces it with a role and the batting and bowling
 * styles, which are structured because leaderboards will need to filter on them later.
 */
function PlayerFields({ draft, onChange, isCricket }) {
  const setCricket = (field, value) =>
    onChange("cricket", { ...draft.cricket, [field]: value });

  const bowls = roleBowls(draft.cricket.primaryRole);

  return (
    <>
      <input
        value={draft.name}
        onChange={(e) => onChange("name", e.target.value)}
        placeholder="Player name"
        aria-label="Player name"
        style={{ ...inputStyle, flex: 1, minWidth: 120 }}
      />
      <input
        value={draft.jerseyNumber}
        onChange={(e) => onChange("jerseyNumber", e.target.value)}
        placeholder="#"
        aria-label="Shirt number"
        type="number"
        style={{ ...inputStyle, width: 60 }}
      />

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

export default function TeamManagement({ tournamentId, onBack, sport = "Football" }) {
  const theme = themeFor(sport);
  const isCricket = sport === "Cricket";

  const [teams, setTeams] = useState([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [editingTeamName, setEditingTeamName] = useState("");
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [playerDrafts, setPlayerDrafts] = useState({}); // teamId -> draft
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

  const draftFor = (teamId) => playerDrafts[teamId] || emptyDraft();

  const updateDraft = (teamId, field, value) => {
    setPlayerDrafts((prev) => ({
      ...prev,
      [teamId]: { ...draftFor(teamId), [field]: value },
    }));
  };

  // Football sends a position and no cricket block; cricket sends the reverse. Never both — a
  // tournament is played under one sport.
  const playerPayload = (draft) => ({
    name: draft.name.trim(),
    position: isCricket ? null : draft.position.trim() || null,
    jerseyNumber: draft.jerseyNumber ? Number(draft.jerseyNumber) : null,
    cricket: isCricket ? cricketPayload(draft.cricket) : null,
  });

  const handleAddPlayer = async (teamId) => {
    const draft = draftFor(teamId);
    if (!draft.name.trim()) return;
    setError("");
    try {
      await addPlayer(tournamentId, teamId, playerPayload(draft));
      setPlayerDrafts((prev) => ({ ...prev, [teamId]: emptyDraft() }));
      loadTeams();
    } catch (e) {
      setError(e.message);
    }
  };

  const startEditPlayer = (teamId, player) => {
    setEditingPlayer({ teamId, playerId: player.id });
    setEditingPlayerDraft({
      name: player.name,
      position: player.position || "",
      jerseyNumber: player.jerseyNumber ?? "",
      cricket: cricketDraftFrom(player.cricket),
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

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "2.5rem 2rem", color: theme.onDark, fontFamily: font.body }}>
      <button
        onClick={onBack}
        style={{ background: theme.surfaceOnDark, color: theme.onDark, border: `1px solid ${theme.borderOnDark}`, borderRadius: 8, padding: "0.5rem 1rem", fontSize: 14, cursor: "pointer", marginBottom: 20 }}
      >
        ← Back
      </button>

      <h2 style={{ fontFamily: font.display, fontSize: 28, margin: "0 0 1.2rem" }}>MANAGE TEAMS &amp; PLAYERS</h2>

      <ErrorBanner message={error} />

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

      {loading && <p style={{ color: theme.onDarkMuted }}>Loading…</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {teams.map((team) => (
          <div key={team.id} style={{ background: theme.cream, color: theme.ink, borderRadius: 12, padding: "1rem 1.2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => startEditTeam(team)} style={{ background: "none", border: "1px solid #ccc", borderRadius: 6, padding: "0.3rem 0.7rem", fontSize: 12, cursor: "pointer" }}>
                      Rename
                    </button>
                    <button onClick={() => handleDeleteTeam(team.id)} style={{ background: "none", border: `1px solid ${theme.danger}`, color: "#a33", borderRadius: 6, padding: "0.3rem 0.7rem", fontSize: 12, cursor: "pointer" }}>
                      Delete
                    </button>
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
                {isCricket && team.players.length > 0 && (
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
                      />
                      <button onClick={saveEditPlayer} style={{ background: theme.successSolid, color: "#fff", border: "none", borderRadius: 6, padding: "0.4rem 0.7rem", fontSize: 12, cursor: "pointer" }}>
                        Save
                      </button>
                      <button onClick={() => setEditingPlayer(null)} style={{ background: "transparent", border: "1px solid #ccc", borderRadius: 6, padding: "0.4rem 0.7rem", fontSize: 12, cursor: "pointer" }}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#EDEAE0", padding: "0.4rem 0.7rem", borderRadius: 6, fontSize: 14, marginBottom: 6, gap: 8 }}>
                      <span>
                        {p.jerseyNumber != null && <strong>#{p.jerseyNumber} </strong>}
                        {p.name}
                        {isCricket && team.defaultCaptainPlayerId === p.id && (
                          <strong title="Usual captain" style={{ color: theme.successInk }}> (c)</strong>
                        )}
                        {isCricket
                          ? describePlayer(p.cricket) && (
                              <span style={{ color: theme.muted }}> · {describePlayer(p.cricket)}</span>
                            )
                          : p.position && <span style={{ color: theme.muted }}> · {p.position}</span>}
                      </span>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button onClick={() => startEditPlayer(team.id, p)} style={{ background: "none", border: "1px solid #ccc", borderRadius: 6, padding: "0.2rem 0.6rem", fontSize: 11, cursor: "pointer" }}>
                          Edit
                        </button>
                        <button onClick={() => handleDeletePlayer(team.id, p.id)} style={{ background: "none", border: `1px solid ${theme.danger}`, color: "#a33", borderRadius: 6, padding: "0.2rem 0.6rem", fontSize: 11, cursor: "pointer" }}>
                          Remove
                        </button>
                      </div>
                    </div>
                  )
                )}
                {team.players.length === 0 && <p style={{ fontSize: 14, color: theme.muted }}>No players yet.</p>}

                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <PlayerFields
                    draft={draftFor(team.id)}
                    onChange={(field, value) => updateDraft(team.id, field, value)}
                    isCricket={isCricket}
                  />
                  <button
                    onClick={() => handleAddPlayer(team.id)}
                    style={{ background: theme.accent, color: theme.accentInk, border: "none", borderRadius: 6, padding: "0.4rem 0.9rem", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
                  >
                    Add player
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
