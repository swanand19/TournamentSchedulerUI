import { api } from "./client";

// Handing a match's scoring between people — the same three calls for both sports. `sport` is
// "football" or "cricket". Each answers with the match's `scoring` block (who is scoring, what
// you may do about it), the same block every match answer carries.

const at = (sport, matchId) => ({ sport: sport.toLowerCase(), matchId });

export const requestScoring = (sport, matchId) => api.call("SCORING_REQUEST", { routeParams: at(sport, matchId), body: {} });
export const respondToScoring = (sport, matchId, allow) => api.call("SCORING_RESPOND", { routeParams: at(sport, matchId), body: { allow } });
export const takeOverScoring = (sport, matchId) => api.call("SCORING_TAKE_OVER", { routeParams: at(sport, matchId), body: {} });
