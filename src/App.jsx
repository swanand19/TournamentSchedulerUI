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
import CricketMatchSetup from "./cricket/CricketMatchSetup";
import CricketLiveMatch from "./cricket/CricketLiveMatch";
import TournamentStats from "./TournamentStats";
import CricketStats from "./cricket/CricketStats";
import { font, themeFor, syncDocumentSport } from "./theme";
import ErrorBanner from "./ErrorBanner";

// A stored schedule keeps only the fixtures, so the per-team totals shown for a freshly generated
// schedule are recomputed here rather than lost on reload.
function toDisplayGroup(savedGroup) {
  const fixtures = savedGroup.fixtures.map((f) => ({
    id: f.matchNumber,
    round: f.round || 0,
    home: f.home,
    away: f.away,
  }));

  const matchesByTeam = {};
  fixtures.forEach((f) => {
    matchesByTeam[f.home] = (matchesByTeam[f.home] || 0) + 1;
    matchesByTeam[f.away] = (matchesByTeam[f.away] || 0) + 1;
  });

  return {
    groupName: savedGroup.groupName,
    fixtures,
    matchesByTeam,
    maxMatchesPerTeam: Math.max(0, ...Object.values(matchesByTeam)),
    warnings: [],
  };
}

export default function App() {
  const [view, setView] = useState("home"); // home | tournament
  const [tournamentId, setTournamentId] = useState(null);
  // Which sport the open tournament is played under. Everything up to and including the schedule
  // is identical for both; only the palette and the match screens differ.
  const [sport, setSport] = useState("Football");
  // Shown in the header, so every screen says which tournament it belongs to.
  const [tournamentName, setTournamentName] = useState("");

  const [stage, setStage] = useState("setup"); // setup | groups | schedule | manageTeams | matches | matchSetup
  const [preManageTeamsStage, setPreManageTeamsStage] = useState("setup"); // where to return to after Manage Teams
  const [availableTeams, setAvailableTeams] = useState([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [groupCount, setGroupCount] = useState(1);
  const [groups, setGroups] = useState([]); // [{ name: "A", teams: [...] }, ...]
  const [matchesPerTeam, setMatchesPerTeam] = useState(5);
  const [allowRepeatFixtures, setAllowRepeatFixtures] = useState(false);
  const [manualPick, setManualPick] = useState({}); // teamName -> groupName
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [approving, setApproving] = useState(false);
  const [approvedId, setApprovedId] = useState(null);
  const [draggedTeam, setDraggedTeam] = useState(null);
  const [dragOverGroup, setDragOverGroup] = useState(null);
  const theme = themeFor(sport);
  const isCricket = sport === "Cricket";
  const compactHeader = stage === "matchSetup" || stage === "liveMatch";
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
  const [matchesTab, setMatchesTab] = useState("matches"); // matches | stats
  // Bumped whenever a match finishes, so the stats tab refetches instead of showing stale numbers.
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);

  // Home syncs its own tab, so only the tournament view owns <html data-sport>.
  useEffect(() => {
    if (view === "tournament") syncDocumentSport(sport);
  }, [view, sport]);

  const groupLabel = (i) => String.fromCharCode(65 + i); // A, B, C...

  // Saved schedules from before matchdays existed have round 0 — those render as one flat list.
  const groupFixturesByRound = (fixtures) => {
    const byRound = new Map();
    fixtures.forEach((f) => {
      const round = f.round || 0;
      if (!byRound.has(round)) byRound.set(round, []);
      byRound.get(round).push(f);
    });
    return [...byRound.entries()].sort((a, b) => a[0] - b[0]);
  };

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
    setAllowRepeatFixtures(false);
    setManualPick({});
    setScheduleData(null);
    setApprovedId(null);
    setHadExistingSchedule(false);
    setError("");
    setMatches([]);
    setTournamentStarted(false);
    setActiveMatchId(null);
    setMatchesTab("matches");
  };

  const handleSelectTournament = async (id, hasSchedule, isStarted = false, tournamentSport = "Football", name = "") => {
    setTournamentName(name);
    setError("");
    resetTournamentState();
    setTournamentId(id);
    setSport(tournamentSport);
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
          setScheduleData({ groups: saved.groups.map(toDisplayGroup) });
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
    setSport("Football");
    setTournamentName("");
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
      const data = await generateSchedule(groups, matchesPerTeam, allowRepeatFixtures);
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

  const scheduleWarnings = scheduleData
    ? scheduleData.groups.flatMap((g) => (g.warnings || []).map((w) => `Group ${g.groupName}: ${w}`))
    : [];

  // Live preview of what "matches per team" will actually produce, so the constraints are visible
  // before generating rather than as a surprise afterwards.
  const groupSizes = groups.map((g) => g.teams.length).filter((n) => n > 0);
  const smallestGroup = groupSizes.length ? Math.min(...groupSizes) : 0;
  const maxWithoutRepeats = Math.max(1, smallestGroup - 1);

  const scheduleHints = (() => {
    if (!groupSizes.length) return [];
    const hints = [];

    if (!allowRepeatFixtures && matchesPerTeam > maxWithoutRepeats) {
      hints.push({
        tone: "warn",
        text: `${matchesPerTeam} per team needs repeat fixtures — without them it will be capped at ${maxWithoutRepeats}. Tick the box above to schedule ${matchesPerTeam}.`,
      });
    }

    const effective = allowRepeatFixtures ? matchesPerTeam : Math.min(matchesPerTeam, maxWithoutRepeats);

    // Every match fills two team slots, so teams x matches has to be even in each group.
    const oddGroups = groups.filter((g) => g.teams.length > 1 && (g.teams.length * effective) % 2 !== 0);
    if (oddGroups.length) {
      const names = oddGroups.map((g) => `${g.name} (${g.teams.length} teams)`).join(", ");
      hints.push({
        tone: "warn",
        text: `Group ${names}: ${effective} matches each can't split evenly — one team will play ${effective - 1}. Use ${effective - 1} or ${effective + 1} for a perfectly even group.`,
      });
    }

    if (allowRepeatFixtures && smallestGroup > 1) {
      const legs = Math.floor(effective / maxWithoutRepeats);
      const extra = effective % maxWithoutRepeats;
      if (legs >= 1) {
        hints.push({
          tone: "info",
          text: `Smallest group: every pair meets ${legs} time${legs === 1 ? "" : "s"}` +
            (extra > 0 ? `, then ${extra} more match${extra === 1 ? "" : "es"} per team against random opponents.` : "."),
        });
      }
    }

    const estimate = groups.reduce((sum, g) => sum + Math.floor((g.teams.length * effective) / 2), 0);
    if (estimate > 0) hints.push({ tone: "info", text: `About ${estimate} matches in total across all groups.` });

    return hints;
  })();

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
        setScheduleData({ groups: activated.groups.map(toDisplayGroup) });
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

  // Leaving setup without starting — go back to the list, match stays NotStarted.
  const closeMatchSetup = async () => {
    setActiveMatchId(null);
    await loadMatches();
    setStage("matches");
  };

  const handleMatchStarted = () => {
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
    setStatsRefreshKey((k) => k + 1);   // a finished match changes every board
    setStage("matches");
  };

  if (view === "home") {
    return <Home onSelectTournament={handleSelectTournament} />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.background,
        fontFamily: font.body,
        color: theme.onDark,
        paddingBottom: "4rem",
      }}
    >
      <header
        style={{
          // Match screens are about the match, so the header steps back to a single line there.
          padding: compactHeader ? "1.25rem clamp(1rem, 4vw, 2rem)" : "2.5rem clamp(1rem, 4vw, 2rem) 2rem",
          borderBottom: `3px solid ${theme.borderOnDark}`,
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
              style={{ background: "none", border: "none", color: theme.accent, fontSize: 14, cursor: "pointer", padding: 0, marginBottom: 8, fontWeight: 600 }}
            >
              ← All tournaments
            </button>
            {!compactHeader && (
              <p
                style={{
                  fontFamily: font.condensed,
                  fontSize: 18,
                  // Wide tracking is the look; on a phone it would push the line onto two.
                  letterSpacing: "clamp(0.12em, 0.9vw, 0.35em)",
                  color: theme.accent,
                  margin: 0,
                  fontWeight: 600,
                }}
              >
                {theme.label.toUpperCase()} · MATCHDAY SCHEDULER
              </p>
            )}
            <h1
              style={{
                fontFamily: font.display,
                fontSize: compactHeader ? "clamp(1.4rem, 5vw, 1.9rem)" : "clamp(2rem, 8vw, 3rem)",
                margin: "0.2rem 0 0",
                letterSpacing: "0.02em",
                lineHeight: 1.05,
                textTransform: "uppercase",
                overflowWrap: "anywhere",
              }}
            >
              {tournamentName || "Tournament scheduler"}
            </h1>
          </div>
          {!["manageTeams", "matchSetup"].includes(stage) && (
            <button
              onClick={openManageTeams}
              style={{ background: "rgba(247,245,239,0.1)", color: "#F7F5EF", border: "1px solid rgba(247,245,239,0.25)", borderRadius: 8, padding: "0.6rem 1.1rem", fontSize: 14, cursor: "pointer" }}
            >
              Manage teams
            </button>
          )}
        </div>
      </header>

      {stage === "manageTeams" ? (
        <div className="view-in">
          <TeamManagement tournamentId={tournamentId} onBack={closeManageTeams} sport={sport} />
        </div>
      ) : !tournamentId ? (
        <main style={{ maxWidth: 920, margin: "0 auto", padding: "2.5rem 2rem", textAlign: "center" }}>
          <p style={{ color: "rgba(247,245,239,0.7)", marginBottom: 16 }}>
            No tournament selected.
          </p>
          <button
            onClick={goHome}
            style={{ background: theme.accent, color: "#1B1B1B", border: "none", borderRadius: 8, padding: "0.7rem 1.4rem", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            ← Go to tournaments
          </button>
        </main>
      ) : (
        <main style={{ maxWidth: 920, margin: "0 auto", padding: "2.5rem clamp(1rem, 4vw, 2rem)" }}>
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
                      fontSize: 14,
                      fontWeight: 700,
                      background: stage === s ? theme.accent : "rgba(247,245,239,0.12)",
                      color: stage === s ? theme.accentInk : theme.onDark,
                    }}
                  >
                    {i + 1}
                  </div>
                  <span
                    style={{
                      fontSize: 14,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: stage === s ? theme.accent : "rgba(247,245,239,0.7)",
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

          <ErrorBanner message={error} />

          {loading && stage === "setup" && !groups.length && (
            <p style={{ color: "rgba(247,245,239,0.6)", marginBottom: 16 }}>Loading…</p>
          )}

          {stage === "setup" && (
            <div className="view-in">
              <div style={{ background: "#F7F5EF", color: "#1B1B1B", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: 10 }}>
                  <h2 style={{ fontFamily: font.display, fontSize: 22, margin: 0 }}>SELECT TEAMS</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {availableTeams.length > 0 && (
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 500, cursor: "pointer", userSelect: "none" }}>
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
                      style={{ background: "transparent", border: `1px solid ${theme.deep}`, color: theme.deep, borderRadius: 8, padding: "0.5rem 0.9rem", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                    >
                      + Manage teams
                    </button>
                  </div>
                </div>

                {loadingTeams && <p style={{ color: theme.muted, fontSize: 14 }}>Loading teams…</p>}

                {!loadingTeams && availableTeams.length === 0 && (
                  <p style={{ color: theme.muted, fontSize: 14 }}>
                    No teams yet for this tournament. Click "Manage teams" to add some.
                  </p>
                )}

                <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                  {availableTeams.map((t, i) => {
                    const selected = selectedTeamIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        className="pressable"
                        aria-pressed={selected}
                        onClick={() => toggleTeamSelection(t.id)}
                        style={{
                          "--i": i,
                          color: theme.ink,
                          textAlign: "left",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: selected ? theme.tint : "#EDEAE0",
                          border: selected ? `1.5px solid ${theme.deep}` : "1.5px solid transparent",
                          padding: "0.5rem 0.8rem",
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        <span>{theme.icon} {t.name}</span>
                        {selected && <span style={{ color: theme.deep, fontWeight: 700 }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ background: "rgba(247,245,239,0.06)", border: "1px solid rgba(247,245,239,0.15)", borderRadius: 12, padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                  <span style={{ fontSize: 14, color: "rgba(247,245,239,0.7)" }}>{teams.length} team{teams.length !== 1 ? "s" : ""} selected</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label htmlFor="group-count" style={{ fontSize: 14, color: "rgba(247,245,239,0.7)" }}>Number of groups</label>
                    <input
                      id="group-count"
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
                    style={{ flex: 1, background: theme.accent, color: theme.accentInk, border: "none", borderRadius: 8, padding: "0.8rem", fontWeight: 700, fontSize: 14, cursor: teams.length < minTeamsNeeded ? "not-allowed" : "pointer" }}
                  >
                    🎲 Randomize {groupCount} groups
                  </button>
                  <button
                    disabled={teams.length < minTeamsNeeded || loading}
                    onClick={goManual}
                    style={{ flex: 1, background: "transparent", color: "#F7F5EF", border: "1.5px solid rgba(247,245,239,0.4)", borderRadius: 8, padding: "0.8rem", fontWeight: 700, fontSize: 14, cursor: teams.length < minTeamsNeeded ? "not-allowed" : "pointer" }}
                  >
                    ✋ Divide manually
                  </button>
                </div>
                {teams.length > 0 && teams.length < minTeamsNeeded && (
                  <p style={{ fontSize: 14, color: theme.accent, marginTop: 10 }}>
                    Select at least {minTeamsNeeded} teams for {groupCount} groups (min 2 per group).
                  </p>
                )}
              </div>
            </div>
          )}

          {stage === "groups" && (
            <div className="view-in">
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                <button
                  onClick={() => setStage("setup")}
                  style={{ background: "rgba(247,245,239,0.1)", color: "#F7F5EF", border: "1px solid rgba(247,245,239,0.25)", borderRadius: 8, padding: "0.5rem 1rem", fontSize: 14, cursor: "pointer" }}
                >
                  ← Back to teams
                </button>
                <button
                  onClick={doRandomize}
                  style={{ background: "rgba(247,245,239,0.1)", color: "#F7F5EF", border: "1px solid rgba(247,245,239,0.25)", borderRadius: 8, padding: "0.5rem 1rem", fontSize: 14, cursor: "pointer" }}
                >
                  🎲 Re-shuffle
                </button>
                <span style={{ fontSize: 14, color: "rgba(247,245,239,0.6)" }}>
                  {Object.keys(manualPick).length > 0
                    ? "Drag a team into a different group (or tap it to cycle groups)"
                    : "Groups randomly assigned"}
                </span>
              </div>

              <div
                className="cols stagger"
                style={{
                  "--cols": Math.min(groups.length, 3),
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
                      "--i": gi,
                      background: dragOverGroup === g.name ? "#FFF3DD" : "#F7F5EF",
                      color: "#1B1B1B",
                      borderRadius: 12,
                      padding: "1.2rem",
                      border: dragOverGroup === g.name ? `2px dashed ${theme.accent}` : "2px dashed transparent",
                      transition: "background 0.15s, border-color 0.15s",
                      minHeight: 120,
                    }}
                  >
                    <h3 style={{ fontFamily: font.display, fontSize: 20, margin: "0 0 10px", color: gi % 2 === 0 ? theme.deep : theme.warnInk }}>
                      GROUP {g.name} · {g.teams.length}
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {g.teams.map((t) => {
                        // Manual groups: a button, so a team can be moved from the keyboard too
                        // (each press moves it to the next group). Random groups: plain text.
                        const movable = !!manualPick[t];
                        const Chip = movable ? "button" : "div";
                        return (
                        <Chip
                          key={t}
                          type={movable ? "button" : undefined}
                          aria-label={movable ? `${t}, in group ${g.name}. Press to move to the next group.` : undefined}
                          draggable={movable}
                          onDragStart={() => handleDragStart(t)}
                          onDragEnd={handleDragEnd}
                          onClick={() => movable && toggleManual(t, g.name)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            color: theme.ink,
                            border: "none",
                            background: gi % 2 === 0 ? theme.tint : theme.tintAlt,
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
                          {movable && <span aria-hidden="true" style={{ color: theme.muted, fontSize: 12 }}>⠿</span>}
                          {theme.icon} {t}
                        </Chip>
                        );
                      })}
                      {g.teams.length === 0 && (
                        <span style={{ fontSize: 14, color: theme.muted }}>Drop a team here</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: "rgba(247,245,239,0.06)", border: "1px solid rgba(247,245,239,0.15)", borderRadius: 12, padding: "1.2rem", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <label htmlFor="matches-per-team" style={{ fontSize: 14, color: "rgba(247,245,239,0.8)" }}>Matches per team</label>
                  <input
                    id="matches-per-team"
                    type="number"
                    min={1}
                    max={allowRepeatFixtures ? 60 : Math.max(1, maxWithoutRepeats)}
                    value={matchesPerTeam}
                    onChange={(e) => setMatchesPerTeam(Math.max(1, Number(e.target.value) || 1))}
                    style={{ width: 70, padding: "0.5rem", borderRadius: 6, border: "1.5px solid rgba(247,245,239,0.3)", background: "rgba(247,245,239,0.1)", color: "#F7F5EF", fontSize: 14, textAlign: "center" }}
                  />
                </div>

                <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 14, color: "rgba(247,245,239,0.85)", cursor: "pointer", marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(247,245,239,0.12)" }}>
                  <input
                    type="checkbox"
                    checked={allowRepeatFixtures}
                    onChange={(e) => setAllowRepeatFixtures(e.target.checked)}
                    style={{ marginTop: 2 }}
                  />
                  <span>
                    Let a team face the same opponent more than once
                    <span style={{ display: "block", fontSize: 12, color: "rgba(247,245,239,0.7)", marginTop: 2 }}>
                      Off: each pair meets at most once, so a group of {smallestGroup || "n"} tops out at{" "}
                      {maxWithoutRepeats} match{maxWithoutRepeats === 1 ? "" : "es"} per team.
                      {" "}On: everyone plays everyone first, then the remaining matches are drawn against random opponents.
                    </span>
                  </span>
                </label>

                {scheduleHints.length > 0 && (
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                    {scheduleHints.map((hint, i) => (
                      <p key={i} style={{ fontSize: 12, color: hint.tone === "warn" ? theme.accent : "rgba(247,245,239,0.65)", margin: 0 }}>
                        {hint.tone === "warn" ? "⚠ " : "• "}{hint.text}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={buildSchedule}
                disabled={loading}
                style={{ width: "100%", background: theme.accent, color: theme.accentInk, border: "none", borderRadius: 10, padding: "1rem", fontWeight: 400, fontSize: 16, cursor: "pointer", fontFamily: font.display, letterSpacing: "0.03em" }}
              >
                {loading ? "GENERATING…" : "GENERATE FIXTURES →"}
              </button>
            </div>
          )}

          {stage === "schedule" && scheduleData && (
            <div className="view-in">
              <button
                onClick={() => setStage("groups")}
                style={{ background: "rgba(247,245,239,0.1)", color: "#F7F5EF", border: "1px solid rgba(247,245,239,0.25)", borderRadius: 8, padding: "0.5rem 1rem", fontSize: 14, cursor: "pointer", marginBottom: 16 }}
              >
                ← Back to groups
              </button>
              <button
                onClick={openHistory}
                style={{ background: "rgba(247,245,239,0.1)", color: "#F7F5EF", border: "1px solid rgba(247,245,239,0.25)", borderRadius: 8, padding: "0.5rem 1rem", fontSize: 14, cursor: "pointer", marginBottom: 16, marginLeft: 8 }}
              >
                🕐 View schedule history
              </button>

              {showHistory && (
                <div className="drop-in" style={{ background: "#F7F5EF", color: "#1B1B1B", borderRadius: 12, padding: "1.2rem", marginBottom: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h3 style={{ fontFamily: font.display, fontSize: 18, margin: 0 }}>SCHEDULE HISTORY</h3>
                    <button
                      onClick={() => setShowHistory(false)}
                      style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: theme.muted }}
                      aria-label="Close history"
                    >
                      ×
                    </button>
                  </div>

                  {loadingHistory && <p style={{ fontSize: 14, color: theme.muted }}>Loading…</p>}

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {history.map((h) => (
                      <div
                        key={h.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: h.isActive ? theme.tint : "#EDEAE0",
                          border: h.isActive ? `1.5px solid ${theme.deep}` : "1.5px solid transparent",
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
                          <div style={{ fontSize: 12, color: theme.muted }}>
                            {h.totalMatches} matches · {h.matchesPerTeam} per team
                          </div>
                        </div>
                        {!h.isActive && (
                          <button
                            onClick={() => handleActivate(h.id)}
                            disabled={activatingId === h.id}
                            style={{ background: theme.deep, color: "#F7F5EF", border: "none", borderRadius: 6, padding: "0.4rem 0.8rem", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                          >
                            {activatingId === h.id ? "Activating…" : "Activate"}
                          </button>
                        )}
                      </div>
                    ))}
                    {!loadingHistory && history.length === 0 && (
                      <p style={{ fontSize: 14, color: theme.muted }}>No history yet.</p>
                    )}
                  </div>
                </div>
              )}
              <div
                className="cols num"
                style={{
                  "--cols": Math.min(scheduleData.groups.length + 1, 4),
                  "--cols-sm": 2,
                  gap: 12,
                  marginBottom: 24,
                }}
              >
                {scheduleData.groups.map((g) => (
                  <div key={g.groupName} style={{ background: "rgba(247,245,239,0.08)", border: "1px solid rgba(247,245,239,0.18)", borderRadius: 10, padding: "1rem", textAlign: "center" }}>
                    <div style={{ fontFamily: font.display, fontSize: 32, color: theme.accent }}>{g.fixtures.length}</div>
                    <div style={{ fontSize: 12, color: "rgba(247,245,239,0.65)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Group {g.groupName}</div>
                  </div>
                ))}
                <div style={{ background: theme.accentSoft, border: `1px solid ${theme.accent}`, borderRadius: 10, padding: "1rem", textAlign: "center" }}>
                  <div style={{ fontFamily: font.display, fontSize: 32, color: theme.accent }}>{totalMatches}</div>
                  <div style={{ fontSize: 12, color: "rgba(247,245,239,0.65)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total matches</div>
                </div>
              </div>

              {scheduleWarnings.length > 0 && (
                <div style={{ background: theme.accentSoft, border: `1px solid ${theme.accent}`, borderRadius: 10, padding: "1rem", marginBottom: 24 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: theme.accent, margin: "0 0 8px" }}>How this schedule was built</p>
                  {scheduleWarnings.map((w, i) => (
                    <p key={i} style={{ fontSize: 12, color: "rgba(247,245,239,0.85)", margin: "0 0 6px", lineHeight: 1.5 }}>• {w}</p>
                  ))}
                </div>
              )}

              {scheduleData.groups.map((g) => {
                const rounds = groupFixturesByRound(g.fixtures);
                const perTeam = g.matchesByTeam || {};
                return (
                  <div key={g.groupName} style={{ marginBottom: 28 }}>
                    <h3 style={{ fontFamily: font.display, fontSize: 22, marginBottom: 6 }}>GROUP {g.groupName} FIXTURES</h3>

                    {Object.keys(perTeam).length > 0 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                        {Object.entries(perTeam)
                          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                          .map(([team, count]) => {
                            const isShort = g.maxMatchesPerTeam != null && count < g.maxMatchesPerTeam;
                            return (
                              <span
                                key={team}
                                title={isShort ? "One match fewer — an odd total can't be split evenly" : `${count} matches`}
                                style={{
                                  fontSize: 12, padding: "0.25rem 0.6rem", borderRadius: 6,
                                  background: isShort ? "rgba(242,169,59,0.2)" : "rgba(247,245,239,0.1)",
                                  color: isShort ? theme.accent : "rgba(247,245,239,0.75)",
                                  border: isShort ? "1px solid rgba(242,169,59,0.5)" : "1px solid transparent",
                                }}
                              >
                                {team} · {count}
                              </span>
                            );
                          })}
                      </div>
                    )}

                    {rounds.map(([roundNo, fixtures]) => (
                      <div key={roundNo} style={{ marginBottom: 14 }}>
                        {roundNo > 0 && (
                          <p style={{ fontFamily: "'Teko', sans-serif", fontSize: 14, letterSpacing: "0.12em", color: "rgba(247,245,239,0.7)", margin: "0 0 6px", fontWeight: 600 }}>
                            MATCHDAY {roundNo}
                          </p>
                        )}
                        <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
                          {fixtures.map((f, i) => (
                            <div key={f.id} style={{ "--i": i, background: "#F7F5EF", color: "#1B1B1B", borderRadius: 8, padding: "0.7rem 0.9rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ fontFamily: "'Teko', sans-serif", fontSize: 14, color: theme.muted, fontWeight: 600, minWidth: 28 }}>
                                M{String(f.id).padStart(2, "0")}
                              </span>
                              <span style={{ fontSize: 14, fontWeight: 600, textAlign: "right", flex: 1 }}>{f.home}</span>
                              <span style={{ margin: "0 10px", fontFamily: font.display, fontSize: 14, color: theme.warnInk }}>VS</span>
                              <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{f.away}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}

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
                    style={{ width: "100%", marginTop: 12, background: "rgba(247,245,239,0.1)", color: "#F7F5EF", border: "1px solid rgba(247,245,239,0.25)", borderRadius: 10, padding: "0.9rem", fontWeight: 400, fontSize: 16, cursor: "pointer", fontFamily: font.display, letterSpacing: "0.03em" }}
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
                    background: theme.successSolid,
                    color: "#F7F5EF",
                    border: "none",
                    borderRadius: 10,
                    padding: "1rem",
                    fontWeight: 400,
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
            <>
              {/* Matches and Stats live side by side on the tournament's landing page. */}
              {tournamentStarted && (
                <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid rgba(247,245,239,0.15)" }}>
                  {[
                    { key: "matches", label: "Matches", icon: "🏟️" },
                    { key: "stats", label: "Stats", icon: "📊" },
                  ].map((t) => {
                    const active = matchesTab === t.key;
                    return (
                      <button
                        key={t.key}
                        onClick={() => setMatchesTab(t.key)}
                        style={{
                          background: "transparent",
                          color: active ? theme.accent : "rgba(247,245,239,0.6)",
                          border: "none",
                          borderBottom: active ? `3px solid ${theme.accent}` : "3px solid transparent",
                          padding: "0.6rem 1rem",
                          fontSize: 14,
                          fontWeight: 400,
                          cursor: "pointer",
                          fontFamily: font.display,
                          letterSpacing: "0.04em",
                        }}
                      >
                        {t.icon} {t.label.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              )}

              {(!tournamentStarted || matchesTab === "matches") && (
                <div className="view-in">
                <MatchList
                  matches={matches}
                  loading={loadingMatches}
                  tournamentStarted={tournamentStarted}
                  starting={startingTournament}
                  onStartTournament={handleStartTournament}
                  onStartMatch={openMatchSetup}
                  onEnterMatch={openLiveMatch}
                  onBack={tournamentStarted ? null : () => setStage("schedule")}
                  sport={sport}
                />
                </div>
              )}

              {tournamentStarted && matchesTab === "stats" && (
                <div className="view-in">
                {isCricket ? (
                  <CricketStats tournamentId={tournamentId} refreshKey={statsRefreshKey} />
                ) : (
                  <TournamentStats tournamentId={tournamentId} refreshKey={statsRefreshKey} />
                )}
                </div>
              )}
            </>
          )}

          {/* Each sport has its own setup and its own console — a cricket fixture has no halves
              to configure and a football one has no toss. The stages are shared; the screens are not. */}
          {stage === "matchSetup" && activeMatchId && (
            <div className="view-in">
            {isCricket ? (
              <CricketMatchSetup
                matchId={activeMatchId}
                onBack={closeMatchSetup}
                onSetUp={handleMatchStarted}
              />
            ) : (
              <MatchSetup
                matchId={activeMatchId}
                onBack={closeMatchSetup}
                onStarted={handleMatchStarted}
              />
            )}
            </div>
          )}

          {stage === "liveMatch" && liveMatchId && (
            <div className="view-in">
            {isCricket ? (
              <CricketLiveMatch
                matchId={liveMatchId}
                onBack={closeLiveMatch}
                onCompleted={closeLiveMatch}
              />
            ) : (
              <LiveMatch
                matchId={liveMatchId}
                onBack={closeLiveMatch}
                onCompleted={closeLiveMatch}
              />
            )}
            </div>
          )}
        </main>
      )}
    </div>
  );
}