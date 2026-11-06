// The web app's addresses. App.jsx still keeps which screen is open in its own state; this turns that
// state into a path (so a refresh, a shared link or the browser's Back lands on the same screen) and a
// path back into what to open. The groups and schedule wizard has no address of its own: it is the
// tournament's page, and a refresh there returns to wherever the tournament opens.

const id = (s) => (/^\d+$/.test(s ?? "") ? Number(s) : null);

/** The path for what's on screen. Takes App's state as it is. */
export function pathFor({ view, stage, tournamentId, activeMatchId, liveMatchId, watchMatchId, matchesTab, profileWho }) {
  switch (view) {
    case "profile":
      if (profileWho?.playerId) return `/profile/player/${profileWho.playerId}`;
      if (profileWho?.userId) return `/profile/user/${profileWho.userId}`;
      return "/profile";
    case "account":
    case "join":
    case "find":
    case "notifications":
      return `/${view}`;
    case "tournament": {
      if (!tournamentId) return "/";
      const t = `/t/${tournamentId}`;
      switch (stage) {
        case "manageTeams": return `${t}/teams`;
        case "people": return `${t}/people`;
        case "knockout": return `${t}/knockout`;
        case "matchSetup": return activeMatchId ? `${t}/match/${activeMatchId}/setup` : t;
        case "liveMatch": return liveMatchId ? `${t}/match/${liveMatchId}` : t;
        case "watchMatch": return watchMatchId ? `${t}/match/${watchMatchId}/watch` : t;
        case "matches": return matchesTab === "stats" ? `${t}/stats` : t;
        default: return t;
      }
    }
    default:
      return "/";
  }
}

/**
 * What a path asks for: { name: "home" | "profile" | "account" | "join" | "notifications" } or
 * { name: "tournament", id, screen, matchId }. Anything unknown is Home, never an error page.
 */
export function parsePath(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  const [first, second, third, fourth, fifth] = parts;
  const home = { name: "home" };

  if (first === "profile") {
    if (!second) return { name: "profile", who: {} };
    if (second === "player" && id(third)) return { name: "profile", who: { playerId: id(third) } };
    if (second === "user" && id(third)) return { name: "profile", who: { userId: id(third) } };
    return home;
  }
  if (["account", "join", "find", "notifications"].includes(first) && parts.length === 1) return { name: first };
  // "Sign in to follow" on a public page (6E): follow it, then open it. Never an address of its own afterwards.
  if (first === "follow" && second && !third) return { name: "follow", code: second };

  if (first === "t" && id(second)) {
    const tournament = (screen, matchId = null) => ({ name: "tournament", id: id(second), screen, matchId });
    if (!third) return tournament("landing");
    if (["teams", "people", "knockout", "stats"].includes(third) && !fourth) return tournament(third);
    if (third === "match" && id(fourth)) {
      if (!fifth) return tournament("match", id(fourth));
      if (fifth === "setup" || fifth === "watch") return tournament(fifth, id(fourth));
    }
    return tournament("landing");
  }
  return home;
}
