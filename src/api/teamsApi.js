import { api } from "./client";

// Teams and players. Every call goes through the secure gateway (see client.js).
//
// A player may carry `email`: with an account it links the place to that person now, otherwise when
// they sign up. On an update, leaving `email` out keeps it; "" clears it (and unlinks). Owners see
// players' `email` and each team's `joinCode`; a linked player (`isLinked`) keeps their own name and
// cricket profile, so the server ignores those fields for them.

export const getTeams = (tournamentId) => api.call("TEAM_LIST", { routeParams: { id: tournamentId } });

export const createTeam = (tournamentId, name) => api.call("TEAM_CREATE", { routeParams: { id: tournamentId }, body: { name } });

/**
 * Renames a team, and optionally sets its default captain. `setCaptain` is what distinguishes
 * "clear the captain" from "this caller does not deal in captains" — both send null otherwise.
 */
export function updateTeam(tournamentId, teamId, name, options = {}) {
  const body = { name };
  if ("defaultCaptainPlayerId" in options) {
    body.setCaptain = true;
    body.defaultCaptainPlayerId = options.defaultCaptainPlayerId ?? null;
  }
  return api.call("TEAM_UPDATE", { routeParams: { id: tournamentId, teamId }, body });
}

export const deleteTeam = (tournamentId, teamId) => api.call("TEAM_DELETE", { routeParams: { id: tournamentId, teamId } });

export const addPlayer = (tournamentId, teamId, player) =>
  api.call("PLAYER_CREATE", { routeParams: { id: tournamentId, teamId }, body: player });

export const updatePlayer = (tournamentId, teamId, playerId, player) =>
  api.call("PLAYER_UPDATE", { routeParams: { id: tournamentId, teamId, playerId }, body: player });

export const deletePlayer = (tournamentId, teamId, playerId) =>
  api.call("PLAYER_DELETE", { routeParams: { id: tournamentId, teamId, playerId } });

/** Owners only: a new join code for the team; the old one stops working at once. Answers with the team. */
export const resetJoinCode = (tournamentId, teamId) =>
  api.call("TEAM_JOIN_CODE_RESET", { routeParams: { id: tournamentId, teamId }, body: {} });

/** Takes a squad place off its account (the name stays). Owners for anyone; a player for their own place ("Leave team"). */
export const unlinkPlayer = (tournamentId, teamId, playerId) =>
  api.call("PLAYER_UNLINK", { routeParams: { id: tournamentId, teamId, playerId }, body: {} });

/** What a team code opens: { tournamentId, tournamentName, sport, teamId, teamName, places: [{ playerId, name, detail }] }. */
export const previewJoin = (code) => api.call("TEAM_JOIN_PREVIEW", { body: { code } });

/** Claims a place (`playerId`), or joins as a new player (null). Answers { tournamentId, sport, teamId, playerId, … }. */
export const joinTeam = (code, playerId) => api.call("TEAM_JOIN", { body: { code, playerId: playerId ?? null } });
