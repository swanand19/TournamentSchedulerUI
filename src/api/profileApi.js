import { api } from "./client";

// Profiles and careers. With no ids it's the signed-in person; `playerId` (a squad place, which is
// what a leaderboard or team list has) or `userId` opens someone else's. Figures arrive worded by
// the server, completed matches only.

/** { userId, name, isMe, memberSince, email, phone (yours only), tournamentsRun, sports: [{ sport, matches, tournaments, headline }] } */
export const getProfile = ({ userId, playerId } = {}) => api.call("PROFILE_GET", { query: { userId, playerId } });

/** { name, isMe, sport, basis, matches, statGroups, teams, tournaments, honourStats, honours } */
export const getCareer = (sport, { userId, playerId } = {}) => api.call("PROFILE_CAREER", { query: { sport, userId, playerId } });
