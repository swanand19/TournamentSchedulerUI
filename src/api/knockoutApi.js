import { api } from "./client";

// The knockout stage (2026-10-21). Every change answers with the whole stage:
// { fixtures: [{ id, order, round, label, home, away, matchId, matchNumber, status, resultLine, winnerTeamId, canChange }],
//   groups: [{ groupName, teams, finished }], started, championTeamId, championName }
// where each side is { teamId, teamName, source, slot: { kind, teamId, groupName, place, fromOrder }, setByOwner }.

const at = (tournamentId) => ({ id: tournamentId });

export const getKnockout = (tournamentId) => api.call("KNOCKOUT_GET", { routeParams: at(tournamentId) });

/** Owners: the formats that fit the groups, previewed ([{ id, name, description, offersThirdPlace, fixtures }]). */
export const getKnockoutPresets = (tournamentId) => api.call("KNOCKOUT_PRESETS", { routeParams: at(tournamentId) });

/** Replaces the knockout stage with a preset's. Dates only for a knockout-only tournament that has none. */
export const applyKnockoutPreset = (tournamentId, { preset, thirdPlace, startDate, endDate }) =>
  api.call("KNOCKOUT_APPLY", { routeParams: at(tournamentId), body: { preset, thirdPlace, startDate, endDate } });

export const clearKnockout = (tournamentId) => api.call("KNOCKOUT_CLEAR", { routeParams: at(tournamentId) });

/** `fixture` = { round, label, home: slot, away: slot }. */
export const addKnockoutMatch = (tournamentId, fixture) =>
  api.call("KNOCKOUT_FIXTURE_ADD", { routeParams: at(tournamentId), body: fixture });

export const updateKnockoutMatch = (tournamentId, fixtureId, fixture) =>
  api.call("KNOCKOUT_FIXTURE_UPDATE", { routeParams: { id: tournamentId, fixtureId }, body: fixture });

export const deleteKnockoutMatch = (tournamentId, fixtureId) =>
  api.call("KNOCKOUT_FIXTURE_DELETE", { routeParams: { id: tournamentId, fixtureId } });

/** The owner's choice for one side ("Home" | "Away"); teamId null hands it back to its source. */
export const setKnockoutTeam = (tournamentId, fixtureId, side, teamId) =>
  api.call("KNOCKOUT_TEAM_SET", { routeParams: { id: tournamentId, fixtureId }, body: { side, teamId } });
