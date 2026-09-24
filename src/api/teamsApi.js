import { responseError } from "./errors";
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function handleResponse(res) {
  if (!res.ok) throw await responseError(res);
  if (res.status === 204) return null;
  return res.json();
}

export async function getTeams(tournamentId) {
  const res = await fetch(`${BASE_URL}/tournaments/${tournamentId}/teams`);
  return handleResponse(res);
}

export async function createTeam(tournamentId, name) {
  const res = await fetch(`${BASE_URL}/tournaments/${tournamentId}/teams`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return handleResponse(res);
}

/**
 * Renames a team, and optionally sets its default captain. `setCaptain` is what distinguishes
 * "clear the captain" from "this caller does not deal in captains" — both send null otherwise.
 */
export async function updateTeam(tournamentId, teamId, name, options = {}) {
  const body = { name };
  if ("defaultCaptainPlayerId" in options) {
    body.setCaptain = true;
    body.defaultCaptainPlayerId = options.defaultCaptainPlayerId ?? null;
  }
  const res = await fetch(`${BASE_URL}/tournaments/${tournamentId}/teams/${teamId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function deleteTeam(tournamentId, teamId) {
  const res = await fetch(`${BASE_URL}/tournaments/${tournamentId}/teams/${teamId}`, { method: "DELETE" });
  return handleResponse(res);
}

export async function addPlayer(tournamentId, teamId, player) {
  const res = await fetch(`${BASE_URL}/tournaments/${tournamentId}/teams/${teamId}/players`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(player),
  });
  return handleResponse(res);
}

export async function updatePlayer(tournamentId, teamId, playerId, player) {
  const res = await fetch(`${BASE_URL}/tournaments/${tournamentId}/teams/${teamId}/players/${playerId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(player),
  });
  return handleResponse(res);
}

export async function deletePlayer(tournamentId, teamId, playerId) {
  const res = await fetch(`${BASE_URL}/tournaments/${tournamentId}/teams/${teamId}/players/${playerId}`, {
    method: "DELETE",
  });
  return handleResponse(res);
}