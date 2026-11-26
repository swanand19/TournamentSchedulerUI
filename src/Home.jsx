import { useState, useEffect } from "react";
import { getTournaments, createTournament } from "./api/tournamentsApi";
import { listMyLeagues } from "./api/leaguesApi";
import { SPORTS, neutralTheme as theme, syncDocumentSport } from "./theme";
import ErrorBanner from "./ErrorBanner";
import { pictureSrc } from "./pictures";
import MyTeams from "./clubs/MyTeams";
import { dateRange } from "./ui/format";
import { ChevronIcon, JoinIcon, PlusIcon, StarIcon } from "./ui/icons";

// Home (2026-11-26, the canvas's "Web · Home" boards): your tournaments in the chosen sport. The count
// tiles are the filter, as on the phone (the user's canvas note: Tournaments · In play · Upcoming ·
// Past switch the list; the first shows everything). Beside the list on a wide screen: joining a team,
// finding tournaments and people, and your lasting teams. The page belongs to no sport, so it sits on
// the neutral wallpaper; the sport switch only picks which tournaments are listed.

// The sport survives a reload, so someone running a cricket tournament isn't dropped back into
// football every time the page refreshes.
const SPORT_KEY = "tournamentScheduler.sport";

function loadStoredSport() {
  try {
    const stored = localStorage.getItem(SPORT_KEY);
    return SPORTS.some((s) => s.key === stored) ? stored : "Football";
  } catch {
    return "Football"; // private mode / storage disabled
  }
}

/** "owner", "scorer · player", "team admin · player" — what I am in a tournament, from the server's myRoles. */
function roleLabel(myRoles = []) {
  const parts = [];
  if (myRoles.includes("owner")) parts.push("owner");
  else if (myRoles.includes("scorer")) parts.push("scorer");
  if (myRoles.includes("teamAdmin") && !myRoles.includes("owner")) parts.push("team admin");
  if (myRoles.includes("player")) parts.push("player");
  return parts.length ? parts.join(" · ") : null;
}

/** The row's status on the right: the server's status, with "setting up" split by whether a schedule exists. */
function status(t) {
  switch (t.status) {
    case "Live": return { label: "Live now", tone: "" };
    case "Completed": return { label: "Completed", tone: "quiet" };
    case "Cancelled": return { label: "Cancelled", tone: "quiet" };
    default: return t.hasSchedule ? { label: "Schedule ready", tone: "quiet" } : { label: "Setting up", tone: "warn" };
  }
}

// Public tournaments I only follow (6E) have their own section; one I also run or play in stays with mine.
const onlyFollowing = (t) => (t.myRoles ?? []).every((r) => r === "follower") && (t.myRoles ?? []).length > 0;
const phaseOf = (t) => (t.status === "Live" ? "live" : t.status === "Completed" || t.status === "Cancelled" ? "past" : "upcoming");

const SECTIONS = [
  { key: "live", title: "In play", match: (t) => !onlyFollowing(t) && phaseOf(t) === "live" },
  { key: "upcoming", title: "Upcoming", match: (t) => !onlyFollowing(t) && phaseOf(t) === "upcoming" },
  { key: "past", title: "Past", match: (t) => !onlyFollowing(t) && phaseOf(t) === "past" },
  { key: "following", title: "Following", match: onlyFollowing },
];

