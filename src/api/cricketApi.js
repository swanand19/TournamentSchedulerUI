import { api } from "./client";

// The cricket scoring endpoints. Every action but the GETs answers with the whole match state —
// score, crease, and what is legal next — so a screen redraws from the response it already has
// rather than refetching after each ball. Every call goes through the secure gateway (see client.js).

const at = (matchId) => ({ matchId });

export const getCricketMatch = (matchId) => api.call("CRICKET_MATCH_GET", { routeParams: at(matchId) });
export const getSetupOptions = (matchId) => api.call("CRICKET_SETUP_OPTIONS", { routeParams: at(matchId) });
export const getCricketScorecard = (matchId) => api.call("CRICKET_SCORECARD", { routeParams: at(matchId) });
export const getCricketBalls = (matchId) => api.call("CRICKET_BALLS", { routeParams: at(matchId) });
export const getCricketEvents = (matchId) => api.call("CRICKET_EVENTS", { routeParams: at(matchId) });

export const setupCricketMatch = (matchId, payload) => api.call("CRICKET_SETUP", { routeParams: at(matchId), body: payload });
export const startInnings = (matchId, payload) => api.call("CRICKET_INNINGS_START", { routeParams: at(matchId), body: payload });
export const recordBall = (matchId, payload) => api.call("CRICKET_BALL_RECORD", { routeParams: at(matchId), body: payload });
export const undoBall = (matchId) => api.call("CRICKET_BALL_UNDO", { routeParams: at(matchId), body: {} });
// onStrike: whether the new batter faces the next ball; undefined leaves it to the engine.
export const setBatter = (matchId, playerId, onStrike) =>
  api.call("CRICKET_BATTER_SET", { routeParams: at(matchId), body: { playerId, onStrike } });
export const setBowler = (matchId, playerId) => api.call("CRICKET_BOWLER_SET", { routeParams: at(matchId), body: { playerId } });
export const endInnings = (matchId, reason) => api.call("CRICKET_INNINGS_END", { routeParams: at(matchId), body: { reason } });
// Rain: take overs off the innings in play. Under DLS the chase target is revised on the spot.
export const reduceOvers = (matchId, newOversLimit) =>
  api.call("CRICKET_REDUCE_OVERS", { routeParams: at(matchId), body: { newOversLimit } });
export const enforceFollowOn = (matchId) => api.call("CRICKET_FOLLOW_ON", { routeParams: at(matchId), body: {} });
export const startSuperOver = (matchId) => api.call("CRICKET_SUPER_OVER_START", { routeParams: at(matchId), body: {} });
export const completeCricketMatch = (matchId, options = {}) =>
  api.call("CRICKET_COMPLETE", {
    routeParams: at(matchId),
    body: {
      force: options.force ?? false,
      awardWinnerTeamId: options.awardWinnerTeamId ?? null,
      noResult: options.noResult ?? false,
    },
  });
