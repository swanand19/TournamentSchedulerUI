import { api } from "./client";

// Leagues and seasons (2026-11-24): a league groups tournaments run again and again, each a season. A season starts with
// TOURNAMENT_CREATE { leagueId } (createTournament's last argument). Every change answers the whole league.

export const listMyLeagues = (sport) => api.call("LEAGUE_LIST", { query: { sport } });
export const leagueCandidates = (sport) => api.call("LEAGUE_CANDIDATES", { query: { sport } });
export const createLeague = (body) => api.call("LEAGUE_CREATE", { body });
export const getLeague = (leagueId) => api.call("LEAGUE_GET", { routeParams: { leagueId } });
export const updateLeague = (leagueId, body) => api.call("LEAGUE_UPDATE", { routeParams: { leagueId }, body });
export const deleteLeague = (leagueId) => api.call("LEAGUE_DELETE", { routeParams: { leagueId } });
export const setLeagueLogo = (leagueId, image) => api.call("LEAGUE_LOGO_SET", { routeParams: { leagueId }, body: { image } });
export const removeLeagueLogo = (leagueId) => api.call("LEAGUE_LOGO_REMOVE", { routeParams: { leagueId } });
export const addLeagueOrganiser = (leagueId, contact) => api.call("LEAGUE_ORGANISER_ADD", { routeParams: { leagueId }, body: { contact } });
export const removeLeagueOrganiser = (leagueId, userId) => api.call("LEAGUE_ORGANISER_REMOVE", { routeParams: { leagueId, userId } });
export const addLeagueSeason = (leagueId, tournamentId) => api.call("LEAGUE_SEASON_ADD", { routeParams: { leagueId }, body: { tournamentId } });
export const removeLeagueSeason = (leagueId, tournamentId) => api.call("LEAGUE_SEASON_REMOVE", { routeParams: { leagueId, tournamentId } });
export const getLeagueStats = (leagueId, season) => api.call("LEAGUE_STATS", { routeParams: { leagueId }, query: season == null ? {} : { season } });
export const getLeagueTeams = (leagueId) => api.call("LEAGUE_TEAMS", { routeParams: { leagueId } });
export const bringBackOptions = (tournamentId) => api.call("LEAGUE_BRING_BACK_OPTIONS", { routeParams: { id: tournamentId } });
export const bringBackTeams = (tournamentId, teamIds) => api.call("LEAGUE_BRING_BACK", { routeParams: { id: tournamentId }, body: { teamIds } });

// The signed-out pages at /leagues/<code>: names and results only.
export const getPublicLeague = (code) => api.call("PUBLIC_LEAGUE", { routeParams: { code } });
export const getPublicLeagueStats = (code, season) => api.call("PUBLIC_LEAGUE_STATS", { routeParams: { code }, query: season == null ? {} : { season } });
export const getPublicLeagueTeams = (code) => api.call("PUBLIC_LEAGUE_TEAMS", { routeParams: { code } });

/** What the league page reads, signed in (by id) or not (by its link's code). */
export const leagueSource = (leagueId) => ({ get: () => getLeague(leagueId), stats: (season) => getLeagueStats(leagueId, season), teams: () => getLeagueTeams(leagueId) });
export const publicLeagueSource = (code) => ({ get: () => getPublicLeague(code), stats: (season) => getPublicLeagueStats(code, season), teams: () => getPublicLeagueTeams(code), isPublic: true });
