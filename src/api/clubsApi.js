import { api } from "./client";

// Lasting teams (docs/reusable-teams-plan.md; people see "team", the API says club). Every change answers the whole
// team (`ClubDto`); a change that touches live squads carries `question` for the one-sheet answer (step 4).

export const listMyClubs = () => api.call("CLUB_LIST");
export const createClub = (body) => api.call("CLUB_CREATE", { body });
export const getClub = (clubId) => api.call("CLUB_GET", { routeParams: { clubId } });
export const updateClub = (clubId, body) => api.call("CLUB_UPDATE", { routeParams: { clubId }, body });
export const deleteClub = (clubId) => api.call("CLUB_DELETE", { routeParams: { clubId } });
export const setClubLogo = (clubId, image) => api.call("CLUB_LOGO_SET", { routeParams: { clubId }, body: { image } });
export const removeClubLogo = (clubId) => api.call("CLUB_LOGO_REMOVE", { routeParams: { clubId } });
export const resetClubCode = (clubId) => api.call("CLUB_JOIN_CODE_RESET", { routeParams: { clubId } });
export const lookupClubPlayer = (clubId, contact) => api.call("CLUB_PLAYER_LOOKUP", { routeParams: { clubId }, body: { contact } });
export const addClubPlayer = (clubId, body) => api.call("CLUB_PLAYER_ADD", { routeParams: { clubId }, body });
export const updateClubPlayer = (clubId, clubPlayerId, body) => api.call("CLUB_PLAYER_UPDATE", { routeParams: { clubId, clubPlayerId }, body });
export const removeClubPlayer = (clubId, clubPlayerId) => api.call("CLUB_PLAYER_REMOVE", { routeParams: { clubId, clubPlayerId } });
export const addClubAdmin = (clubId, body) => api.call("CLUB_ADMIN_ADD", { routeParams: { clubId }, body });
export const removeClubAdmin = (clubId, userId) => api.call("CLUB_ADMIN_REMOVE", { routeParams: { clubId, userId } });
export const previewClubJoin = (code) => api.call("CLUB_JOIN_PREVIEW", { body: { code } });
export const joinClub = (code, clubPlayerId) => api.call("CLUB_JOIN", { body: { code, clubPlayerId } });
// From an invite link (2026-11-23): straight in as new; already in the team answers { alreadyIn: true }.
export const joinClubByLink = (code) => api.call("CLUB_JOIN", { body: { code, link: true } });
export const keepTeam = (tournamentId, teamId) => api.call("CLUB_FROM_TEAM", { routeParams: { id: tournamentId, teamId } });
export const previewClubSquads = (clubId, clubPlayerId) => api.call("CLUB_SQUADS_PREVIEW", { routeParams: { clubId, clubPlayerId } });
export const applyClubSquads = (clubId, body) => api.call("CLUB_SQUADS_APPLY", { routeParams: { clubId }, body });

// Entering a tournament with its code (step 3): the team admin's side…
export const previewEntry = (body) => api.call("ENTRY_PREVIEW", { body });
export const sendEntry = (body) => api.call("ENTRY_REQUEST", { body });
export const updateEntry = (entryId, body) => api.call("ENTRY_UPDATE", { routeParams: { entryId }, body });
export const withdrawEntry = (entryId) => api.call("ENTRY_WITHDRAW", { routeParams: { entryId } });

// …and the organiser's (Edit on the tournament).
export const getEntries = (id) => api.call("TOURNAMENT_ENTRY_LIST", { routeParams: { id } });
export const setEntryCode = (id, open) => api.call("TOURNAMENT_ENTRY_CODE", { routeParams: { id }, body: { open } });
export const acceptEntry = (id, entryId) => api.call("TOURNAMENT_ENTRY_ACCEPT", { routeParams: { id, entryId } });
export const declineEntry = (id, entryId) => api.call("TOURNAMENT_ENTRY_DECLINE", { routeParams: { id, entryId } });

/** The signed-out team page (C-15): names and results only. */
export const getPublicClub = (code) => api.call("PUBLIC_CLUB", { routeParams: { code } });
