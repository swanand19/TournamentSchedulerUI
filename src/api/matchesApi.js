import { api } from "./client";

// Football matches. Every call goes through the secure gateway (see client.js).

export const getMatches = (tournamentId) => api.call("TOURNAMENT_MATCHES", { routeParams: { id: tournamentId } });

export const getMatch = (matchId) => api.call("MATCH_GET", { routeParams: { matchId } });

export const setupAndStartMatch = (matchId, payload) => api.call("MATCH_SETUP", { routeParams: { matchId }, body: payload });

export const getMatchEvents = (matchId) => api.call("MATCH_EVENTS", { routeParams: { matchId } });

export const recordEvent = (matchId, payload) => api.call("MATCH_EVENT_RECORD", { routeParams: { matchId }, body: payload });

export const pauseClock = (matchId) => api.call("MATCH_CLOCK_PAUSE", { routeParams: { matchId } });

export const resumeClock = (matchId) => api.call("MATCH_CLOCK_RESUME", { routeParams: { matchId } });

export const addTime = (matchId, minutes) => api.call("MATCH_CLOCK_ADD_TIME", { routeParams: { matchId }, body: { minutes } });

// Blows the whistle on the current period. Separate from starting the next one, so half time
// and full time stay distinguishable.
export const endPeriod = (matchId) => api.call("MATCH_PERIOD_END", { routeParams: { matchId } });

export const nextHalf = (matchId) => api.call("MATCH_PERIOD_NEXT", { routeParams: { matchId } });

export const completeMatch = (matchId, options = {}) =>
  api.call("MATCH_COMPLETE", {
    routeParams: { matchId },
    body: {
      force: options.force ?? false,
      awardWinnerTeamId: options.awardWinnerTeamId ?? null,
    },
  });

export const startPenalties = (matchId, takersPerSide) =>
  api.call("MATCH_PENALTIES_START", { routeParams: { matchId }, body: { takersPerSide } });

export const getPenalties = (matchId) => api.call("MATCH_PENALTIES_GET", { routeParams: { matchId } });

export const recordPenaltyKick = (matchId, payload) => api.call("MATCH_PENALTY_KICK", { routeParams: { matchId }, body: payload });

export const endPenaltiesManually = (matchId, winningTeamId) =>
  api.call("MATCH_PENALTIES_END", { routeParams: { matchId }, body: { winningTeamId } });
