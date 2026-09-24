import { responseError } from "./errors";
// The cricket scoring endpoints. Every action but the two GETs answers with the whole match state
// — score, crease, and what is legal next — so a screen redraws from the response it already has
// rather than refetching after each ball.

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function handleResponse(res) {
  if (!res.ok) throw await responseError(res);
  if (res.status === 204) return null;
  return res.json();
}

const post = async (path, body) =>
  handleResponse(
    await fetch(`${BASE_URL}/cricket-matches/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  );

const get = async (path) => handleResponse(await fetch(`${BASE_URL}/cricket-matches/${path}`));

export const getCricketMatch = (matchId) => get(`${matchId}`);
export const getSetupOptions = (matchId) => get(`${matchId}/setup-options`);
export const getCricketScorecard = (matchId) => get(`${matchId}/scorecard`);
export const getCricketBalls = (matchId) => get(`${matchId}/balls`);
export const getCricketEvents = (matchId) => get(`${matchId}/events`);

export const setupCricketMatch = (matchId, payload) => post(`${matchId}/setup`, payload);
export const startInnings = (matchId, payload) => post(`${matchId}/innings/start`, payload);
export const recordBall = (matchId, payload) => post(`${matchId}/balls`, payload);
export const undoBall = (matchId) => post(`${matchId}/balls/undo`, {});
export const setBatter = (matchId, playerId) => post(`${matchId}/batter`, { playerId });
export const setBowler = (matchId, playerId) => post(`${matchId}/bowler`, { playerId });
export const endInnings = (matchId, reason) => post(`${matchId}/innings/end`, { reason });
// Rain: take overs off the innings in play. Under DLS the chase target is revised on the spot.
export const reduceOvers = (matchId, newOversLimit) => post(`${matchId}/innings/reduce-overs`, { newOversLimit });
export const enforceFollowOn = (matchId) => post(`${matchId}/follow-on`, {});
export const startSuperOver = (matchId) => post(`${matchId}/super-over/start`, {});
export const completeCricketMatch = (matchId, options = {}) =>
  post(`${matchId}/complete`, {
    force: options.force ?? false,
    awardWinnerTeamId: options.awardWinnerTeamId ?? null,
    noResult: options.noResult ?? false,
  });
