import { useState, useEffect } from "react";
import { randomizeGroups, setManualGroups, generateSchedule, approveSchedule } from "./api/tournamentApi";
import { getTeams } from "./api/teamsApi";
import Home from "./Home";
import TeamManagement from "./TeamManagement";
import { getTournamentSchedule, getScheduleHistory, activateSchedule, startTournament } from "./api/tournamentsApi";
import { getMatches } from "./api/matchesApi";
import MatchList from "./MatchList";
import MatchSetup from "./MatchSetup";
import LiveMatch from "./LiveMatch";

export default function App() {
  const [view, setView] = useState("home"); // home | tournament
  const [tournamentId, setTournamentId] = useState(null);

  const [stage, setStage] = useState("setup"); // setup | groups | schedule | manageTeams | matches | matchSetup
  const [preManageTeamsStage, setPreManageTeamsStage] = useState("setup"); // where to return to after Manage Teams
  const [availableTeams, setAvailableTeams] = useState([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [groupCount, setGroupCount] = useState(1);
  const [groups, setGroups] = useState([]); // [{ name: "A", teams: [...] }, ...]
  const [matchesPerTeam, setMatchesPerTeam] = useState(5);
  const [manualPick, setManualPick] = useState({}); // teamName -> groupName
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [approving, setApproving] = useState(false);
  const [approvedId, setApprovedId] = useState(null);
  const [draggedTeam, setDraggedTeam] = useState(null);
  const [dragOverGroup, setDragOverGroup] = useState(null);
  const font = { display: "'Anton', sans-serif", body: "'Inter', sans-serif" };
  const [hadExistingSchedule, setHadExistingSchedule] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activatingId, setActivatingId] = useState(null);

  // --- Matches module state ---
  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [tournamentStarted, setTournamentStarted] = useState(false);
  const [startingTournament, setStartingTournament] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState(null);
  const [liveMatchId, setLiveMatchId] = useState(null);

  const groupLabel = (i) => String.fromCharCode(65 + i); // A, B, C...

  const teams = availableTeams
    .filter((t) => selectedTeamIds.includes(t.id))
    .map((t) => t.name);

  // Teams are now scoped to a tournament — always requires a tournamentId.
  const loadAvailableTeams = async (id = tournamentId) => {
    if (!id) return;
    setLoadingTeams(true);
    try {
      const data = await getTeams(id);
      setAvailableTeams(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingTeams(false);
    }
  };

  useEffect(() => {
    if (view === "tournament" && tournamentId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadAvailableTeams(tournamentId);
    }
  }, [view, tournamentId]);

  const resetTournamentState = () => {
    setSelectedTeamIds([]);
    setAvailableTeams([]);
    setGroupCount(1);
    setGroups([]);
    setMatchesPerTeam(5);
    setManualPick({});
    setScheduleData(null);
    setApprovedId(null);
    setHadExistingSchedule(false);
    setError("");
    setMatches([]);
    setTournamentStarted(false);
    setActiveMatchId(null);
  };

  const handleSelectTournament = async (id, hasSchedule, isStarted = false) => {
    setError("");
    resetTournamentState();
    setTournamentId(id);
    setHadExistingSchedule(hasSchedule);
    setTournamentStarted(isStarted);
    setView("tournament");
    
    if (isStarted) {
      await loadMatches(id);
      setStage("matches");
      return;
    }
  
    if (hasSchedule) {
      setLoading(true);
      try {
        const saved = await getTournamentSchedule(id);
        if (saved) {
          setScheduleData({
            groups: saved.groups.map((g) => ({
              groupName: g.groupName,
              fixtures: g.fixtures.map((f) => ({
                id: f.matchNumber,
                home: f.home,
                away: f.away,
              })),
            })),
          });
          setApprovedId(saved.id);
          setStage("schedule");
        } else {
          setStage("setup");
        }
      } catch (e) {
        setError(e.message);
        setStage("setup");
      } finally {
        setLoading(false);
      }
    } else {
      setStage("setup");
    }
  };

  const goHome = () => {
    setView("home");
    setTournamentId(null);
    resetTournamentState();
    setStage("setup");
  };

  // Opens Manage Teams from anywhere inside the tournament view, remembering
  // exactly which stage to return to (setup / groups / schedule).
  const openManageTeams = () => {
    setPreManageTeamsStage(stage);
    setStage("manageTeams");
  };

  const closeManageTeams = () => {
    setStage(preManageTeamsStage || "setup");
    loadAvailableTeams(tournamentId);
  };

  const toggleTeamSelection = (id) => {
    setSelectedTeamIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const allSelected = availableTeams.length > 0 && selectedTeamIds.length === availableTeams.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedTeamIds([]);
    } else {
      setSelectedTeamIds(availableTeams.map((t) => t.id));
    }
  };

  const minTeamsNeeded = groupCount * 2;

  const doRandomize = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await randomizeGroups(teams, groupCount);
      setGroups(data.groups.map((g) => ({ name: g.name, teams: g.teams })));
      setManualPick({});
      setApprovedId(null);
      setStage("groups");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const goManual = () => {
    const init = {};
    teams.forEach((t, i) => (init[t] = groupLabel(i % groupCount)));
    setManualPick(init);
    const built = Array.from({ length: groupCount }, (_, i) => ({
      name: groupLabel(i),
      teams: teams.filter((t) => init[t] === groupLabel(i)),
    }));
    setGroups(built);
    setApprovedId(null);
    setStage("groups");
  };

  const moveTeamToGroup = async (team, targetGroupName) => {
    if (manualPick[team] === targetGroupName) return;

    const next = { ...manualPick, [team]: targetGroupName };
    setManualPick(next);

    const names = groups.map((g) => g.name);
    const rebuilt = names.map((name) => ({
      name,
      teams: teams.filter((t) => next[t] === name),
    }));
    setGroups(rebuilt);

    try {
      await setManualGroups(rebuilt);
    } catch (e) {
      setError(e.message);
    }
  };

  const toggleManual = async (team, currentGroupName) => {
    const names = groups.map((g) => g.name);
    const idx = names.indexOf(currentGroupName);
    const nextGroupName = names[(idx + 1) % names.length];
    await moveTeamToGroup(team, nextGroupName);
  };

  const handleDragStart = (team) => {
    setDraggedTeam(team);
  };

  const handleDragEnd = () => {
    setDraggedTeam(null);
    setDragOverGroup(null);
  };

  const handleDragOver = (e, groupName) => {
    e.preventDefault();
    setDragOverGroup(groupName);
  };

  const handleDragLeave = (groupName) => {
    setDragOverGroup((current) => (current === groupName ? null : current));
  };

  const handleDrop = (e, groupName) => {
    e.preventDefault();
    if (draggedTeam) {
      moveTeamToGroup(draggedTeam, groupName);
    }
    setDraggedTeam(null);
    setDragOverGroup(null);
  };

  const buildSchedule = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await generateSchedule(groups, matchesPerTeam);
      setScheduleData(data);
      setApprovedId(null);
      setStage("schedule");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!tournamentId) {
      setError("No tournament selected — go back to tournaments and select one first.");
      return;
    }

    const isReplacingExisting = hadExistingSchedule && approvedId === null;
    if (isReplacingExisting) {
      const confirmed = window.confirm(
        "This tournament already has an approved schedule. Approving this one will replace it — the old schedule will be kept in history but marked inactive. Continue?"
      );
      if (!confirmed) return;
    }

    setError("");
    setApproving(true);
    try {
      const result = await approveSchedule(tournamentId, scheduleData);
      setApprovedId(result.savedScheduleId);
      setHadExistingSchedule(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setApproving(false);
    }
  };

  const totalMatches = scheduleData
    ? scheduleData.groups.reduce((sum, g) => sum + g.fixtures.length, 0)
    : 0;

  const openHistory = async () => {
    setShowHistory(true);
    setLoadingHistory(true);
    try {
      const data = await getScheduleHistory(tournamentId);
      setHistory(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleActivate = async (scheduleId) => {
    if (activatingId) return;
    const confirmed = window.confirm(
      "Activate this schedule? It will replace the currently active schedule for this tournament."
    );
    if (!confirmed) return;

    setActivatingId(scheduleId);
    setError("");
    try {
      await activateSchedule(tournamentId, scheduleId);
      const activated = history.find((h) => h.id === scheduleId);
      if (activated) {
        setScheduleData({
          groups: activated.groups.map((g) => ({
            groupName: g.groupName,
            fixtures: g.fixtures.map((f) => ({ id: f.matchNumber, home: f.home, away: f.away })),
          })),
        });
        setApprovedId(activated.id);
      }
      setHadExistingSchedule(true);
      setShowHistory(false);
      const data = await getScheduleHistory(tournamentId);
      setHistory(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setActivatingId(null);
    }
  };

  // --- Matches module handlers ---

  const loadMatches = async (id = tournamentId) => {
    if (!id) return;
    setLoadingMatches(true);
    try {
      const data = await getMatches(id);
      setMatches(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingMatches(false);
    }
  };

  const goToMatches = async () => {
    setError("");
    await loadMatches();
    setStage("matches");
  };

  const handleStartTournament = async () => {
    setStartingTournament(true);
    setError("");
    try {
      await startTournament(tournamentId);
      setTournamentStarted(true);
      await loadMatches();
    } catch (e) {
      setError(e.message);
    } finally {
      setStartingTournament(false);
    }
  };

  const openMatchSetup = (matchId) => {
    setActiveMatchId(matchId);
    setStage("matchSetup");
  };

  const closeMatchSetup = () => {
    setLiveMatchId(activeMatchId);
    setActiveMatchId(null);
    setStage("liveMatch");
  };

  const openLiveMatch = (matchId) => {
    setLiveMatchId(matchId);
    setStage("liveMatch");
  };

  const closeLiveMatch = async () => {
    setLiveMatchId(null);
    await loadMatches();
    setStage("matches");
  };

  if (view === "home") {
    return <Home onSelectTournament={handleSelectTournament} />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "repeating-linear-gradient(180deg, #1B4332 0px, #1B4332 60px, #17402E 60px, #17402E 120px)",
        fontFamily: font.body,
        color: "#F7F5EF",
        paddingBottom: "4rem",
      }}
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&family=Teko:wght@500;600&display=swap"
      />

      <header
        style={{
          padding: "2.5rem 2rem 2rem",
          borderBottom: "3px solid rgba(247,245,239,0.15)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-60px",
            right: "-60px",
            width: "220px",
            height: "220px",
            borderRadius: "50%",
            border: "3px solid rgba(247,245,239,0.08)",
          }}
        />
        <div style={{ maxWidth: 920, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
          <div>
            <button
              onClick={goHome}
              style={{ background: "none", border: "none", color: "#F2A93B", fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 8, fontWeight: 600 }}
            >
              ← All tournaments
            </button>
            <p
              style={{
                fontFamily: "'Teko', sans-serif",
                fontSize: 18,
                letterSpacing: "0.35em",
                color: "#F2A93B",
                margin: 0,
                fontWeight: 600,
              }}
            >
              MATCHDAY SCHEDULER
            </p>
            <h1
              style={{
                fontFamily: font.display,
                fontSize: "3rem",
                margin: "0.2rem 0 0",
                letterSpacing: "0.02em",
                lineHeight: 1,
              }}
            >
              TOURNAMENT SCHEDULER
            </h1>
          </div>
          {!["manageTeams", "matchSetup"].includes(stage) && (
            <button
              onClick={openManageTeams}
              style={{ background: "rgba(247,245,239,0.1)", color: "#F7F5EF", border: "1px solid rgba(247,245,239,0.25)", borderRadius: 8, padding: "0.6rem 1.1rem", fontSize: 13, cursor: "pointer" }}
            >
              Manage teams
            </button>
          )}
        </div>
      </header>

      {stage === "manageTeams" ? (
        <TeamManagement tournamentId={tournamentId} onBack={closeManageTeams} />
      ) : !tournamentId ? (
        <main style={{ maxWidth: 920, margin: "0 auto", padding: "2.5rem 2rem", textAlign: "center" }}>
          <p style={{ color: "rgba(247,245,239,0.7)", marginBottom: 16 }}>
            No tournament selected.
          </p>
          <button
            onClick={goHome}
            style={{ background: "#F2A93B", color: "#1B1B1B", border: "none", borderRadius: 8, padding: "0.7rem 1.4rem", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            ← Go to tournaments
          </button>
        </main>
      ) : (
        <main style={{ maxWidth: 920, margin: "0 auto", padding: "2.5rem 2rem" }}>
          {["setup", "groups", "schedule"].includes(stage) && (
            <div style={{ display: "flex", gap: 8, marginBottom: "2.5rem" }}>
              {["setup", "groups", "schedule"].map((s, i) => (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      background: stage === s ? "#F2A93B" : "rgba(247,245,239,0.12)",
                      color: stage === s ? "#1B1B1B" : "#F7F5EF",
                    }}
                  >
                    {i + 1}
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: stage === s ? "#F2A93B" : "rgba(247,245,239,0.5)",
                      fontWeight: 600,
                    }}
                  >
                    {s}
                  </span>
                  {i < 2 && <div style={{ width: 30, height: 2, background: "rgba(247,245,239,0.15)" }} />}
                </div>
              ))}
            </div>
          )}

          {error && (
            <div
              style={{
                background: "rgba(226,75,74,0.15)",
                border: "1px solid #e24b4a",
                color: "#F7F5EF",
                padding: "0.8rem 1rem",
                borderRadius: 8,
                marginBottom: "1rem",
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          {loading && stage === "setup" && !groups.length && (
            <p style={{ color: "rgba(247,245,239,0.6)", marginBottom: 16 }}>Loading…</p>
          )}

          {stage === "setup" && (
            <div>
              <div style={{ background: "#F7F5EF", color: "#1B1B1B", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: 10 }}>
                  <h2 style={{ fontFamily: font.display, fontSize: 22, margin: 0 }}>SELECT TEAMS</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {availableTeams.length > 0 && (
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, cursor: "pointer", userSelect: "none" }}>
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          style={{ width: 16, height: 16, cursor: "pointer" }}
                        />
                        {allSelected ? "Unselect all" : "Select all"}
                      </label>
                    )}
                    <button
                      onClick={openManageTeams}
                      style={{ background: "transparent", border: "1px solid #1B4332", color: "#1B4332", borderRadius: 8, padding: "0.5rem 0.9rem", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      + Manage teams
                    </button>
                  </div>
                </div>

                {loadingTeams && <p style={{ color: "#8a8677", fontSize: 14 }}>Loading teams…</p>}

                {!loadingTeams && availableTeams.length === 0 && (
                  <p style={{ color: "#8a8677", fontSize: 14 }}>
                    No teams yet for this tournament. Click "Manage teams" to add some.
                  </p>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                  {availableTeams.map((t) => {
                    const selected = selectedTeamIds.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() => toggleTeamSelection(t.id)}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: selected ? "#E3EEE6" : "#EDEAE0",
                          border: selected ? "1.5px solid #1B4332" : "1.5px solid transparent",
                          padding: "0.5rem 0.8rem",
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        <span>⚽ {t.name}</span>
                        {selected && <span style={{ color: "#1B4332", fontWeight: 700 }}>✓</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ background: "rgba(247,245,239,0.06)", border: "1px solid rgba(247,245,239,0.15)", borderRadius: 12, padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                  <span style={{ fontSize: 14, color: "rgba(247,245,239,0.7)" }}>{teams.length} team{teams.length !== 1 ? "s" : ""} selected</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label style={{ fontSize: 14, color: "rgba(247,245,239,0.7)" }}>Number of groups</label>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, Math.floor(teams.length / 2) || 1)}
                      value={groupCount}
                      onChange={(e) => setGroupCount(Math.max(1, Number(e.target.value) || 1))}
                      style={{ width: 60, padding: "0.4rem", borderRadius: 6, border: "1.5px solid rgba(247,245,239,0.3)", background: "rgba(247,245,239,0.1)", color: "#F7F5EF", fontSize: 14, textAlign: "center" }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    disabled={teams.length < minTeamsNeeded || loading}
                    onClick={doRandomize}
                    style={{ flex: 1, background: teams.length < minTeamsNeeded ? "rgba(242,169,59,0.3)" : "#F2A93B", color: "#1B1B1B", border: "none", borderRadius: 8, padding: "0.8rem", fontWeight: 700, fontSize: 14, cursor: teams.length < minTeamsNeeded ? "not-allowed" : "pointer" }}
                  >
                    🎲 Randomize {groupCount} groups
                  </button>
                  <button
                    disabled={teams.length < minTeamsNeeded || loading}
                    onClick={goManual}
                    style={{ flex: 1, background: "transparent", color: "#F7F5EF", border: "1.5px solid rgba(247,245,239,0.4)", borderRadius: 8, padding: "0.8rem", fontWeight: 700, fontSize: 14, cursor: teams.length < minTeamsNeeded ? "not-allowed" : "pointer", opacity: teams.length < minTeamsNeeded ? 0.4 : 1 }}
                  >
                    ✋ Divide manually
                  </button>
                </div>
                {teams.length > 0 && teams.length < minTeamsNeeded && (
                  <p style={{ fontSize: 13, color: "#F2A93B", marginTop: 10 }}>
                    Select at least {minTeamsNeeded} teams for {groupCount} groups (min 2 per group).
                  </p>
                )}
              </div>
            </div>
          )}

          {stage === "groups" && (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                <button
                  onClick={() => setStage("setup")}
                  style={{ background: "rgba(247,245,239,0.1)", color: "#F7F5EF", border: "1px solid rgba(247,245,239,0.25)", borderRadius: 8, padding: "0.5rem 1rem", fontSize: 13, cursor: "pointer" }}
                >
                  ← Back to teams
                </button>
                <button
                  onClick={doRandomize}
                  style={{ background: "rgba(247,245,239,0.1)", color: "#F7F5EF", border: "1px solid rgba(247,245,239,0.25)", borderRadius: 8, padding: "0.5rem 1rem", fontSize: 13, cursor: "pointer" }}
                >
                  🎲 Re-shuffle
                </button>
                <span style={{ fontSize: 13, color: "rgba(247,245,239,0.6)" }}>
                  {Object.keys(manualPick).length > 0
                    ? "Drag a team into a different group (or tap it to cycle groups)"
                    : "Groups randomly assigned"}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${Math.min(groups.length, 3)}, 1fr)`,
                  gap: 16,
                  marginBottom: 24,
                }}
              >
                {groups.map((g, gi) => (
                  <div
                    key={g.name}
                    onDragOver={(e) => handleDragOver(e, g.name)}
                    onDragLeave={() => handleDragLeave(g.name)}
                    onDrop={(e) => handleDrop(e, g.name)}
                    style={{
                      background: dragOverGroup === g.name ? "#FFF3DD" : "#F7F5EF",
                      color: "#1B1B1B",
                      borderRadius: 12,
                      padding: "1.2rem",
                      border: dragOverGroup === g.name ? "2px dashed #F2A93B" : "2px dashed transparent",
                      transition: "background 0.15s, border-color 0.15s",
                      minHeight: 120,
                    }}
                  >
                    <h3 style={{ fontFamily: font.display, fontSize: 20, margin: "0 0 10px", color: gi % 2 === 0 ? "#1B4332" : "#8a4b1b" }}>
                      GROUP {g.name} · {g.teams.length}
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {g.teams.map((t) => (
                        <div
                          key={t}
                          draggable={!!manualPick[t]}
                          onDragStart={() => handleDragStart(t)}
                          onDragEnd={handleDragEnd}
                          onClick={() => manualPick[t] && toggleManual(t, g.name)}
                          style={{
                            background: gi % 2 === 0 ? "#E3EEE6" : "#F5E4CE",
                            padding: "0.5rem 0.7rem",
                            borderRadius: 6,
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: manualPick[t] ? "grab" : "default",
                            opacity: draggedTeam === t ? 0.4 : 1,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            userSelect: "none",
                          }}
                        >
                          {manualPick[t] && <span style={{ color: "#8a8677", fontSize: 12 }}>⠿</span>}
                          ⚽ {t}
                        </div>
                      ))}
                      {g.teams.length === 0 && (
                        <span style={{ fontSize: 13, color: "#999" }}>Drop a team here</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: "rgba(247,245,239,0.06)", border: "1px solid rgba(247,245,239,0.15)", borderRadius: 12, padding: "1.2rem", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <label style={{ fontSize: 14, color: "rgba(247,245,239,0.8)" }}>Matches per team</label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={matchesPerTeam}
                  onChange={(e) => setMatchesPerTeam(Number(e.target.value) || 1)}
                  style={{ width: 70, padding: "0.5rem", borderRadius: 6, border: "1.5px solid rgba(247,245,239,0.3)", background: "rgba(247,245,239,0.1)", color: "#F7F5EF", fontSize: 14, textAlign: "center" }}
                />
              </div>

              <button
                onClick={buildSchedule}
                disabled={loading}
                style={{ width: "100%", background: "#F2A93B", color: "#1B1B1B", border: "none", borderRadius: 10, padding: "1rem", fontWeight: 700, fontSize: 16, cursor: "pointer", fontFamily: font.display, letterSpacing: "0.03em" }}
              >
                {loading ? "GENERATING…" : "GENERATE FIXTURES →"}
              </button>
            </div>
          )}

          {stage === "schedule" && scheduleData && (
            <div>
              <button
                onClick={() => setStage("groups")}
                style={{ background: "rgba(247,245,239,0.1)", color: "#F7F5EF", border: "1px solid rgba(247,245,239,0.25)", borderRadius: 8, padding: "0.5rem 1rem", fontSize: 13, cursor: "pointer", marginBottom: 16 }}
              >
                ← Back to groups
              </button>
              <button
                onClick={openHistory}
                style={{ background: "rgba(247,245,239,0.1)", color: "#F7F5EF", border: "1px solid rgba(247,245,239,0.25)", borderRadius: 8, padding: "0.5rem 1rem", fontSize: 13, cursor: "pointer", marginBottom: 16, marginLeft: 8 }}
              >
                🕐 View schedule history
              </button>

              {showHistory && (
                <div style={{ background: "#F7F5EF", color: "#1B1B1B", borderRadius: 12, padding: "1.2rem", marginBottom: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h3 style={{ fontFamily: font.display, fontSize: 18, margin: 0 }}>SCHEDULE HISTORY</h3>
                    <button
                      onClick={() => setShowHistory(false)}
                      style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#8a8677" }}
                      aria-label="Close history"
                    >
                      ×
                    </button>
                  </div>

                  {loadingHistory && <p style={{ fontSize: 13, color: "#8a8677" }}>Loading…</p>}

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {history.map((h) => (
                      <div
                        key={h.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: h.isActive ? "#E3EEE6" : "#EDEAE0",
                          border: h.isActive ? "1.5px solid #1B4332" : "1.5px solid transparent",
                          padding: "0.7rem 0.9rem",
                          borderRadius: 8,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>
                            {new Date(h.createdAt).toLocaleString()}
                            {h.isActive && (
                              <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: "#3b6d11", background: "rgba(99,153,34,0.15)", padding: "2px 8px", borderRadius: 6 }}>
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: "#8a8677" }}>
                            {h.totalMatches} matches · {h.matchesPerTeam} per team
                          </div>
                        </div>
                        {!h.isActive && (
                          <button
                            onClick={() => handleActivate(h.id)}
                            disabled={activatingId === h.id}
                            style={{ background: "#1B4332", color: "#F7F5EF", border: "none", borderRadius: 6, padding: "0.4rem 0.8rem", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                          >
                            {activatingId === h.id ? "Activating…" : "Activate"}
                          </button>
                        )}
                      </div>
                    ))}
                    {!loadingHistory && history.length === 0 && (
                      <p style={{ fontSize: 13, color: "#8a8677" }}>No history yet.</p>
                    )}
                  </div>
                </div>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${Math.min(scheduleData.groups.length + 1, 4)}, 1fr)`,
                  gap: 12,
                  marginBottom: 24,
                }}
              >
                {scheduleData.groups.map((g) => (
                  <div key={g.groupName} style={{ background: "rgba(247,245,239,0.08)", border: "1px solid rgba(247,245,239,0.18)", borderRadius: 10, padding: "1rem", textAlign: "center" }}>
                    <div style={{ fontFamily: font.display, fontSize: 32, color: "#F2A93B" }}>{g.fixtures.length}</div>
                    <div style={{ fontSize: 12, color: "rgba(247,245,239,0.65)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Group {g.groupName}</div>
                  </div>
                ))}
                <div style={{ background: "rgba(242,169,59,0.15)", border: "1px solid #F2A93B", borderRadius: 10, padding: "1rem", textAlign: "center" }}>
                  <div style={{ fontFamily: font.display, fontSize: 32, color: "#F2A93B" }}>{totalMatches}</div>
                  <div style={{ fontSize: 12, color: "rgba(247,245,239,0.65)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total matches</div>
                </div>
              </div>

              {scheduleData.groups.map((g) => (
                <div key={g.groupName} style={{ marginBottom: 28 }}>
                  <h3 style={{ fontFamily: font.display, fontSize: 22, marginBottom: 12 }}>GROUP {g.groupName} FIXTURES</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
                    {g.fixtures.map((f) => (
                      <div key={f.id} style={{ background: "#F7F5EF", color: "#1B1B1B", borderRadius: 8, padding: "0.7rem 0.9rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontFamily: "'Teko', sans-serif", fontSize: 13, color: "#8a8677", fontWeight: 600, minWidth: 28 }}>
                          M{String(f.id).padStart(2, "0")}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 600, textAlign: "right", flex: 1 }}>{f.home}</span>
                        <span style={{ margin: "0 10px", fontFamily: font.display, fontSize: 13, color: "#F2A93B" }}>VS</span>
                        <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{f.away}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {approvedId ? (
                <>
                  <div
                    style={{
                      background: "rgba(99,153,34,0.15)",
                      border: "1px solid #639922",
                      color: "#F7F5EF",
                      padding: "1rem",
                      borderRadius: 10,
                      fontSize: 14,
                      textAlign: "center",
                    }}
                  >
                    ✓ Schedule approved and saved (ID: {approvedId})
                  </div>
                  <button
                    onClick={goToMatches}
                    style={{ width: "100%", marginTop: 12, background: "rgba(247,245,239,0.1)", color: "#F7F5EF", border: "1px solid rgba(247,245,239,0.25)", borderRadius: 10, padding: "0.9rem", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: font.display, letterSpacing: "0.03em" }}
                  >
                    🏟️ GO TO MATCHES →
                  </button>
                </>
              ) : (
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  style={{
                    width: "100%",
                    background: "#639922",
                    color: "#F7F5EF",
                    border: "none",
                    borderRadius: 10,
                    padding: "1rem",
                    fontWeight: 700,
                    fontSize: 16,
                    cursor: "pointer",
                    fontFamily: font.display,
                    letterSpacing: "0.03em",
                  }}
                >
                  {approving ? "SAVING…" : "✓ APPROVE SCHEDULE"}
                </button>
              )}
            </div>
          )}

          {stage === "matches" && (
            <MatchList
              matches={matches}
              loading={loadingMatches}
              tournamentStarted={tournamentStarted}
              starting={startingTournament}
              onStartTournament={handleStartTournament}
              onStartMatch={openMatchSetup}
              onEnterMatch={openLiveMatch}
              onBack={tournamentStarted ? null : () => setStage("schedule")}
            />
          )}

          {stage === "matchSetup" && activeMatchId && (
            <MatchSetup
              matchId={activeMatchId}
              onBack={closeMatchSetup}
              onStarted={closeMatchSetup}
            />
          )}

          {stage === "liveMatch" && liveMatchId && (
            <LiveMatch
              matchId={liveMatchId}
              onBack={closeLiveMatch}
              onCompleted={closeLiveMatch}
            />
          )}
        </main>
      )}
    </div>
  );
}