import { responseError } from "./errors";
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function handleResponse(res) {
  if (!res.ok) throw await responseError(res);
  if (res.status === 204) return null;
  return res.json();
}

// Omitting `sport` returns every tournament; the home page always passes one so each tab
// only ever lists its own.
export async function getTournaments(sport) {
  const query = sport ? `?sport=${encodeURIComponent(sport)}` : "";
  const res = await fetch(`${BASE_URL}/tournaments${query}`);
  return handleResponse(res);
}

export async function createTournament(name, sport = "Football") {
  const res = await fetch(`${BASE_URL}/tournaments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, sport }),
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

// Every leaderboard for a tournament, plus the standings and an overall summary.
export async function getTournamentStats(id) {
  const res = await fetch(`${BASE_URL}/tournaments/${id}/stats`);
  return handleResponse(res);
}

// Cricket: points table with NRR, leaderboards, MVP and records, folded from the ball-by-ball.
export async function getCricketStats(id) {
  const res = await fetch(`${BASE_URL}/tournaments/${id}/cricket-stats`);
  return handleResponse(res);
}
