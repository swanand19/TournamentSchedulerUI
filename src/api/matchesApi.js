const BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function handleResponse(res) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with status ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function getMatches(tournamentId) {
  const res = await fetch(`${BASE_URL}/tournaments/${tournamentId}/matches`);
  return handleResponse(res);
}

export async function getMatch(matchId) {
  const res = await fetch(`${BASE_URL}/matches/${matchId}`);
  return handleResponse(res);
}

export async function setupAndStartMatch(matchId, payload) {
  const res = await fetch(`${BASE_URL}/matches/${matchId}/setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function getMatchEvents(matchId) {
  const res = await fetch(`${BASE_URL}/matches/${matchId}/events`);
  return handleResponse(res);
}

export async function recordEvent(matchId, payload) {
  const res = await fetch(`${BASE_URL}/matches/${matchId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function pauseClock(matchId) {
  const res = await fetch(`${BASE_URL}/matches/${matchId}/clock/pause`, { method: "POST" });
  return handleResponse(res);
}

export async function resumeClock(matchId) {
  const res = await fetch(`${BASE_URL}/matches/${matchId}/clock/resume`, { method: "POST" });
  return handleResponse(res);
}

export async function tickClock(matchId) {
  const res = await fetch(`${BASE_URL}/matches/${matchId}/clock/tick`, { method: "POST" });
  return handleResponse(res);
}

export async function addTime(matchId, minutes) {
  const res = await fetch(`${BASE_URL}/matches/${matchId}/clock/add-time`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ minutes }),
  });
  return handleResponse(res);
}

export async function nextHalf(matchId) {
  const res = await fetch(`${BASE_URL}/matches/${matchId}/half/next`, { method: "POST" });
  return handleResponse(res);
}

export async function completeMatch(matchId) {
  const res = await fetch(`${BASE_URL}/matches/${matchId}/complete`, { method: "POST" });
  return handleResponse(res);
}

export async function startPenalties(matchId, takersPerSide) {
  const res = await fetch(`${BASE_URL}/matches/${matchId}/penalties/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ takersPerSide }),
  });
  return handleResponse(res);
}

export async function getPenalties(matchId) {
  const res = await fetch(`${BASE_URL}/matches/${matchId}/penalties`);
  return handleResponse(res);
}

export async function recordPenaltyKick(matchId, payload) {
  const res = await fetch(`${BASE_URL}/matches/${matchId}/penalties/kick`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function endPenaltiesManually(matchId, winningTeamId) {
  const res = await fetch(`${BASE_URL}/matches/${matchId}/penalties/end`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ winningTeamId }),
  });
  return handleResponse(res);
}