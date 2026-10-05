import { api, ApiError } from "./client";

// Tournaments, their schedules and stats. Every call goes through the secure gateway (see client.js).

// Only the signed-in person's tournaments (created, owned or scored), each with `myRoles` and
// `status`. Omitting `sport` returns both sports; the home page passes one per tab.
export const getTournaments = (sport) => api.call("TOURNAMENT_LIST", { query: { sport } });

/** Dates ("YYYY-MM-DD") are optional here — they usually come with the schedule's approval. */
export const createTournament = (name, sport, startDate, endDate) =>
  api.call("TOURNAMENT_CREATE", { body: { name, sport, startDate, endDate } });

export const updateTournament = (id, { name, startDate, endDate }) =>
  api.call("TOURNAMENT_UPDATE", { routeParams: { id }, body: { name, startDate, endDate } });

/** Owners only; refused while a match is being played. */
export const completeTournament = (id) => api.call("TOURNAMENT_COMPLETE", { routeParams: { id }, body: {} });

// Owners and scorers. `role` is "Owner" or "Scorer"; adding someone already in changes their role.
export const getMembers = (id) => api.call("TOURNAMENT_MEMBER_LIST", { routeParams: { id } });
export const addMember = (id, email, role) => api.call("TOURNAMENT_MEMBER_ADD", { routeParams: { id }, body: { email, role } });
export const removeMember = (id, userId) => api.call("TOURNAMENT_MEMBER_REMOVE", { routeParams: { id, userId } });
export const leaveTournament = (id) => api.call("TOURNAMENT_LEAVE", { routeParams: { id }, body: {} });

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
