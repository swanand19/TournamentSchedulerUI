import { useState, useEffect, useMemo, useRef } from "react";
import { randomizeGroups, setManualGroups, generateSchedule, approveSchedule } from "./api/tournamentApi";
import { getTeams } from "./api/teamsApi";
import Home from "./Home";
import Account from "./Account";
import JoinTeam from "./JoinTeam";
import ClubPage from "./clubs/ClubPage";
import EnterTournament from "./clubs/EnterTournament";
import LeaguePage from "./leagues/LeaguePage";
import LeagueSettings from "./leagues/LeagueSettings";
import NewLeague from "./leagues/NewLeague";
import { leagueSource } from "./api/leaguesApi";
import FindTournament from "./FindTournament";
import Notifications from "./Notifications";
import TournamentPeople from "./TournamentPeople";
import PoolPage from "./pool/PoolPage";
import AuctionPage from "./pool/AuctionPage";
import DrawPage from "./pool/DrawPage";
import { publicLinkFor } from "./api/publicApi";
import TeamManagement from "./TeamManagement";
import { getTournamentSchedule, getScheduleHistory, activateSchedule, startTournament, getTournament, completeTournament } from "./api/tournamentsApi";
import { getMatches } from "./api/matchesApi";
import MatchList from "./MatchList";
import MatchSetup from "./MatchSetup";
import LiveMatch from "./LiveMatch";
import CricketMatchSetup from "./cricket/CricketMatchSetup";
import CricketLiveMatch from "./cricket/CricketLiveMatch";
import MatchWatch from "./watch/MatchWatch";
import Knockouts from "./Knockouts";
import TournamentStats from "./TournamentStats";
import CricketStats from "./cricket/CricketStats";
import { font, themeFor, syncDocumentSport } from "./theme";
import ErrorBanner from "./ErrorBanner";
import Profile from "./Profile";
import { pathFor, parsePath } from "./routing/routes";
import { startHistory, showPath, onHistoryMove } from "./routing/history";
import { followTournament } from "./api/publicApi";
import { joinClubByLink } from "./api/clubsApi";
import { joinTeamByLink } from "./api/teamsApi";
import { pictureSrc } from "./pictures";
import TopBar from "./ui/TopBar";
import { dateRange } from "./ui/format";
import { BracketIcon, PeopleIcon, PoolIcon, CalendarIcon, ListIcon, RingIcon, BarsIcon, TeamsIcon } from "./ui/icons";

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

