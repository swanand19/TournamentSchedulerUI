import { useState, useEffect } from "react";
import { getTeams, createTeam, updateTeam, deleteTeam, addPlayer, updatePlayer, deletePlayer } from "./api/teamsApi";

export default function TeamManagement({ tournamentId, onBack }) {
  const [teams, setTeams] = useState([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [editingTeamName, setEditingTeamName] = useState("");
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [playerDrafts, setPlayerDrafts] = useState({}); // teamId -> { name, position, jerseyNumber }
  const [editingPlayer, setEditingPlayer] = useState(null); // { teamId, playerId }
  const [editingPlayerDraft, setEditingPlayerDraft] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);

  const font = { display: "'Anton', sans-serif", body: "'Inter', sans-serif" };

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

  const draftFor = (teamId) => playerDrafts[teamId] || { name: "", position: "", jerseyNumber: "" };

  const updateDraft = (teamId, field, value) => {
    setPlayerDrafts((prev) => ({
      ...prev,
      [teamId]: { ...draftFor(teamId), [field]: value },
    }));
  };

  const handleAddPlayer = async (teamId) => {
    const draft = draftFor(teamId);
    if (!draft.name.trim()) return;
    setError("");
    try {
      await addPlayer(tournamentId, teamId, {
        name: draft.name.trim(),
        position: draft.position.trim() || null,
        jerseyNumber: draft.jerseyNumber ? Number(draft.jerseyNumber) : null,
      });
      setPlayerDrafts((prev) => ({ ...prev, [teamId]: { name: "", position: "", jerseyNumber: "" } }));
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
    });
  };

  const saveEditPlayer = async () => {
    const { teamId, playerId } = editingPlayer;
    if (!editingPlayerDraft.name.trim()) return;
    setError("");
    try {
      await updatePlayer(tournamentId, teamId, playerId, {
        name: editingPlayerDraft.name.trim(),
        position: editingPlayerDraft.position.trim() || null,
        jerseyNumber: editingPlayerDraft.jerseyNumber ? Number(editingPlayerDraft.jerseyNumber) : null,
      });
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
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "2.5rem 2rem", color: "#F7F5EF", textAlign: "center" }}>
        <p style={{ color: "rgba(247,245,239,0.7)", marginBottom: 16 }}>No tournament selected.</p>
        <button
          onClick={onBack}
          style={{ background: "#F2A93B", color: "#1B1B1B", border: "none", borderRadius: 8, padding: "0.7rem 1.4rem", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
        >
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "2.5rem 2rem", color: "#F7F5EF", fontFamily: font.body }}>
      <button
        onClick={onBack}
        style={{ background: "rgba(247,245,239,0.1)", color: "#F7F5EF", border: "1px solid rgba(247,245,239,0.25)", borderRadius: 8, padding: "0.5rem 1rem", fontSize: 13, cursor: "pointer", marginBottom: 20 }}
      >
        ← Back
      </button>

      <h2 style={{ fontFamily: font.display, fontSize: 28, margin: "0 0 1.2rem" }}>MANAGE TEAMS &amp; PLAYERS</h2>

      {error && (
        <div style={{ background: "rgba(226,75,74,0.15)", border: "1px solid #e24b4a", padding: "0.8rem 1rem", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      <div style={{ background: "#F7F5EF", color: "#1B1B1B", borderRadius: 12, padding: "1.2rem", marginBottom: 20, display: "flex", gap: 10 }}>
        <input
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
            placeholder="New team name"
            disabled={creatingTeam}
            style={{ flex: 1, padding: "0.6rem 0.8rem", borderRadius: 8, border: "1.5px solid #d8d4c8", fontSize: 14 }}
        />
        <button
            onClick={handleCreateTeam}
            disabled={creatingTeam}
            style={{ background: "#1B4332", color: "#F7F5EF", border: "none", borderRadius: 8, padding: "0.6rem 1.2rem", fontWeight: 600, cursor: creatingTeam ? "not-allowed" : "pointer", fontSize: 14, opacity: creatingTeam ? 0.6 : 1 }}
        >
            {creatingTeam ? "Adding…" : "Add team"}
        </button>
      </div>

      {loading && <p style={{ color: "rgba(247,245,239,0.6)" }}>Loading…</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {teams.map((team) => (
          <div key={team.id} style={{ background: "#F7F5EF", color: "#1B1B1B", borderRadius: 12, padding: "1rem 1.2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {editingTeamId === team.id ? (
                <div style={{ display: "flex", gap: 8, flex: 1 }}>
                  <input
                    value={editingTeamName}
                    onChange={(e) => setEditingTeamName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEditTeam(team.id)}
                    style={{ flex: 1, padding: "0.4rem 0.6rem", borderRadius: 6, border: "1.5px solid #d8d4c8", fontSize: 14 }}
                  />
                  <button onClick={() => saveEditTeam(team.id)} style={{ background: "#639922", color: "#fff", border: "none", borderRadius: 6, padding: "0.4rem 0.8rem", fontSize: 13, cursor: "pointer" }}>
                    Save
                  </button>
                  <button onClick={() => setEditingTeamId(null)} style={{ background: "transparent", border: "1px solid #ccc", borderRadius: 6, padding: "0.4rem 0.8rem", fontSize: 13, cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <span
                    onClick={() => setExpandedTeamId(expandedTeamId === team.id ? null : team.id)}
                    style={{ fontWeight: 600, fontSize: 16, cursor: "pointer" }}
                  >
                    ⚽ {team.name} <span style={{ fontSize: 13, color: "#8a8677" }}>({team.players.length} players)</span>
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => startEditTeam(team)} style={{ background: "none", border: "1px solid #ccc", borderRadius: 6, padding: "0.3rem 0.7rem", fontSize: 12, cursor: "pointer" }}>
                      Rename
                    </button>
                    <button onClick={() => handleDeleteTeam(team.id)} style={{ background: "none", border: "1px solid #e24b4a", color: "#a33", borderRadius: 6, padding: "0.3rem 0.7rem", fontSize: 12, cursor: "pointer" }}>
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
                {team.players.map((p) =>
                  editingPlayer && editingPlayer.teamId === team.id && editingPlayer.playerId === p.id ? (
                    <div key={p.id} style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                      <input
                        value={editingPlayerDraft.name}
                        onChange={(e) => setEditingPlayerDraft((d) => ({ ...d, name: e.target.value }))}
                        placeholder="Name"
                        style={{ flex: 1, minWidth: 100, padding: "0.35rem 0.5rem", borderRadius: 6, border: "1.5px solid #d8d4c8", fontSize: 13 }}
                      />
                      <input
                        value={editingPlayerDraft.position}
                        onChange={(e) => setEditingPlayerDraft((d) => ({ ...d, position: e.target.value }))}
                        placeholder="Position"
                        style={{ width: 100, padding: "0.35rem 0.5rem", borderRadius: 6, border: "1.5px solid #d8d4c8", fontSize: 13 }}
                      />
                      <input
                        value={editingPlayerDraft.jerseyNumber}
                        onChange={(e) => setEditingPlayerDraft((d) => ({ ...d, jerseyNumber: e.target.value }))}
                        placeholder="#"
                        type="number"
                        style={{ width: 60, padding: "0.35rem 0.5rem", borderRadius: 6, border: "1.5px solid #d8d4c8", fontSize: 13 }}
                      />
                      <button onClick={saveEditPlayer} style={{ background: "#639922", color: "#fff", border: "none", borderRadius: 6, padding: "0.35rem 0.7rem", fontSize: 12, cursor: "pointer" }}>
                        Save
                      </button>
                      <button onClick={() => setEditingPlayer(null)} style={{ background: "transparent", border: "1px solid #ccc", borderRadius: 6, padding: "0.35rem 0.7rem", fontSize: 12, cursor: "pointer" }}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#EDEAE0", padding: "0.4rem 0.7rem", borderRadius: 6, fontSize: 13, marginBottom: 6 }}>
                      <span>
                        {p.jerseyNumber != null && <strong>#{p.jerseyNumber} </strong>}
                        {p.name}
                        {p.position && <span style={{ color: "#8a8677" }}> · {p.position}</span>}
                      </span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => startEditPlayer(team.id, p)} style={{ background: "none", border: "1px solid #ccc", borderRadius: 6, padding: "0.2rem 0.6rem", fontSize: 11, cursor: "pointer" }}>
                          Edit
                        </button>
                        <button onClick={() => handleDeletePlayer(team.id, p.id)} style={{ background: "none", border: "1px solid #e24b4a", color: "#a33", borderRadius: 6, padding: "0.2rem 0.6rem", fontSize: 11, cursor: "pointer" }}>
                          Remove
                        </button>
                      </div>
                    </div>
                  )
                )}
                {team.players.length === 0 && <p style={{ fontSize: 13, color: "#8a8677" }}>No players yet.</p>}

                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  <input
                    value={draftFor(team.id).name}
                    onChange={(e) => updateDraft(team.id, "name", e.target.value)}
                    placeholder="Player name"
                    style={{ flex: 1, minWidth: 100, padding: "0.4rem 0.6rem", borderRadius: 6, border: "1.5px solid #d8d4c8", fontSize: 13 }}
                  />
                  <input
                    value={draftFor(team.id).position}
                    onChange={(e) => updateDraft(team.id, "position", e.target.value)}
                    placeholder="Position"
                    style={{ width: 100, padding: "0.4rem 0.6rem", borderRadius: 6, border: "1.5px solid #d8d4c8", fontSize: 13 }}
                  />
                  <input
                    value={draftFor(team.id).jerseyNumber}
                    onChange={(e) => updateDraft(team.id, "jerseyNumber", e.target.value)}
                    placeholder="#"
                    type="number"
                    style={{ width: 60, padding: "0.4rem 0.6rem", borderRadius: 6, border: "1.5px solid #d8d4c8", fontSize: 13 }}
                  />
                  <button
                    onClick={() => handleAddPlayer(team.id)}
                    style={{ background: "#F2A93B", color: "#1B1B1B", border: "none", borderRadius: 6, padding: "0.4rem 0.9rem", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
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