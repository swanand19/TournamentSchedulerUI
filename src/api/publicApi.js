import { api } from "./client";

// Public live scores (6E). The PUBLIC_* calls need no session: anyone with a public tournament's
// link may read it. `code` is the 8 characters in the link. The rest (switching it on, following)
// are signed-in calls.

const at = (code, matchId) => (matchId == null ? { code } : { code, matchId });

/** { id, code, name, sport, status, isStarted, startDate, endDate, hasKnockouts } */
export const getPublicTournament = (code) => api.call("PUBLIC_TOURNAMENT", { routeParams: at(code) });
export const getPublicMatches = (code) => api.call("PUBLIC_MATCHES", { routeParams: at(code) });
export const getPublicMatch = (code, matchId) => api.call("PUBLIC_MATCH", { routeParams: at(code, matchId) });
export const getPublicEvents = (code, matchId) => api.call("PUBLIC_MATCH_EVENTS", { routeParams: at(code, matchId) });
export const getPublicWatch = (code, matchId) => api.call("PUBLIC_WATCH", { routeParams: at(code, matchId) });
export const getPublicActivity = (code, matchId, before, take = 40) =>
  api.call("PUBLIC_ACTIVITY", { routeParams: at(code, matchId), query: { before, take } });
export const getPublicScorecard = (code, matchId) => api.call("PUBLIC_SCORECARD", { routeParams: at(code, matchId) });
export const getPublicAwards = (code, matchId) => api.call("PUBLIC_AWARDS", { routeParams: at(code, matchId) });
export const getPublicStats = (code) => api.call("PUBLIC_STATS", { routeParams: at(code) });
export const getPublicKnockout = (code) => api.call("PUBLIC_KNOCKOUT", { routeParams: at(code) });
/** { name, sports: [{ sport, matches, tournaments, headline }] } — never the detailed career. */
export const getPublicPlayer = (code, playerId) => api.call("PUBLIC_PLAYER", { routeParams: { code, playerId } });
export const getPublicPlayerLines = (code, playerId) => api.call("PUBLIC_PLAYER_LINES", { routeParams: { code, playerId } });

// Signed in: the owners' switch, and following.
/** Answers the tournament, with `share: { code, url }` while public. */
/** `code` may be the whole link. Answers { tournamentId, name, sport, isStarted }. */
export const followTournament = (code) => api.call("FOLLOW_ADD", { body: { code } });
/** Public tournaments by name (3+ letters), code or link: [{ tournamentId, code, name, sport, status, startDate, endDate, teams, isFollowing, isMine }]. */
export const searchPublicTournaments = (q) => api.call("FOLLOW_SEARCH", { query: { q } });
export const unfollowTournament = (tournamentId) => api.call("FOLLOW_REMOVE", { routeParams: { tournamentId } });

/** The link to show: the server's, or this site's own address when the server doesn't know it. */
export const publicLinkFor = (share) => share?.url ?? (share ? `${window.location.origin}/live/${share.code}` : null);