// The tiles (the phone's Home tiles do the same). Followed tournaments are filtered by their own status too.
const TILES = [
  { key: "all", label: "Tournaments" },
  { key: "live", label: "In play" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
];
const FILTER_EMPTY = {
  live: "Nothing is in play right now.",
  upcoming: "Nothing upcoming — every tournament here has started or finished.",
  past: "Nothing has finished yet.",
};

export default function Home({ notice = "", onSelectTournament, onJoinTeam, onFindTournament, onOpenClub, onOpenLeague, onNewLeague }) {
  const [filter, setFilter] = useState("all");
  const [sport, setSport] = useState(loadStoredSport);
  const [tournaments, setTournaments] = useState([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  // The form's one optional question (leagues, 2026-11-24): a season of a league the person runs, or a one-off.
  const [leagues, setLeagues] = useState([]);
  const [leagueId, setLeagueId] = useState("");
  const sportTheme = SPORTS.find((s) => s.key === sport) ?? SPORTS[0];

  const load = async (forSport = sport) => {
    setLoading(true);
    setError("");
    try {
      setTournaments(await getTournaments(forSport));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncDocumentSport("None");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(sport);
    setLeagueId("");
    listMyLeagues(sport).then(setLeagues).catch(() => setLeagues([]));
  }, [sport]);

  const selectSport = (next) => {
    if (next === sport) return;
    setSport(next);
    setTournaments([]);
    setFilter("all");
    setNewName("");
    setNameError("");
    try {
      localStorage.setItem(SPORT_KEY, next);
    } catch {
      // Not being able to remember the choice is not worth failing the click over.
    }
  };

  const handleCreate = async (e) => {
    e?.preventDefault();
    const name = newName.trim();
    if (!name) {
      setNameError("Give your tournament a name first.");
      return;
    }
    if (creating) return;
    setNameError("");
    setCreating(true);
    setError("");
    try {
      // Dates come later, with the schedule, once the teams are known.
      const t = await createTournament(name, sport, undefined, undefined, leagueId ? Number(leagueId) : null);
      setNewName("");
      await load(sport);
      onSelectTournament(t.id, false, false, sport, t.name ?? name);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const countOf = (key) => (key === "all" ? tournaments.length : tournaments.filter((t) => phaseOf(t) === key).length);
  const sportLabel = sportTheme.label.toLowerCase();

  return (
    <main className="kc-wrap kc-main">
      <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <h1 className="kc-title" style={{ flex: "1 1 auto" }}>Your tournaments</h1>
        <div className="kc-seg" role="tablist" aria-label="Sport">
          {SPORTS.map((s) => (
            <button key={s.key} type="button" role="tab" aria-selected={s.key === sport} onClick={() => selectSport(s.key)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="kc-grid2" style={{ marginTop: 24 }}>
        <div className="kc-col">
          <ErrorBanner message={error || notice} />

          {/* The counts are the filter: tap one to show only those, "Tournaments" for all. */}
          <div className="kc-counts" role="group" aria-label="Show tournaments" style={{ "--n": TILES.length }}>
            {TILES.map((f) => (
              <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(filter === f.key ? "all" : f.key)}>
                <b>{loading && !tournaments.length ? "–" : countOf(f.key)}</b>
                <span>{f.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleCreate} style={{ marginTop: 22 }}>
            <label htmlFor="new-tournament-name" className="kc-label">
              New {sportLabel} tournament
            </label>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <input
                id="new-tournament-name"
                className="kc-field"
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? "new-tournament-error" : undefined}
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (nameError) setNameError("");
                }}
                placeholder={sportTheme.placeholder}
                disabled={creating}
              />
              <button type="submit" className="kc-btn pri" disabled={creating} aria-label="New tournament" style={{ flex: "none" }}>
                <PlusIcon />
                <span className="kc-desk-only">{creating ? "Creating…" : "New tournament"}</span>
              </button>
            </div>
            {nameError && (
              <p id="new-tournament-error" style={{ color: theme.warnInk, fontSize: 14, margin: "8px 2px 0" }}>
                {nameError}
              </p>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <label htmlFor="new-tournament-league" className="kc-cap">
                League (optional)
              </label>
              <select
                id="new-tournament-league"
                value={leagueId}
                disabled={creating}
                onChange={(e) => {
                  if (e.target.value === "new") {
                    onNewLeague?.(sport);
                    return;
                  }
                  setLeagueId(e.target.value);
                }}
                style={{ flex: "1 1 220px", minHeight: 40, padding: "0 12px", borderRadius: 12, border: "1px solid var(--field-line)", fontSize: 14 }}
              >
                <option value="">No, a one-off tournament</option>
                {leagues.map((l) => (
                  <option key={l.leagueId} value={l.leagueId}>
                    {l.name} — this becomes Season {l.seasons + 1}
                  </option>
                ))}
                <option value="new">Start a new league…</option>
              </select>
            </div>
          </form>

          {loading && !tournaments.length && <p className="kc-cap" style={{ marginTop: 24 }}>Loading…</p>}

          {!loading && filter !== "all" && tournaments.length > 0 && countOf(filter) === 0 && (
            <p className="kc-sub" style={{ marginTop: 24 }}>
              {FILTER_EMPTY[filter]}{" "}
              <button type="button" className="kc-link" onClick={() => setFilter("all")}>
                Show all
              </button>
            </p>
          )}

          {SECTIONS.map((section) => {
            const rows = tournaments.filter((t) => section.match(t) && (filter === "all" || phaseOf(t) === filter));
            if (rows.length === 0) return null;
            return (
              <section key={section.key} aria-labelledby={`home-${section.key}`}>
                <div className="kc-sechd">
                  <h2 id={`home-${section.key}`} className="kc-h2">{section.title}</h2>
                  <span className="kc-cap">{rows.length}</span>
                </div>
                <div className="kc-rows stagger">
                  {rows.map((t, i) => {
                    const st = status(t);
                    const range = dateRange(t);
                    const role = roleLabel(t.myRoles);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className="kc-row pressable"
                        style={{ "--i": i }}
                        onClick={() => onSelectTournament(t.id, t.hasSchedule, t.isStarted, t.sport, t.name)}
                      >
                        {/* The tournament's logo when it has one (HLD P-26). */}
                        {t.logoUrl ? (
                          <img className="kc-logo" src={pictureSrc(t.logoUrl)} alt="" width={44} height={44} />
                        ) : t.status === "Live" ? (
                          <span className="kc-dot" aria-hidden="true" />
                        ) : null}
                        <span className="kc-grow">
                          <span className="nm">{t.name}</span>
                          <span className="kc-cap">
                            {[range ?? `Created ${new Date(t.createdAt).toLocaleDateString()}`, t.league && `Season ${t.league.season}`, role].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <span className={`kc-status kc-desk-only ${st.tone}`}>
                          {st.tone === "" && <span className="kc-dot" aria-hidden="true" />}
                          {st.label}
                        </span>
                        <ChevronIcon />
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {!loading && tournaments.length === 0 && (
            <p className="kc-sub" style={{ marginTop: 24 }}>
              No {sportLabel} tournaments yet. Start one above, join a team with its code — or ask an organiser to add you
              using the email or number you signed in with.
            </p>
          )}

          {/* Leagues the person runs (2026-11-24): a league with no season yet is reached here. */}
          {leagues.length > 0 && (
            <section aria-labelledby="home-leagues">
              <div className="kc-sechd">
                <h2 id="home-leagues" className="kc-h2">Leagues you run</h2>
              </div>
              <div className="kc-rows">
                {leagues.map((l) => (
                  <button key={l.leagueId} type="button" className="kc-row pressable" onClick={() => onOpenLeague?.(l.leagueId)}>
                    {l.logoUrl ? (
                      <img className="kc-logo" src={pictureSrc(l.logoUrl)} alt="" width={44} height={44} />
                    ) : (
                      <span className="kc-initials" aria-hidden="true">{l.shortName}</span>
                    )}
                    <span className="kc-grow">
                      <span className="nm">{l.name}</span>
                      <span className="kc-cap">{l.line}</span>
                    </span>
                    <ChevronIcon />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="kc-aside">
          <div className="kc-pane kc-side">
            {/* Playing rather than organising: the team's code links you to your place in it. */}
            <button type="button" className="si" onClick={onJoinTeam}>
              <span className="ico"><JoinIcon /></span>
              <span className="kc-grow">
                <b>Join a team</b>
                <span className="kc-cap">Got a code or a link from an organiser?</span>
              </span>
              <ChevronIcon />
            </button>
            {/* Watching someone else's: public tournaments by name or code (6E), and people. */}
            <button type="button" className="si" onClick={onFindTournament}>
              <span className="ico"><StarIcon /></span>
              <span className="kc-grow">
                <b>Find tournaments and people</b>
                <span className="kc-cap">Follow a tournament, or a player you know</span>
              </span>
              <ChevronIcon />
            </button>
          </div>
          {/* Lasting teams (C-22): the ones I run or play for, and "Make a team". */}
          <MyTeams sport={sport} theme={sportTheme} onOpenClub={onOpenClub} />
        </aside>
      </div>
    </main>
  );
}