/** "YYYY-MM-DD", `days` from today, in the browser's own time zone — a date input's value. */
function isoDay(days) {
  const d = new Date(Date.now() + days * 86400000);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function App() {
  const [view, setView] = useState("home"); // home | tournament | account | join | find | profile | club | enter
  // A lasting team on screen: { id, screen: "page" | "enter", entryId, ask } — or, for /enter/<code>, { code }.
  const [club, setClub] = useState(null);
  // A league (2026-11-24): { id, screen: page | settings | new, sport }.
  const [league, setLeague] = useState(null);
  const openLeagueId = league?.id ?? null;
  const leagueReads = useMemo(() => (openLeagueId ? leagueSource(openLeagueId) : null), [openLeagueId]);
  // Whose profile is open ({} = mine, or { playerId } from a name tapped), and where Back goes.
  const [profileWho, setProfileWho] = useState({});
  const [profileReturn, setProfileReturn] = useState("home");
  const [accountReturn, setAccountReturn] = useState("home");
  const [tournamentId, setTournamentId] = useState(null);
  // Which sport the open tournament is played under. Everything up to and including the schedule
  // is identical for both; only the palette and the match screens differ.
  const [sport, setSport] = useState("Football");
  // Shown in the header, so every screen says which tournament it belongs to.
  const [tournamentName, setTournamentName] = useState("");
  // The open tournament as the server sends it: status, dates, and `access` — what the signed-in
  // person may do here (owner, scorer). Buttons show only from it.
  const [tournamentInfo, setTournamentInfo] = useState(null);
  const [prePeopleStage, setPrePeopleStage] = useState("setup");
  const [preKnockoutStage, setPreKnockoutStage] = useState("setup");
  // The player pool and the draw or auction that fills the teams from it (2026-11-17).
  const [prePoolStage, setPrePoolStage] = useState("setup");
  const [completePromptDismissed, setCompletePromptDismissed] = useState(false);
  const access = tournamentInfo?.access ?? {};
  // The hall's TV board comes with a public tournament's link (/live/<code>/tv).
  const tvLink = tournamentInfo?.share ? `${publicLinkFor(tournamentInfo.share)}/tv` : null;
  const closed = tournamentInfo?.status === "Completed" || tournamentInfo?.status === "Cancelled";
  // The tournament's dates are chosen with its fixtures, on the schedule step: what's typed, or the
  // dates it already has, or today and a week on.
  const [dateDraft, setDateDraft] = useState({});
  const scheduleStart = dateDraft.start ?? tournamentInfo?.startDate ?? isoDay(0);
  const scheduleEnd = dateDraft.end ?? tournamentInfo?.endDate ?? isoDay(7);

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
  const compactHeader = stage === "matchSetup" || stage === "liveMatch" || stage === "watchMatch";
  // The tournament's pictures (HLD P-26): the banner only on the full header, the logo on both.
  const banner = compactHeader ? null : pictureSrc(tournamentInfo?.bannerUrl);
  const logo = pictureSrc(tournamentInfo?.logoUrl);
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
  const [watchMatchId, setWatchMatchId] = useState(null);
  const [matchesTab, setMatchesTab] = useState("matches"); // matches | table | summary | stats
  // Bumped whenever a match finishes, so the stats tab refetches instead of showing stale numbers.
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);

  // --- Addresses: see "Addresses" below ---
  const [homeNotice, setHomeNotice] = useState(""); // why a link couldn't open, shown on Home
  const [routeRound, setRouteRound] = useState(0); // bumped when a path has finished opening
  const openingRound = useRef(0);
  const replacingPath = useRef(true);
  const replaceNextPath = useRef(false);
  const shownPath = useRef(null);
  const openPathRef = useRef(null);
  const historyStarted = useRef(false);
  const baseStage = useRef("setup"); // the tournament's own page (setup / groups / schedule / matches / waiting)

  // <html data-sport> picks the wallpaper and the unprefixed colours: the tournament's sport inside
  // one, the neutral ground on pages that belong to no sport. A team's or league's page sets its own.
  useEffect(() => {
    if (view === "tournament") syncDocumentSport(sport);
    else if (view !== "club" && view !== "league") syncDocumentSport("None");
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
    setTournamentInfo(null);
    setCompletePromptDismissed(false);
    setDateDraft({});
  };

  /** Re-reads the tournament (status, dates, what I may do) — after anything that could change them. */
  const refreshTournament = async (id = tournamentId) => {
    if (!id) return null;
    try {
      const t = await getTournament(id);
      setTournamentInfo(t);
      setTournamentName(t.name);
      return t;
    } catch (e) {
      setError(e.message);
      return null;
    }
  };

  // Answers where it landed ({ stage, info, matches }), for a link that goes further in.
  const handleSelectTournament = async (id, hasSchedule, isStarted = false, tournamentSport = "Football", name = "") => {
    setTournamentName(name);
    setError("");
    setHomeNotice("");
    resetTournamentState();
    setTournamentId(id);
    setSport(tournamentSport);
    setHadExistingSchedule(hasSchedule);
    setTournamentStarted(isStarted);
    setView("tournament");

    // Groups and the schedule are the owners' to build; a scorer waits for kick-off.
    const info = await refreshTournament(id);
    const landed = (stage, matches = []) => {
      setStage(stage);
      return { stage, info, matches };
    };
    if (info && !info.access?.canEdit && !isStarted) return landed("waiting");

    if (isStarted) return landed("matches", await loadMatches(id));

    if (!hasSchedule) return landed("setup");
    setLoading(true);
    try {
      const saved = await getTournamentSchedule(id);
      if (!saved) {
        setHadExistingSchedule(false); // a link doesn't know, so it asks; there's none
        return landed("setup");
      }
      setScheduleData({ groups: saved.groups.map(toDisplayGroup) });
      setApprovedId(saved.id);
      setHadExistingSchedule(true);
      return landed("schedule");
    } catch (e) {
      setError(e.message);
      return landed("setup");
    } finally {
      setLoading(false);
    }
  };

  // Straight into the tournament just joined (its matches if started, otherwise "not started yet").
  // Answers whether it opened.
  const openJoinedTournament = async (joined) => {
    try {
      const t = await getTournament(joined.tournamentId);
      await handleSelectTournament(t.id, false, t.isStarted, t.sport, t.name);
      return true;
    } catch (e) {
      setError(e.message);
      setView("home");
      return false;
    }
  };

  // A notification: its tournament, and the match itself for a scoring handover.
  const openFromNotification = async ({ tournamentId, matchId, clubId, clubPlayerId, kind, teamId, profileUserId, leagueId }) => {
    // Made a league's organiser: its page.
    if (leagueId != null) return openLeague(leagueId);
    // Someone followed you (2026-11-23): their profile.
    if (profileUserId != null) return openProfile({ userId: profileUserId });
    // A lasting team's news opens its page (with the live-tournaments question for someone who just joined).
    if (clubId != null) return openClub(clubId, { ask: clubPlayerId ?? null });
    const opened = await openJoinedTournament({ tournamentId });
    if (!opened) return;
    // Someone you follow is playing: the match, to watch (never to score).
    if (kind === "Social" && matchId != null) openWatch(matchId);
    else if (matchId != null) openLiveMatch(matchId);
    else if (kind === "Club" || teamId != null) openManageTeams(); // an entry waiting for an answer, or "keep this team?"
  };

  /** A league's page, its settings, or (screen "new") starting one in a sport. */
  const openLeague = (id, { screen = "page", sport = null } = {}) => {
    setLeague({ id, screen, sport });
    setView("league");
  };

  // A season from its league's page: straight in if the person is in it already; otherwise they follow it first
  // (every tournament is public), then it opens like any tournament they follow.
  const openSeason = async (s) => {
    if (!s.canOpen && s.liveCode) {
      try {
        await followTournament(s.liveCode);
      } catch (e) {
        setError(e.message);
        return;
      }
    }
    await openJoinedTournament({ tournamentId: s.tournamentId });
  };

  /** A lasting team's page, or (screen "enter") entering it into a tournament. */
  const openClub = (id, { screen = "page", entryId = null, ask = null } = {}) => {
    setClub({ id, screen, entryId, ask });
    setView("club");
  };

  // A player left their own team: if that was all they were here, the tournament is gone for them.
  // Answers whether they can still see it.
  const afterLeavingTeam = async () => {
    try {
      const t = await getTournament(tournamentId);
      setTournamentInfo(t);
      return true;
    } catch {
      goHome();
      return false;
    }
  };

  const goHome = () => {
    setHomeNotice("");
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

  const openPeople = () => {
    setPrePeopleStage(stage);
    setStage("people");
  };

  const openPool = () => {
    if (!["pool", "auction", "draw"].includes(stage)) setPrePoolStage(stage);
    setStage("pool");
  };

  // Back from the pool: the squads may have changed (a draw or an auction confirmed).
  const closePool = async () => {
    await loadAvailableTeams(tournamentId);
    if (tournamentStarted) {
      await loadMatches();
      setStage("matches");
    } else {
      setStage(prePoolStage || "setup");
    }
  };

  // The knockout stage: everyone may look; owners set it up from here, before or after the start.
  const openKnockouts = () => {
    setPreKnockoutStage(stage);
    setStage("knockout");
  };

  const closeKnockouts = async () => {
    if (tournamentStarted) {
      await loadMatches();
      setStage("matches");
    } else {
      setStage(preKnockoutStage || "setup");
    }
  };

  // A knockout match from the bracket: the scorer's screens for those who can score, the viewer for everyone else.
  const openKnockoutMatch = (fixture) => {
    if (!access.canScore) return openWatch(fixture.matchId);
    if (fixture.status === "NotStarted") return openMatchSetup(fixture.matchId);
    openLiveMatch(fixture.matchId);
  };

  const markComplete = async () => {
    if (!window.confirm(`Mark ${tournamentName} complete?\n\nNothing can be started or changed afterwards. This can't be undone.`)) return;
    setError("");
    try {
      setTournamentInfo(await completeTournament(tournamentId));
    } catch (e) {
      setError(e.message);
    }
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
      const result = await approveSchedule(tournamentId, scheduleData, { startDate: scheduleStart, endDate: scheduleEnd });
      setApprovedId(result.savedScheduleId);
      setHadExistingSchedule(true);
      setDateDraft({});
      await refreshTournament();
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
    if (!id) return [];
    setLoadingMatches(true);
    try {
      const data = await getMatches(id);
      setMatches(data);
      return data;
    } catch (e) {
      setError(e.message);
      return [];
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
    replaceNextPath.current = true; // the setup screen is done with; Back from the live match skips it
    setLiveMatchId(activeMatchId);
    setActiveMatchId(null);
    setStage("liveMatch");
  };

  const openLiveMatch = (matchId) => {
    setLiveMatchId(matchId);
    setStage("liveMatch");
  };

  // Watching (Round 2): everyone who can't score, and owners or scorers who chose "Watch".
  const openWatch = (matchId) => {
    setLiveMatchId(null);
    setWatchMatchId(matchId);
    setStage("watchMatch");
  };

  const closeWatch = async () => {
    setWatchMatchId(null);
    await loadMatches();
    setStage("matches");
  };

  const closeLiveMatch = async () => {
    setLiveMatchId(null);
    await loadMatches();
    await refreshTournament(); // the last match finishing is when "mark it complete?" appears
    setStatsRefreshKey((k) => k + 1);   // a finished match changes every board
    setStage("matches");
  };

  const openProfile = (who) => {
    setProfileWho(who);
    setProfileReturn(view);
    setView("profile");
  };

  // --- Addresses (src/routing) ---
  // The address bar follows the screen state below; a link, a refresh, or the browser's Back and Forward
  // open a path through the same functions the buttons use.

  // Opens a tournament from a link: its own landing page first, exactly as from Home. Answers
  // where it landed, or null when it can't be seen (back Home with the server's reason).
  const openTournamentFromLink = async (id) => {
    try {
      const t = await getTournament(id);
      return await handleSelectTournament(t.id, !t.isStarted, t.isStarted, t.sport, t.name);
    } catch (e) {
      goHome();
      setHomeNotice(e.message);
      return null;
    }
  };

  const openPath = async (pathname) => {
    const route = parsePath(pathname);
    if (route.name === "home") {
      if (view !== "home") goHome();
      return;
    }
    if (route.name === "profile") {
      setProfileWho(route.who);
      setView("profile");
      return;
    }
    if (route.name === "follow") {
      try {
        const followed = await followTournament(route.code);
        await openTournamentFromLink(followed.tournamentId);
      } catch (e) {
        goHome();
        setHomeNotice(e.message);
      }
      return;
    }
    // An invite link (2026-11-23): eight characters are a lasting team's code, six a tournament's team's. Signed out,
    // AuthGate keeps the address until sign-in or sign-up finishes, so leaving halfway joins nobody.
    if (route.name === "joinLink") {
      try {
        const code = route.code.replace(/[\s-]/g, "");
        if (code.length === 8) openClub((await joinClubByLink(code)).clubId);
        else await openJoinedTournament(await joinTeamByLink(code));
      } catch (e) {
        goHome();
        setHomeNotice(e.message);
      }
      return;
    }
    if (route.name === "club") {
      setClub({ id: route.id, screen: route.screen });
      setView("club");
      return;
    }
    if (route.name === "league") {
      setLeague({ id: route.id ?? null, screen: route.screen, sport: null });
      setView("league");
      return;
    }
    if (route.name === "enter") {
      setClub({ code: route.code });
      setView("enter");
      return;
    }
    if (route.name !== "tournament") {
      setView(route.name);
      return;
    }

    // Already open: only the screen within it changes. Otherwise it opens on its landing page first.
    let here = { stage: baseStage.current, info: tournamentInfo, matches, started: tournamentStarted };
    if (view !== "tournament" || tournamentId !== route.id || !tournamentInfo) {
      const opened = await openTournamentFromLink(route.id);
      if (!opened || route.screen === "landing") return;
      here = { ...opened, started: opened.stage === "matches" };
    }
    const { stage: landing, info, started } = here;
    const backToLanding = async () => {
      setActiveMatchId(null);
      setLiveMatchId(null);
      setWatchMatchId(null);
      setMatchesTab("matches");
      if (started && stage !== "matches") {
        await loadMatches();
        setStatsRefreshKey((k) => k + 1);
      }
      setStage(landing);
    };

    switch (route.screen) {
      case "teams":
        setPreManageTeamsStage(landing);
        setStage("manageTeams");
        return;
      case "people":
        setPrePeopleStage(landing);
        setStage("people");
        return;
      case "knockout":
        if (!info?.access?.canEdit && !started) return backToLanding();
        setPreKnockoutStage(landing);
        setStage("knockout");
        return;
      case "pool":
      case "auction":
      case "draw":
        setPrePoolStage(landing);
        setStage(route.screen);
        return;
      case "table":
      case "summary":
      case "stats":
        if (!started) return backToLanding();
        setMatchesTab(route.screen);
        setStage("matches");
        return;
      case "match":
      case "setup":
      case "watch": {
        const card = started ? here.matches.find((m) => m.id === route.matchId) : null;
        if (!card) {
          await backToLanding();
          if (started) setError("That match isn't in this tournament.");
          return;
        }
        // The same choice the match list makes: who can score gets the scorer's screens (a finished
        // match's summary too), everyone else watches.
        if (route.screen === "watch" || !info?.access?.canScore) return openWatch(card.id);
        if (card.status === "NotStarted") return openMatchSetup(card.id);
        return openLiveMatch(card.id);
      }
      default:
        return backToLanding();
    }
  };

  const path = pathFor({ view, stage, tournamentId, activeMatchId, liveMatchId, watchMatchId, matchesTab, profileWho, club, league });

  // While a path is being opened, the screens it passes through replace the address instead of adding
  // entries; the round it finishes with (routeRound) ends that.
  useEffect(() => {
    if (routeRound === 0) return; // the first address is still being opened
    const replace = replacingPath.current || replaceNextPath.current;
    replaceNextPath.current = false;
    if (routeRound === openingRound.current) replacingPath.current = false;
    showPath(path, { replace });
    shownPath.current = path;
    document.title = view === "tournament" && tournamentName ? `${tournamentName} · KickCricket` : "KickCricket";
  }, [path, routeRound, view, tournamentName]);

  useEffect(() => {
    openPathRef.current = openPath;
    if (["setup", "groups", "schedule", "matches", "waiting"].includes(stage)) baseStage.current = stage;
  });

  useEffect(() => {
    const open = async (pathname) => {
      replacingPath.current = true;
      const round = ++openingRound.current;
      try {
        await openPathRef.current(pathname);
      } finally {
        setRouteRound(round);
      }
    };
    if (!historyStarted.current) {
      historyStarted.current = true;
      startHistory();
      open(window.location.pathname);
    }
    // Our own in-app Back has already moved the screen; only a real Back or Forward needs opening.
    return onHistoryMove((pathname) => {
      if (pathname !== shownPath.current) open(pathname);
    });
  }, []);

  // The frame every signed-in page shares (2026-11-26): the top bar above the screen.
  const framed = (content, crumb = []) => (
    <div className="kc-page">
      <TopBar crumb={crumb} onHome={goHome} onFind={() => setView("find")} onInbox={() => setView("notifications")} onProfile={() => openProfile({})} />
      {content}
    </div>
  );

  if (view === "home") {
    return framed(
      <Home
        notice={homeNotice}
        onSelectTournament={handleSelectTournament}
        onOpenAccount={() => openProfile({})}
        onJoinTeam={() => setView("join")}
        onFindTournament={() => setView("find")}
        onOpenNotifications={() => setView("notifications")}
        onOpenClub={(id) => openClub(id)}
        onOpenLeague={(id) => openLeague(id)}
        onNewLeague={(sport) => openLeague(null, { screen: "new", sport })}
      />
    );
  }

  if (view === "league") {
    if (league?.screen === "new")
      return framed(<NewLeague key={`new-${league.sport}`} sport={league.sport ?? "Cricket"} onBack={goHome} onCreated={(id) => openLeague(id)} />, [{ label: "New league" }]);
    if (league?.id && league.screen === "settings")
      return framed(<LeagueSettings key={`settings-${league.id}`} leagueId={league.id} onBack={() => openLeague(league.id)} onDeleted={goHome} />, [{ label: "League settings" }]);
    if (league?.id && leagueReads)
      return framed(
        <LeaguePage
          key={`league-${league.id}`}
          source={leagueReads}
          back="Your tournaments"
          onBack={goHome}
          onGone={(message) => {
            goHome();
            setHomeNotice(message);
          }}
          onSettings={() => openLeague(league.id, { screen: "settings" })}
          onOpenSeason={openSeason}
          onCreated={(t) => openJoinedTournament({ tournamentId: t.id })}
          onOpenPlayer={(r) => openProfile(r.userId != null ? { userId: r.userId } : { playerId: r.playerId })}
        />,
        [{ label: "League" }]
      );
    return null;
  }

  if (view === "profile") {
    return framed(
      <Profile
        who={profileWho}
        onBack={() => setView(profileReturn)}
        onEditAccount={() => {
          setAccountReturn("profile");
          setView("account");
        }}
        onOpenTournament={(tournamentId) => openJoinedTournament({ tournamentId })}
        onOpenPerson={(userId) => setProfileWho({ userId })}
        onWatchMatch={async (tournamentId, matchId) => {
          if (await openJoinedTournament({ tournamentId })) openWatch(matchId);
        }}
      />,
      [{ label: profileWho?.userId || profileWho?.playerId ? "Profile" : "Your profile" }]
    );
  }

  if (view === "account") {
    return framed(
      <Account
        backLabel={accountReturn === "profile" ? "Your profile" : "Your tournaments"}
        onBack={() => {
          setView(accountReturn);
          setAccountReturn("home");
        }}
      />,
      [{ label: "Your profile", onClick: () => openProfile({}) }, { label: "Account" }]
    );
  }

  if (view === "join") {
    return framed(<JoinTeam onBack={() => setView("home")} onJoined={openJoinedTournament} onJoinedClub={(id) => openClub(id)} />, [{ label: "Join a team" }]);
  }

  if (view === "club" && club?.id) {
    return framed(club.screen === "enter" ? (
      <EnterTournament
        key={`enter-${club.id}-${club.entryId ?? 0}`}
        clubId={club.id}
        entryId={club.entryId}
        onBack={() => openClub(club.id)}
        onOpenTournament={(tournamentId) => openJoinedTournament({ tournamentId })}
      />
    ) : (
      <ClubPage
        key={`club-${club.id}`}
        clubId={club.id}
        ask={club.ask}
        onBack={goHome}
        onGone={goHome}
        onOpenTournament={(tournamentId) => openJoinedTournament({ tournamentId })}
        onEnter={(entryId) => openClub(club.id, { screen: "enter", entryId })}
      />
    ), [{ label: club.screen === "enter" ? "Enter a tournament" : "Team" }]);
  }

  if (view === "enter" && club?.code) {
    return framed(<EnterTournament code={club.code} onBack={goHome} onOpenTournament={(tournamentId) => openJoinedTournament({ tournamentId })} />, [{ label: "Enter a tournament" }]);
  }

  if (view === "find") {
    return framed(<FindTournament onBack={() => setView("home")} onOpen={(tournamentId) => openJoinedTournament({ tournamentId })} onOpenPerson={(userId) => openProfile({ userId })} />, [{ label: "Find" }]);
  }

  if (view === "notifications") {
    return framed(<Notifications onBack={() => setView("home")} onOpen={openFromNotification} />, [{ label: "Inbox" }]);
  }

  // The tournament's tabs once it has started (the phone hub's five): Teams is its own stage.
  const tabNow = stage === "manageTeams" ? "teams" : stage === "matches" ? matchesTab : null;
  const showTabs = tournamentStarted && tabNow !== null;
  const pickTab = (key) => {
    if (key === "teams") {
      if (stage !== "manageTeams") openManageTeams();
      return;
    }
    if (stage === "manageTeams") {
      setStage("matches");
      loadAvailableTeams(tournamentId);
    }
    setMatchesTab(key);
  };
  const leagueLine = tournamentInfo?.league;
  const range = dateRange(tournamentInfo);
  const fullHead = !compactHeader;

  return (
    <div className={`kc-page${showTabs ? " kc-tabbed" : ""}`}>
      <TopBar
        crumb={[{ label: tournamentName || "Tournament" }]}
        onHome={goHome}
        onFind={() => setView("find")}
        onInbox={() => setView("notifications")}
        onProfile={() => openProfile({})}
      />
      {fullHead && (
        <div className="kc-wrap kc-thead">
          {/* The owners' banner (HLD P-26) above the name. */}
          {banner && (stage === "matches" ? matchesTab === "matches" : ["setup", "groups", "schedule", "waiting"].includes(stage)) && <img className="kc-banner" src={banner} alt="" onError={(e) => (e.currentTarget.style.display = "none")} />}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
            {logo && <img className="kc-logo" src={logo} alt="" width={56} height={56} style={{ width: 56, height: 56, borderRadius: 14 }} onError={(e) => (e.currentTarget.style.display = "none")} />}
            <div className="kc-grow" style={{ flexBasis: 280 }}>
              <h1 className="kc-title">{tournamentName || "Tournament"}</h1>
              <div className="kc-sub" style={{ marginTop: 6 }}>
                {[range, theme.label].filter(Boolean).join(" · ")}
                {/* A league's season (2026-11-24): "Season 3 of Corporate Premier League", opening the league. */}
                {leagueLine && (
                  <>
                    {" · "}
                    <button type="button" className="kc-link" onClick={() => openLeague(leagueLine.leagueId)}>
                      Season {leagueLine.season} of {leagueLine.name}
                    </button>
                  </>
                )}
              </div>
            </div>
            {!["matchSetup", "people", "knockout", "pool", "auction", "draw"].includes(stage) && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {tournamentInfo && (access.canEdit || tournamentStarted) && stage !== "waiting" && (
                  <button type="button" className="kc-btn sm sec" onClick={openKnockouts}>
                    <BracketIcon size={18} /> Knockouts
                  </button>
                )}
                {tournamentInfo && (
                  <button type="button" className="kc-btn sm sec" onClick={openPool}>
                    <PoolIcon size={18} /> Player pool
                  </button>
                )}
                {tournamentInfo && !tournamentStarted && stage !== "manageTeams" && (
                  <button type="button" className="kc-btn sm sec" onClick={openManageTeams}>
                    <TeamsIcon size={18} /> {access.canEdit ? "Manage teams" : "Teams"}
                  </button>
                )}
                <button type="button" className="kc-btn sm sec" onClick={openPeople}>
                  <PeopleIcon size={18} /> People and settings
                </button>
              </div>
            )}
          </div>
          {showTabs && (
            <nav className="kc-tabs kc-float" aria-label="Tournament">
              {[
                ["matches", "Matches", CalendarIcon],
                ["table", "Table", ListIcon],
                ["summary", "Summary", RingIcon],
                ["stats", "Stats", BarsIcon],
                ["teams", "Teams", TeamsIcon],
              ].map(([key, label, Icon]) => (
                <button key={key} type="button" aria-current={tabNow === key ? "page" : undefined} onClick={() => pickTab(key)}>
                  <Icon />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          )}
        </div>
      )}

      {stage === "manageTeams" ? (
        <div className="kc-wrap kc-main view-in">
          <TeamManagement tournamentId={tournamentId} onBack={tournamentStarted ? null : closeManageTeams} sport={sport} canEdit={!!access.canEdit} started={tournamentStarted} league={tournamentInfo?.league ?? null} onLeftTeam={afterLeavingTeam} onOpenPlayer={(playerId) => openProfile({ playerId })} onOpenClub={(id) => openClub(id)} />
        </div>
      ) : stage === "people" && tournamentInfo ? (
        <main className="kc-wrap kc-main">
          <TournamentPeople
            tournament={tournamentInfo}
            sport={sport}
            onBack={() => setStage(prePeopleStage || "setup")}
            onChanged={(t) => { setTournamentInfo(t); setTournamentName(t.name); }}
            onLeft={goHome}
          />
        </main>
      ) : stage === "knockout" && tournamentInfo ? (
        <main className="kc-wrap kc-main view-in">
          <ErrorBanner message={error} />
          <Knockouts
            key={String(tournamentStarted)}
            tournamentId={tournamentId}
            sport={sport}
            tournament={tournamentInfo}
            started={tournamentStarted}
            canEdit={!!access.canEdit}
            canScore={!!access.canScore}
            teams={availableTeams}
            onBack={closeKnockouts}
            onOpenMatch={openKnockoutMatch}
            onStartTournament={async () => {
              await handleStartTournament();
              await refreshTournament();
            }}
            starting={startingTournament}
          />
        </main>
      ) : ["pool", "auction", "draw"].includes(stage) && tournamentInfo ? (
        <main className="kc-wrap kc-main">
          {stage === "pool" ? (
            <PoolPage
              tournamentId={tournamentId}
              tournamentName={tournamentName}
              sport={sport}
              onBack={closePool}
              onOpenDraw={() => setStage("draw")}
              onOpenAuction={() => setStage("auction")}
            />
          ) : stage === "auction" ? (
            <AuctionPage tournamentId={tournamentId} tournamentName={tournamentName} sport={sport} tvLink={tvLink} onBack={() => setStage("pool")} />
          ) : (
            <DrawPage tournamentId={tournamentId} tournamentName={tournamentName} sport={sport} tvLink={tvLink} onBack={() => setStage("pool")} />
          )}
        </main>
      ) : stage === "waiting" ? (
        <main className="kc-wrap kc-main">
          <ErrorBanner message={error} />
          <div style={{ background: theme.cream, color: theme.ink, borderRadius: 12, padding: "1.5rem" }}>
            <h2 style={{ fontFamily: font.display, fontSize: 22, margin: "0 0 8px" }}>Not started yet</h2>
            <p style={{ fontSize: 14, margin: 0, lineHeight: 1.5 }}>
              The tournament's owners are still setting up its teams and fixtures. Once they start it, its
              matches appear here{access.canScore ? " and you can score them" : " to follow"}.
            </p>
          </div>
        </main>
      ) : !tournamentId ? (
        <main className="kc-wrap kc-main" style={{ textAlign: "center" }}>
          <p style={{ color: "rgba(var(--fg-rgb), 0.7)", marginBottom: 16 }}>
            No tournament selected.
          </p>
          <button
            onClick={goHome}
            style={{ background: theme.accent, color: "var(--ink)", border: "none", borderRadius: 8, padding: "0.7rem 1.4rem", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            ← Go to tournaments
          </button>
        </main>
      ) : (
        <main className="kc-wrap kc-main">
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
                      background: stage === s ? theme.accent : "rgba(var(--fg-rgb), 0.12)",
                      color: stage === s ? theme.accentInk : theme.onDark,
                    }}
                  >
                    {i + 1}
                  </div>
                  <span
                    style={{
                      fontSize: 15,
                      color: stage === s ? "var(--ink)" : "var(--muted)",
                      fontWeight: stage === s ? "var(--w-strong)" : 400,
                    }}
                  >
                    {{ setup: "Teams", groups: "Groups", schedule: "Schedule" }[s]}
                  </span>
                  {i < 2 && <div style={{ width: 30, height: 2, background: "rgba(var(--fg-rgb), 0.15)" }} />}
                </div>
              ))}
            </div>
          )}

          <ErrorBanner message={error} />

          {loading && stage === "setup" && !groups.length && (
            <p style={{ color: "rgba(var(--fg-rgb), 0.6)", marginBottom: 16 }}>Loading…</p>
          )}

          {stage === "setup" && (
            <div className="view-in">
              {access.canEdit && (
                <p style={{ color: theme.onDarkMuted, fontSize: 14, margin: "0 0 12px" }}>
                  Knockouts only, with no groups?{" "}
                  <button onClick={openKnockouts} style={{ background: "none", border: "none", color: theme.accent, textDecoration: "underline", fontSize: 14, cursor: "pointer", padding: 0 }}>
                    Set up a knockout of all the teams
                  </button>
                </p>
              )}
              <div style={{ background: "var(--cream)", color: "var(--ink)", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: 10 }}>
                  <h2 style={{ fontFamily: font.display, fontSize: 22, margin: 0 }}>Select teams</h2>
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
                          background: selected ? theme.tint : "var(--chip)",
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

              <div style={{ background: "rgba(var(--fg-rgb), 0.06)", border: "1px solid rgba(var(--fg-rgb), 0.15)", borderRadius: 12, padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                  <span style={{ fontSize: 14, color: "rgba(var(--fg-rgb), 0.7)" }}>{teams.length} team{teams.length !== 1 ? "s" : ""} selected</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label htmlFor="group-count" style={{ fontSize: 14, color: "rgba(var(--fg-rgb), 0.7)" }}>Number of groups</label>
                    <input
                      id="group-count"
                      type="number"
                      min={1}
                      max={Math.max(1, Math.floor(teams.length / 2) || 1)}
                      value={groupCount}
                      onChange={(e) => setGroupCount(Math.max(1, Number(e.target.value) || 1))}
                      style={{ width: 60, padding: "0.4rem", borderRadius: 6, border: "1.5px solid rgba(var(--fg-rgb), 0.3)", background: "rgba(var(--fg-rgb), 0.1)", color: "var(--on-page)", fontSize: 14, textAlign: "center" }}
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
                    style={{ flex: 1, background: "transparent", color: "var(--on-page)", border: "1.5px solid rgba(var(--fg-rgb), 0.4)", borderRadius: 8, padding: "0.8rem", fontWeight: 700, fontSize: 14, cursor: teams.length < minTeamsNeeded ? "not-allowed" : "pointer" }}
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
                  style={{ background: "rgba(var(--fg-rgb), 0.1)", color: "var(--on-page)", border: "1px solid rgba(var(--fg-rgb), 0.25)", borderRadius: 8, padding: "0.5rem 1rem", fontSize: 14, cursor: "pointer" }}
                >
                  ← Back to teams
                </button>
                <button
                  onClick={doRandomize}
                  style={{ background: "rgba(var(--fg-rgb), 0.1)", color: "var(--on-page)", border: "1px solid rgba(var(--fg-rgb), 0.25)", borderRadius: 8, padding: "0.5rem 1rem", fontSize: 14, cursor: "pointer" }}
                >
                  🎲 Re-shuffle
                </button>
                <span style={{ fontSize: 14, color: "rgba(var(--fg-rgb), 0.6)" }}>
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
                      background: dragOverGroup === g.name ? "var(--tint-alt)" : "var(--cream)",
                      color: "var(--ink)",
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

              <div style={{ background: "rgba(var(--fg-rgb), 0.06)", border: "1px solid rgba(var(--fg-rgb), 0.15)", borderRadius: 12, padding: "1.2rem", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <label htmlFor="matches-per-team" style={{ fontSize: 14, color: "rgba(var(--fg-rgb), 0.8)" }}>Matches per team</label>
                  <input
                    id="matches-per-team"
                    type="number"
                    min={1}
                    max={allowRepeatFixtures ? 60 : Math.max(1, maxWithoutRepeats)}
                    value={matchesPerTeam}
                    onChange={(e) => setMatchesPerTeam(Math.max(1, Number(e.target.value) || 1))}
                    style={{ width: 70, padding: "0.5rem", borderRadius: 6, border: "1.5px solid rgba(var(--fg-rgb), 0.3)", background: "rgba(var(--fg-rgb), 0.1)", color: "var(--on-page)", fontSize: 14, textAlign: "center" }}
                  />
                </div>

                <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 14, color: "rgba(var(--fg-rgb), 0.85)", cursor: "pointer", marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(var(--fg-rgb), 0.12)" }}>
                  <input
                    type="checkbox"
                    checked={allowRepeatFixtures}
                    onChange={(e) => setAllowRepeatFixtures(e.target.checked)}
                    style={{ marginTop: 2 }}
                  />
                  <span>
                    Let a team face the same opponent more than once
                    <span style={{ display: "block", fontSize: 12, color: "rgba(var(--fg-rgb), 0.7)", marginTop: 2 }}>
                      Off: each pair meets at most once, so a group of {smallestGroup || "n"} tops out at{" "}
                      {maxWithoutRepeats} match{maxWithoutRepeats === 1 ? "" : "es"} per team.
                      {" "}On: everyone plays everyone first, then the remaining matches are drawn against random opponents.
                    </span>
                  </span>
                </label>

                {scheduleHints.length > 0 && (
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                    {scheduleHints.map((hint, i) => (
                      <p key={i} style={{ fontSize: 12, color: hint.tone === "warn" ? theme.accent : "rgba(var(--fg-rgb), 0.65)", margin: 0 }}>
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
                style={{ background: "rgba(var(--fg-rgb), 0.1)", color: "var(--on-page)", border: "1px solid rgba(var(--fg-rgb), 0.25)", borderRadius: 8, padding: "0.5rem 1rem", fontSize: 14, cursor: "pointer", marginBottom: 16 }}
              >
                ← Back to groups
              </button>
              <button
                onClick={openHistory}
                style={{ background: "rgba(var(--fg-rgb), 0.1)", color: "var(--on-page)", border: "1px solid rgba(var(--fg-rgb), 0.25)", borderRadius: 8, padding: "0.5rem 1rem", fontSize: 14, cursor: "pointer", marginBottom: 16, marginLeft: 8 }}
              >
                🕐 View schedule history
              </button>

              {showHistory && (
                <div className="drop-in" style={{ background: "var(--cream)", color: "var(--ink)", borderRadius: 12, padding: "1.2rem", marginBottom: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h3 style={{ fontFamily: font.display, fontSize: 18, margin: 0 }}>Schedule history</h3>
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
                          background: h.isActive ? theme.tint : "var(--chip)",
                          border: h.isActive ? `1.5px solid ${theme.deep}` : "1.5px solid transparent",
                          padding: "0.7rem 0.9rem",
                          borderRadius: 8,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>
                            {new Date(h.createdAt).toLocaleString()}
                            {h.isActive && (
                              <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: "var(--success-ink)", background: "color-mix(in srgb, var(--success) 15%, transparent)", padding: "2px 8px", borderRadius: 6 }}>
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
                            style={{ background: theme.accent, color: theme.accentInk, border: "none", borderRadius: 6, padding: "0.4rem 0.8rem", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
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
                  <div key={g.groupName} style={{ background: "rgba(var(--fg-rgb), 0.08)", border: "1px solid rgba(var(--fg-rgb), 0.18)", borderRadius: 10, padding: "1rem", textAlign: "center" }}>
                    <div style={{ fontFamily: font.display, fontSize: 32, color: theme.accent }}>{g.fixtures.length}</div>
                    <div style={{ fontSize: 12, color: "rgba(var(--fg-rgb), 0.65)", letterSpacing: "0.06em" }}>Group {g.groupName}</div>
                  </div>
                ))}
                <div style={{ background: theme.accentSoft, border: `1px solid ${theme.accent}`, borderRadius: 10, padding: "1rem", textAlign: "center" }}>
                  <div style={{ fontFamily: font.display, fontSize: 32, color: theme.accent }}>{totalMatches}</div>
                  <div style={{ fontSize: 12, color: "rgba(var(--fg-rgb), 0.65)", letterSpacing: "0.06em" }}>Total matches</div>
                </div>
              </div>

              {scheduleWarnings.length > 0 && (
                <div style={{ background: theme.accentSoft, border: `1px solid ${theme.accent}`, borderRadius: 10, padding: "1rem", marginBottom: 24 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: theme.accent, margin: "0 0 8px" }}>How this schedule was built</p>
                  {scheduleWarnings.map((w, i) => (
                    <p key={i} style={{ fontSize: 12, color: "rgba(var(--fg-rgb), 0.85)", margin: "0 0 6px", lineHeight: 1.5 }}>• {w}</p>
                  ))}
                </div>
              )}

              {scheduleData.groups.map((g) => {
                const rounds = groupFixturesByRound(g.fixtures);
                const perTeam = g.matchesByTeam || {};
                return (
                  <div key={g.groupName} style={{ marginBottom: 28 }}>
                    <h3 style={{ fontFamily: font.display, fontSize: 22, marginBottom: 6 }}>Group {g.groupName} FIXTURES</h3>

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
                                  background: isShort ? "color-mix(in srgb, var(--fb-accent) 20%, transparent)" : "rgba(var(--fg-rgb), 0.1)",
                                  color: isShort ? theme.accent : "rgba(var(--fg-rgb), 0.75)",
                                  border: isShort ? "1px solid color-mix(in srgb, var(--fb-accent) 50%, transparent)" : "1px solid transparent",
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
                          <p style={{ fontFamily: "'Teko', sans-serif", fontSize: 14, letterSpacing: "0.12em", color: "rgba(var(--fg-rgb), 0.7)", margin: "0 0 6px", fontWeight: 600 }}>
                            MATCHDAY {roundNo}
                          </p>
                        )}
                        <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
                          {fixtures.map((f, i) => (
                            <div key={f.id} style={{ "--i": i, background: "var(--cream)", color: "var(--ink)", borderRadius: 8, padding: "0.7rem 0.9rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
                      background: "color-mix(in srgb, var(--success) 15%, transparent)",
                      border: "1px solid var(--success)",
                      color: "var(--on-page)",
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
                    style={{ width: "100%", marginTop: 12, background: "rgba(var(--fg-rgb), 0.1)", color: "var(--on-page)", border: "1px solid rgba(var(--fg-rgb), 0.25)", borderRadius: 10, padding: "0.9rem", fontWeight: 400, fontSize: 16, cursor: "pointer", fontFamily: font.display, letterSpacing: "0.03em" }}
                  >
                    🏟️ GO TO MATCHES →
                  </button>
                </>
              ) : (
                <>
                <div style={{ background: theme.cream, color: theme.ink, borderRadius: 12, padding: "1rem 1.2rem", marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>When is it played?</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {[["schedule-start", "Starts", scheduleStart, "start"], ["schedule-end", "Ends", scheduleEnd, "end"]].map(([id, label, value, key]) => (
                      <label key={id} htmlFor={id} style={{ flex: "1 1 150px", fontSize: 13, fontWeight: 600, color: theme.muted }}>
                        {label}
                        <input
                          id={id}
                          type="date"
                          value={value}
                          onChange={(e) => setDateDraft((d) => ({ ...d, [key]: e.target.value }))}
                          disabled={approving}
                          style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 4, padding: "0.55rem 0.7rem", borderRadius: 8, border: "1.5px solid var(--line)", fontSize: 14 }}
                        />
                      </label>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: theme.muted, margin: "8px 0 0" }}>
                    It completes by itself the day after it ends, if you haven't marked it complete.
                  </p>
                </div>
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  style={{
                    width: "100%",
                    background: theme.successSolid,
                    color: "var(--on-page)",
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
                </>
              )}
            </div>
          )}

          {stage === "matches" && (
            <>
              {closed && (
                <div style={{ background: "rgba(var(--fg-rgb), 0.08)", border: "1px solid rgba(var(--fg-rgb), 0.25)", borderRadius: 10, padding: "0.8rem 1rem", marginBottom: 16, fontSize: 14 }}>
                  {tournamentInfo.status === "Completed"
                    ? "This tournament is completed. Its results and stats stay here; nothing more can be played or changed."
                    : "This tournament was cancelled: it never started and its dates have passed."}
                </div>
              )}
              {/* Asked once, when the last match finishes. */}
              {access.allMatchesPlayed && access.canComplete && !completePromptDismissed && (
                <div className="drop-in" role="status" style={{ background: "color-mix(in srgb, var(--fb-accent) 15%, transparent)", border: "1px solid var(--fb-accent)", borderRadius: 10, padding: "0.8rem 1rem", marginBottom: 16, fontSize: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ flex: "1 1 220px" }}>All matches played. Mark the tournament complete?</span>
                  <button onClick={markComplete} style={{ minHeight: 44, background: theme.accent, color: theme.accentInk, border: "none", borderRadius: 8, padding: "0.5rem 1rem", fontWeight: 700, cursor: "pointer" }}>
                    Mark complete
                  </button>
                  <button onClick={() => setCompletePromptDismissed(true)} style={{ minHeight: 44, background: "transparent", color: "var(--on-page)", border: "1px solid rgba(var(--fg-rgb), 0.35)", borderRadius: 8, padding: "0.5rem 1rem", cursor: "pointer" }}>
                    Not yet
                  </button>
                </div>
              )}
              {(!tournamentStarted || matchesTab === "matches") && (
                <div className="view-in">
                <MatchList
                  tournamentId={tournamentId}
                  matches={matches}
                  loading={loadingMatches}
                  tournamentStarted={tournamentStarted}
                  starting={startingTournament}
                  onStartTournament={handleStartTournament}
                  onStartMatch={openMatchSetup}
                  onEnterMatch={openLiveMatch}
                  onWatchMatch={openWatch}
                  onOpenKnockouts={openKnockouts}
                  canScore={!!access.canScore}
                  onBack={tournamentStarted ? null : () => setStage("schedule")}
                  sport={sport}
                />
                </div>
              )}

              {/* Table · Summary · Stats: one stats page, three views (as the phone hub's tabs). */}
              {tournamentStarted && matchesTab !== "matches" && (
                <div className="view-in" key={matchesTab}>
                {isCricket ? (
                  <CricketStats tournamentId={tournamentId} view={matchesTab} refreshKey={statsRefreshKey} onOpenPlayer={(playerId) => openProfile({ playerId })} />
                ) : (
                  <TournamentStats tournamentId={tournamentId} view={matchesTab} refreshKey={statsRefreshKey} onOpenPlayer={(playerId) => openProfile({ playerId })} />
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
                onWatch={() => openWatch(liveMatchId)}
              />
            ) : (
              <LiveMatch
                matchId={liveMatchId}
                onBack={closeLiveMatch}
                onCompleted={closeLiveMatch}
                onWatch={() => openWatch(liveMatchId)}
              />
            )}
            </div>
          )}

          {stage === "watchMatch" && watchMatchId && (
            <div className="view-in">
              <MatchWatch
                key={watchMatchId}
                sport={sport}
                matchId={watchMatchId}
                canScore={!!access.canScore}
                onBack={closeWatch}
                onOpenScoring={() => {
                  const id = watchMatchId;
                  setWatchMatchId(null);
                  openLiveMatch(id);
                }}
                onOpenPlayer={(playerId) => openProfile({ playerId })}
              />
            </div>
          )}
        </main>
      )}
    </div>
  );
}