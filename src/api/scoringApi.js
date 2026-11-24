import { api } from "./client";

// Handing a match's scoring between people — the same three calls for both sports. `sport` is
// "football" or "cricket". Each answers with the match's `scoring` block (who is scoring, what
// you may do about it), the same block every match answer carries.

const at = (sport, matchId) => ({ sport: sport.toLowerCase(), matchId });

// Opening a scoring screen (setup or live) claims the match when nobody is scoring it (2026-11-20): the
// first person in gets the buttons, anyone after sees who has it. A match someone else holds is left
// alone — no request is sent just by opening. Called before the screen's first read; errors are
// swallowed (a closed tournament, no network), since that read shows how things stand.
export const claimScoring = (sport, matchId) =>
  api.call("SCORING_CLAIM", { routeParams: at(sport, matchId), body: {} }).catch(() => null);

export const requestScoring = (sport, matchId) => api.call("SCORING_REQUEST", { routeParams: at(sport, matchId), body: {} });
export const respondToScoring = (sport, matchId, allow) => api.call("SCORING_RESPOND", { routeParams: at(sport, matchId), body: { allow } });
export const takeOverScoring = (sport, matchId) => api.call("SCORING_TAKE_OVER", { routeParams: at(sport, matchId), body: {} });
