import { api } from "./client";

// Live updates: a one-minute ticket that opens the live line, and what the line hears about.
// realtime/live.js is the only caller.

export const getLiveTicket = () => api.call("LIVE_TICKET");

export const watchTournament = (connectionId, id) =>
  api.call("LIVE_WATCH_TOURNAMENT", { routeParams: { connectionId, id } });

export const watchMatch = (connectionId, sport, matchId) =>
  api.call("LIVE_WATCH_MATCH", { routeParams: { connectionId, sport, matchId } });

export const unwatch = (connectionId, { tournamentId, sport, matchId }) =>
  api.call("LIVE_UNWATCH", { routeParams: { connectionId }, body: { tournamentId, sport, matchId } });
