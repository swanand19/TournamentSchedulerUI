import { createContext, useContext } from "react";
import { getWatchMatch, getActivity } from "./watchApi";
import { getCricketAwards, getCricketMatch, getCricketScorecard } from "./cricketApi";
import { getMatch, getMatchEvents } from "./matchesApi";
import { getTournamentStats, getCricketStats } from "./tournamentsApi";
import { getKnockout } from "./knockoutApi";
import * as pub from "./publicApi";

// Where the read-only screens get their data. The viewer, scorecard, stats pages and the bracket are
// the same screens in the signed-in app and on a public tournament's page (6E); only the calls behind
// them differ. Screens ask useSource() instead of importing the calls, and the public page wraps
// itself in <SourceContext.Provider value={publicSource(code)}>.

export const signedInSource = {
  live: true, // nudged by the live line (realtime/), which needs a session; the public page just polls
  watchMatch: getWatchMatch, // (sport, matchId)
  activity: getActivity, // (sport, matchId, before, take)
  footballMatch: getMatch, // (matchId)
  footballEvents: getMatchEvents,
  cricketMatch: getCricketMatch,
  cricketAwards: getCricketAwards,
  cricketScorecard: getCricketScorecard,
  stats: getTournamentStats, // (tournamentId)
  cricketStats: getCricketStats,
  knockout: getKnockout,
};

/** The same calls for a public tournament, found by the code in its link (tournament ids are ignored). */
export function publicSource(code) {
  return {
    watchMatch: (_sport, matchId) => pub.getPublicWatch(code, matchId),
    activity: (_sport, matchId, before, take) => pub.getPublicActivity(code, matchId, before, take),
    footballMatch: (matchId) => pub.getPublicMatch(code, matchId),
    footballEvents: (matchId) => pub.getPublicEvents(code, matchId),
    cricketMatch: (matchId) => pub.getPublicMatch(code, matchId),
    cricketAwards: (matchId) => pub.getPublicAwards(code, matchId),
    cricketScorecard: (matchId) => pub.getPublicScorecard(code, matchId),
    stats: () => pub.getPublicStats(code),
    cricketStats: () => pub.getPublicStats(code),
    knockout: () => pub.getPublicKnockout(code),
  };
}

export const SourceContext = createContext(signedInSource);

export const useSource = () => useContext(SourceContext);
