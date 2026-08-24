const BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function handleResponse(res) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export async function randomizeGroups(teamNames, groupCount) {
  const res = await fetch(`${BASE_URL}/tournament/groups/randomize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamNames, groupCount }),
  });
  return handleResponse(res);
}

export async function setManualGroups(groups) {
  const res = await fetch(`${BASE_URL}/tournament/groups/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groups }),
  });
  return handleResponse(res);
}

export async function generateSchedule(groups, matchesPerTeam) {
  const res = await fetch(`${BASE_URL}/tournament/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groups, matchesPerTeam }),
  });
  return handleResponse(res);
}

export async function approveSchedule(tournamentId, scheduleData) {
  const res = await fetch(`${BASE_URL}/tournament/schedule/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tournamentId, schedule: scheduleData }),
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