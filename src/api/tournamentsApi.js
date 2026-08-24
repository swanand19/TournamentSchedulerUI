const BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function handleResponse(res) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with status ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function getTournaments() {
  const res = await fetch(`${BASE_URL}/tournaments`);
  return handleResponse(res);
}

export async function createTournament(name) {
  const res = await fetch(`${BASE_URL}/tournaments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return handleResponse(res);
}

export async function getTournamentSchedule(id) {
  const res = await fetch(`${BASE_URL}/tournaments/${id}/schedule`);
  if (res.status === 404) return null;
  return handleResponse(res);
}

export async function deleteTournament(id) {
  const res = await fetch(`${BASE_URL}/tournaments/${id}`, { method: "DELETE" });
  return handleResponse(res);
}

export async function getScheduleHistory(tournamentId) {
  const res = await fetch(`${BASE_URL}/tournaments/${tournamentId}/schedules`);
  return handleResponse(res);
}

export async function activateSchedule(tournamentId, scheduleId) {
  const res = await fetch(`${BASE_URL}/tournaments/${tournamentId}/schedules/${scheduleId}/activate`, {
    method: "POST",
  });
  return handleResponse(res);
}

export async function getTournament(id) {
  const res = await fetch(`${BASE_URL}/tournaments/${id}`);
  return handleResponse(res);
}

export async function startTournament(id) {
  const res = await fetch(`${BASE_URL}/tournaments/${id}/start`, { method: "POST" });
  return handleResponse(res);
}