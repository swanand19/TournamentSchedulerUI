import { api } from "./client";

// Groups and schedule generation. Every call goes through the secure gateway (see client.js).

export const randomizeGroups = (teamNames, groupCount) =>
  api.call("TOURNAMENT_GROUPS_RANDOMIZE", { body: { teamNames, groupCount } });

export const setManualGroups = (groups) => api.call("TOURNAMENT_GROUPS_MANUAL", { body: { groups } });

export const generateSchedule = (groups, matchesPerTeam, allowRepeatFixtures = false) =>
  api.call("TOURNAMENT_SCHEDULE_GENERATE", { body: { groups, matchesPerTeam, allowRepeatFixtures } });

/** The tournament's dates ("YYYY-MM-DD") are settled with its fixtures; required unless it already has them. */
export const approveSchedule = (tournamentId, scheduleData, { startDate, endDate } = {}) =>
  api.call("TOURNAMENT_SCHEDULE_APPROVE", { body: { tournamentId, schedule: scheduleData, startDate, endDate } });

export const getTournament = (id) => api.call("TOURNAMENT_GET", { routeParams: { id } });

export const startTournament = (id) => api.call("TOURNAMENT_START", { routeParams: { id } });
