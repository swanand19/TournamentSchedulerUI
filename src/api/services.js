// Every API service the website calls, by service ID.
//
// Pages call the functions in the other src/api/*.js modules; those name the service
// ("TOURNAMENT_LIST"), never a URL. The ID travels in the encrypted gateway request's header and
// the API finds the action from it — routes live only on the server ([ServiceRequestId] on each
// controller action). Route parameters are filled by name, so the names in `routeParams` are part
// of the contract too: the tournament is `id`, then `teamId`, `playerId`, `scheduleId`, `matchId`.
//
// The API's architecture tests check every ID here, and every api.call("…") in the site, exists on
// the server. client.js refuses an ID that isn't listed.

export const SERVICES = [
  "HEALTH_CHECK",

  // Signing in (the only ones that work signed out) and the account
  "AUTH_OPTIONS", // whether mobile numbers are on
  "AUTH_OTP_SEND", // body: contact (email or mobile number)
  "AUTH_OTP_VERIFY",
  "AUTH_LOGOUT",
  "AUTH_LOGOUT_ALL",
  "ACCOUNT_GET",
  "ACCOUNT_UPDATE",
  "ACCOUNT_PHOTO_SET",
  "ACCOUNT_PHOTO_REMOVE",
  "ACCOUNT_CONTACT_SEND", // a code to an email or number being added
  "ACCOUNT_CONTACT_VERIFY",
  "ACCOUNT_CONTACT_REMOVE", // body: kind (Email | Phone)
  "ACCOUNT_DELETE_PREVIEW", // sends the code that confirms it
  "ACCOUNT_DELETE",

  // Profiles and careers (query: userId | playerId; none = me)
  "PROFILE_GET",
  "PROFILE_CAREER", // query: sport

  // Your inbox (phase 6D)
  "NOTIFICATION_LIST", // query: before, take
  "NOTIFICATION_UNREAD",
  "LIVE_TICKET", // live updates (realtime/live.js): opens the line once
  "LIVE_WATCH_TOURNAMENT", // connectionId, id
  "LIVE_WATCH_MATCH", // connectionId, sport, matchId
  "LIVE_UNWATCH", // connectionId; { tournamentId } | { sport, matchId }
  "NOTIFICATION_READ", // notificationId
  "NOTIFICATION_READ_ALL",
  // Following people (2026-11-23)
  "PEOPLE_SEARCH",
  "PERSON_FOLLOW",
  "PERSON_UNFOLLOW",
  "PERSON_FOLLOWER_REMOVE",
  "PERSON_FOLLOWERS",
  "PERSON_FOLLOWING",

  // Watching a match (Round 2; routeParams: sport = football | cricket, matchId)
  "WATCH_MATCH", // the sides: squads before the start, line-ups after
  "WATCH_ACTIVITY", // query: before, take — what happened, newest first
  "KNOCKOUT_GET", // id — the knockout stage (everyone)
  "KNOCKOUT_PRESETS", // id — owners: formats that fit the groups
  "KNOCKOUT_APPLY", // id; { preset, thirdPlace, startDate?, endDate? }
  "KNOCKOUT_CLEAR", // id
  "KNOCKOUT_FIXTURE_ADD", // id; { round, label, home, away }
  "KNOCKOUT_FIXTURE_UPDATE", // id, fixtureId
  "KNOCKOUT_FIXTURE_DELETE", // id, fixtureId
  "KNOCKOUT_TEAM_SET", // id, fixtureId; { side, teamId }

  // Public live scores (6E). PUBLIC_* work signed out (routeParams: code, matchId, playerId).
  "PUBLIC_TOURNAMENT",
  "PUBLIC_MATCHES",
  "PUBLIC_MATCH", // the sport's own match answer, people and permissions taken out
  "PUBLIC_MATCH_EVENTS",
  "PUBLIC_WATCH",
  "PUBLIC_ACTIVITY", // query: before, take
  "PUBLIC_SCORECARD",
  "PUBLIC_AWARDS",
  "PUBLIC_STATS",
  "PUBLIC_KNOCKOUT",
  "PUBLIC_PLAYER", // name and sport cards only
  "PUBLIC_PLAYER_LINES", // a leaderboard row unfolded
  "PUBLIC_AUCTION", // the player auction for the hall's TV (no buttons, nobody's part)
  "PUBLIC_DRAW", // the team draw for the hall's TV

  // Player pool, team draw and auction (2026-11-17, docs/player-pool-and-auction-plan.md) — all take id
  "POOL_GET",
  "POOL_PLAYER_ADD", // { email | phone | name, tierId }
  "POOL_PLAYER_UPDATE", // poolPlayerId; { tierId + setTier, withdrawn }
  "POOL_PLAYER_REMOVE", // poolPlayerId
  "POOL_TIERS_SAVE", // { tiers } — the whole set, top first
  "POOL_REGISTRATION", // { open }
  "POOL_METHOD_SET", // { method: Draw | Auction } — until either way starts
  "AUCTION_GET",
  "AUCTION_SETTINGS",
  "AUCTION_BIDDER_SET", // { teamId, playerId | contact | none }
  "AUCTION_START",
  "AUCTION_NEXT", // { lotId? }
  "AUCTION_BID", // { teamId, amount }
  "AUCTION_SELL",
  "AUCTION_UNSOLD",
  "AUCTION_UNDO_BID",
  "AUCTION_UNDO_SALE", // { lotId }
  "AUCTION_PAUSE",
  "AUCTION_RESUME",
  "AUCTION_TAKE_OVER",
  "AUCTION_ROUND_START", // { prices: [{ tierId, price }] }
  "AUCTION_FINISH",
  "AUCTION_ASSIGN", // { poolPlayerId, teamId, price }
  "AUCTION_CONFIRM",
  "AUCTION_CANCEL",
  "AUCTION_MOVE", // { lotId, teamId, price }
  "AUCTION_SWAP", // { lotId, otherLotId }
  "AUCTION_FILL_PREVIEW",
  "AUCTION_FILL",
  "DRAW_GET",
  "DRAW_SETTINGS", // { kind?, setPace, autoSeconds? }
  "DRAW_START",
  "DRAW_NEXT",
  "DRAW_REST", // { all }
  "DRAW_QUICK",
  "DRAW_RESTART",
  "DRAW_TAKE_OVER",
  "DRAW_MOVE", // { poolPlayerId, teamId }
  "DRAW_SWAP", // { poolPlayerId, otherPoolPlayerId }
  "DRAW_CONFIRM",
  "FOLLOW_SEARCH", // query: q — public tournaments by name, code or link
  "FOLLOW_ADD", // { code } (or the whole link)
  "FOLLOW_REMOVE", // tournamentId

  // Tournaments
  "TOURNAMENT_LIST", // query: sport
  "TOURNAMENT_CREATE",
  "TOURNAMENT_GET", // id
  "TOURNAMENT_DELETE", // id
  "TOURNAMENT_START", // id
  "TOURNAMENT_MATCHES", // id
  "TOURNAMENT_STATS", // id
  "TOURNAMENT_CRICKET_STATS", // id
  "TOURNAMENT_PLAYER_LINES", // id, playerId — a leaderboard row unfolded
  "TOURNAMENT_UPDATE", // id
  "TOURNAMENT_PICTURE_SET", // id, kind (logo | banner)
  "TOURNAMENT_PICTURE_REMOVE", // id, kind
  "TOURNAMENT_COMPLETE", // id

  // Owners and scorers
  "TOURNAMENT_MEMBER_LIST", // id
  "TOURNAMENT_MEMBER_ADD", // id
  "TOURNAMENT_MEMBER_REMOVE", // id, userId
  "TOURNAMENT_INVITE_RESEND", // id, inviteId
  "TOURNAMENT_INVITE_CANCEL", // id, inviteId
  "TOURNAMENT_LEAVE", // id

  // Who is scoring a match — sport ("football" | "cricket"), matchId
  "SCORING_CLAIM",
  "SCORING_REQUEST",
  "SCORING_RESPOND",
  "SCORING_TAKE_OVER",

  // Groups and schedule
  "SCHEDULE_ACTIVE", // id
  "SCHEDULE_HISTORY", // id
  "SCHEDULE_ACTIVATE", // id, scheduleId
  "TOURNAMENT_GROUPS_RANDOMIZE",
  "TOURNAMENT_GROUPS_MANUAL",
  "TOURNAMENT_SCHEDULE_GENERATE",
  "TOURNAMENT_SCHEDULE_APPROVE",

  // Teams and players
  "TEAM_LIST", // id
  "TEAM_CREATE", // id
  "TEAM_UPDATE", // id, teamId
  "TEAM_DELETE", // id, teamId
  "PLAYER_CONTACT_LOOKUP", // id, teamId; { contact } — who an email or number belongs to
  "PLAYER_CREATE", // id, teamId
  "PLAYER_UPDATE", // id, teamId, playerId
  "PLAYER_DELETE", // id, teamId, playerId
  "PLAYER_UNLINK", // id, teamId, playerId — an owner, or the player themselves
  "TEAM_JOIN_CODE_RESET", // id, teamId
  "PLAYER_RESTORE", // id, teamId, playerId — back into the squad after being left out
  "TEAM_ADMIN_ADD", // id, teamId; { playerId } | { contact } — owners name who runs a team
  "TEAM_ADMIN_REMOVE", // id, teamId, userId — an owner, or the admin stepping down

  // Joining a team with its code (the person isn't in the tournament yet)
  "TEAM_JOIN_PREVIEW",
  "TEAM_JOIN",

  // Lasting teams (2026-11-20/21; people see "team", the API says club): the team, its players and admins, joining
  // with its 8-character code, keeping a tournament's team, the live-squads question, entering tournaments.
  "CLUB_LIST",
  "CLUB_CREATE", // { name, sport, area, iPlay }
  "CLUB_GET", // clubId
  "CLUB_UPDATE", // clubId; { name, area, captainClubPlayerId, setCaptain }
  "CLUB_DELETE",
  "CLUB_LOGO_SET", // clubId; { image }
  "CLUB_LOGO_REMOVE",
  "CLUB_JOIN_CODE_RESET",
  "CLUB_PLAYER_LOOKUP", // clubId; { contact }
  "CLUB_PLAYER_ADD",
  "CLUB_PLAYER_UPDATE", // clubId, clubPlayerId
  "CLUB_PLAYER_REMOVE", // clubId, clubPlayerId — an admin, or the player leaving
  "CLUB_ADMIN_ADD", // clubId; { clubPlayerId } | { contact }
  "CLUB_ADMIN_REMOVE", // clubId, userId
  "CLUB_JOIN_PREVIEW", // { code }
  "CLUB_JOIN", // { code, clubPlayerId }
  "CLUB_FROM_TEAM", // id, teamId — "Keep this team"
  "CLUB_SQUADS_PREVIEW", // clubId, clubPlayerId
  "CLUB_SQUADS_APPLY", // clubId; { clubPlayerId, teamIds } | { playerIds }
  "ENTRY_PREVIEW", // { clubId, code } | { clubId, entryId }
  "ENTRY_REQUEST", // { clubId, code, teamName, clubPlayerIds }
  "ENTRY_UPDATE", // entryId; { teamName, clubPlayerIds }
  "ENTRY_WITHDRAW", // entryId
  "TOURNAMENT_ENTRY_LIST", // id (owners)
  "TOURNAMENT_ENTRY_CODE", // id; { open }
  "TOURNAMENT_ENTRY_ACCEPT", // id, entryId
  "TOURNAMENT_ENTRY_DECLINE", // id, entryId
  "PUBLIC_CLUB", // code — a lasting team's signed-out page

  // Football matches — all take matchId
  "MATCH_GET",
  "MATCH_SETUP",
  "MATCH_EVENT_RECORD",
  "MATCH_EVENTS",
  "MATCH_CLOCK_PAUSE",
  "MATCH_CLOCK_RESUME",
  "MATCH_CLOCK_ADD_TIME",
  "MATCH_PERIOD_END",
  "MATCH_PERIOD_NEXT",
  "MATCH_COMPLETE",
  "MATCH_PENALTIES_START",
  "MATCH_PENALTIES_GET",
  "MATCH_PENALTY_KICK",
  "MATCH_PENALTIES_END",

  // Cricket matches — all take matchId, and every one answers with the whole match state
  "CRICKET_MATCH_GET",
  "CRICKET_SETUP_OPTIONS",
  "CRICKET_SETUP",
  "CRICKET_INNINGS_START",
  "CRICKET_BALL_RECORD",
  "CRICKET_BALL_UNDO",
  "CRICKET_BATTER_SET",
  "CRICKET_BOWLER_SET",
  "CRICKET_PLAYER_REPLACE", // matchId; { playerId, replacementId }
  "CRICKET_INNINGS_END",
  "CRICKET_REDUCE_OVERS",
  "CRICKET_FOLLOW_ON",
  "CRICKET_SUPER_OVER_START",
  "CRICKET_COMPLETE",
  "CRICKET_SCORECARD",
  "CRICKET_AWARDS",
  "CRICKET_BALLS",
  "CRICKET_EVENTS",
  // Leagues and seasons (2026-11-24); the PUBLIC_LEAGUE* reads are the signed-out page at /leagues/<code>.
  "LEAGUE_LIST",
  "LEAGUE_CANDIDATES",
  "LEAGUE_CREATE",
  "LEAGUE_GET",
  "LEAGUE_UPDATE",
  "LEAGUE_DELETE",
  "LEAGUE_LOGO_SET",
  "LEAGUE_LOGO_REMOVE",
  "LEAGUE_ORGANISER_ADD",
  "LEAGUE_ORGANISER_REMOVE",
  "LEAGUE_SEASON_ADD",
  "LEAGUE_SEASON_REMOVE",
  "LEAGUE_STATS",
  "LEAGUE_TEAMS",
  "LEAGUE_BRING_BACK_OPTIONS",
  "LEAGUE_BRING_BACK",
  "PUBLIC_LEAGUE",
  "PUBLIC_LEAGUE_STATS",
  "PUBLIC_LEAGUE_TEAMS",
];
