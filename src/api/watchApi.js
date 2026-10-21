import { api } from "./client";

// Watching a match (Round 2), both sports: sport is "football" or "cricket".

/** { matchId, sport, tournamentName, groupName, matchNumber, phase: Preview|Live|Finished, formatLine, tossLine, resultLine, home, away } */
export const getWatchMatch = (sport, matchId) => api.call("WATCH_MATCH", { routeParams: { sport, matchId } });

/** { items: [{ id, kind, marker, chip, text, detail, teamId, inningsNumber }], hasMore } — newest first. */
export const getActivity = (sport, matchId, before, take = 40) =>
  api.call("WATCH_ACTIVITY", { routeParams: { sport, matchId }, query: { before, take } });
