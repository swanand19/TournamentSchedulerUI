import { api, ApiError } from "./client";

// Tournaments, their schedules and stats. Every call goes through the secure gateway (see client.js).

// Omitting `sport` returns every tournament; the home page always passes one so each tab
// only ever lists its own.
export const getTournaments = (sport) => api.call("TOURNAMENT_LIST", { query: { sport } });

export const createTournament = (name, sport = "Football") => api.call("TOURNAMENT_CREATE", { body: { name, sport } });

/** The active schedule, or null when none has been approved yet (the API answers 404). */
export async function getTournamentSchedule(id) {
  try {
    return await api.call("SCHEDULE_ACTIVE", { routeParams: { id } });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export const deleteTournament = (id) => api.call("TOURNAMENT_DELETE", { routeParams: { id } });

export const getScheduleHistory = (tournamentId) => api.call("SCHEDULE_HISTORY", { routeParams: { id: tournamentId } });

export const activateSchedule = (tournamentId, scheduleId) =>
  api.call("SCHEDULE_ACTIVATE", { routeParams: { id: tournamentId, scheduleId } });

export const getTournament = (id) => api.call("TOURNAMENT_GET", { routeParams: { id } });

export const startTournament = (id) => api.call("TOURNAMENT_START", { routeParams: { id } });

// Every leaderboard for a tournament, plus the standings and an overall summary.
export const getTournamentStats = (id) => api.call("TOURNAMENT_STATS", { routeParams: { id } });

// Cricket: points table with NRR, leaderboards, MVP and records, folded from the ball-by-ball.
export const getCricketStats = (id) => api.call("TOURNAMENT_CRICKET_STATS", { routeParams: { id } });
