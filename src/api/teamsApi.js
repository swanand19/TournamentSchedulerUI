import { api } from "./client";

// Teams and players. Every call goes through the secure gateway (see client.js).

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
