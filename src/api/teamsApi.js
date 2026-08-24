const BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function handleResponse(res) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with status ${res.status}`);
  }
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

export async function updateTeam(tournamentId, teamId, name) {
  const res = await fetch(`${BASE_URL}/tournaments/${tournamentId}/teams/${teamId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
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