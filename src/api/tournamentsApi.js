import { api, ApiError } from "./client";

// Tournaments, their schedules and stats. Every call goes through the secure gateway (see client.js).

// Only the signed-in person's tournaments (created, owned or scored), each with `myRoles` and
// `status`. Omitting `sport` returns both sports; the home page passes one per tab.
export const getTournaments = (sport) => api.call("TOURNAMENT_LIST", { query: { sport } });

/** Dates ("YYYY-MM-DD") are optional here — they usually come with the schedule's approval. */
/** leagueId: the league it starts the next season of ("Start Season 4", or chosen on Home). */
export const createTournament = (name, sport, startDate, endDate, leagueId = null) =>
  api.call("TOURNAMENT_CREATE", { body: { name, sport, startDate, endDate, leagueId } });

export const updateTournament = (id, { name, startDate, endDate }) =>
  api.call("TOURNAMENT_UPDATE", { routeParams: { id }, body: { name, startDate, endDate } });

/** Owners only; refused while a match is being played. */
export const completeTournament = (id) => api.call("TOURNAMENT_COMPLETE", { routeParams: { id }, body: {} });

// Owners and scorers. `role` is "Owner" or "Scorer"; adding someone already in changes their role,
// and adding an email or number with no account invites them. Each answers { members, invites,
// notice } (invites for owners only; notice says what just happened).
export const getMembers = (id) => api.call("TOURNAMENT_MEMBER_LIST", { routeParams: { id } });
export const addMember = (id, contact, role) => api.call("TOURNAMENT_MEMBER_ADD", { routeParams: { id }, body: { contact, role } });
export const removeMember = (id, userId) => api.call("TOURNAMENT_MEMBER_REMOVE", { routeParams: { id, userId } });
export const resendInvite = (id, inviteId) => api.call("TOURNAMENT_INVITE_RESEND", { routeParams: { id, inviteId }, body: {} });
export const cancelInvite = (id, inviteId) => api.call("TOURNAMENT_INVITE_CANCEL", { routeParams: { id, inviteId } });
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

// One player's innings and spells, or goals and assists, under their leaderboard row.
export const getPlayerLines = (id, playerId) => api.call("TOURNAMENT_PLAYER_LINES", { routeParams: { id, playerId } });
