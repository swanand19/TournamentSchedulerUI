import { useState, useEffect } from "react";
import { getTournaments, createTournament } from "./api/tournamentsApi";
import { listMyLeagues } from "./api/leaguesApi";
import { font, SPORTS, themeFor, syncDocumentSport } from "./theme";
import ErrorBanner from "./ErrorBanner";
import { useSession } from "./auth/useSession";
import NotificationBell from "./NotificationBell";
import { pictureSrc } from "./pictures";
import MyTeams from "./clubs/MyTeams";

// The tab survives a reload, so someone running a cricket tournament isn't dropped back into
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

/** "12 Oct" / "12 Oct 2027" from "YYYY-MM-DD", without time-zone surprises. */
function shortDay(iso, withYear) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
}

function dateRange(t) {
  if (!t.startDate || !t.endDate) return null;
  const sameYear = t.startDate.slice(0, 4) === t.endDate.slice(0, 4);
  return t.startDate === t.endDate
    ? shortDay(t.startDate, true)
    : `${shortDay(t.startDate, !sameYear)} – ${shortDay(t.endDate, true)}`;
}

/** The card's status chip — the server's status, with "setting up" split by whether a schedule exists. */
function statusChip(t, theme) {
  switch (t.status) {
    case "Live": return { label: "In play", bg: "rgba(66,133,244,0.15)", fg: "#2b5fb8" };
    case "Completed": return { label: "Completed", bg: "#EDEAE0", fg: theme.muted };
    case "Cancelled": return { label: "Cancelled", bg: "#EDEAE0", fg: theme.muted };
    default: return t.hasSchedule
      ? { label: "Schedule ready", bg: "rgba(99,153,34,0.15)", fg: theme.successInk }
      : { label: "Setting up", bg: "rgba(242,169,59,0.15)", fg: "#8a4b1b" };
  }
}

/** "Owner", "Scorer · Player", "Team admin · Player" — what I am in a tournament, from the server's myRoles. */
function roleLabel(myRoles = []) {
  const parts = [];
  if (myRoles.includes("owner")) parts.push("Owner");
  else if (myRoles.includes("scorer")) parts.push("Scorer");
  if (myRoles.includes("teamAdmin") && !myRoles.includes("owner")) parts.push("Team admin");
  if (myRoles.includes("player")) parts.push("Player");
  return parts.length ? parts.join(" · ") : null;
}

// Public tournaments I only follow (6E) have their own section; one I also run or play in stays with mine.
const onlyFollowing = (t) => (t.myRoles ?? []).every((r) => r === "follower") && (t.myRoles ?? []).length > 0;

const SECTIONS = [
  { key: "live", title: "LIVE", match: (t) => !onlyFollowing(t) && t.status === "Live" },
  { key: "upcoming", title: "UPCOMING", match: (t) => !onlyFollowing(t) && (t.status === "Upcoming" || !t.status) },
  { key: "past", title: "PAST", match: (t) => !onlyFollowing(t) && (t.status === "Completed" || t.status === "Cancelled") },
  { key: "following", title: "FOLLOWING", match: onlyFollowing },
];

// The filter above the list (the user's 2026-11-20 ask; the phone's count tiles do the same).
// Followed tournaments are filtered by their own status too.
const FILTERS = [
  { key: "all", label: "All" },
  { key: "live", label: "In play" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
];
const phaseOf = (t) => (t.status === "Live" ? "live" : t.status === "Completed" || t.status === "Cancelled" ? "past" : "upcoming");
const FILTER_EMPTY = {
  live: "Nothing is in play right now.",
  upcoming: "Nothing upcoming — every tournament here has started or finished.",
  past: "Nothing has finished yet.",
};

export default function Home({ notice = "", onSelectTournament, onOpenAccount, onJoinTeam, onFindTournament, onOpenNotifications, onOpenClub, onOpenLeague, onNewLeague }) {
  const [filter, setFilter] = useState("all");
  const session = useSession();
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

  const theme = themeFor(sport);

  const load = async (forSport = sport) => {
    setLoading(true);
    setError("");
    try {
      const data = await getTournaments(forSport);
      setTournaments(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncDocumentSport(sport);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(sport);
    setLeagueId("");
    listMyLeagues(sport).then(setLeagues).catch(() => setLeagues([]));
  }, [sport]);

  const selectSport = (next) => {
    if (next === sport) return;
    setSport(next);
    setTournaments([]);
    setNewName("");
    setNameError("");
    try {
      localStorage.setItem(SPORT_KEY, next);
    } catch {
      // Not being able to remember the tab is not worth failing the click over.
    }
  };

  const handleNameChange = (e) => {
    setNewName(e.target.value);
    if (nameError) setNameError("");
  };

  const handleCreate = async () => {
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
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.background,
        fontFamily: font.body,
        color: theme.onDark,
        paddingBottom: "4rem",
      }}
    >
      <header style={{ padding: "2.5rem clamp(1rem, 4vw, 2rem) 0", borderBottom: `3px solid ${theme.borderOnDark}` }}>
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <p style={{ fontFamily: font.condensed, fontSize: 18, letterSpacing: "0.35em", color: theme.accent, margin: 0, fontWeight: 600 }}>
              KICKCRICKET
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
              <NotificationBell theme={theme} onOpen={onOpenNotifications} />
              <button
                onClick={onOpenAccount}
                aria-label="Your profile"
                style={{
                  background: theme.surfaceOnDark,
                  border: `1px solid ${theme.borderOnDark}`,
                  color: theme.onDark,
                  borderRadius: 999,
                  padding: "0.4rem 0.9rem",
                  minHeight: 44,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  maxWidth: 120,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {session?.user?.name?.split(" ")[0] || "Account"}
              </button>
            </div>
          </div>
          <h1 style={{ fontFamily: font.display, fontSize: "clamp(2rem, 8vw, 3rem)", margin: "0.2rem 0 0", lineHeight: 1 }}>
            YOUR TOURNAMENTS
          </h1>

          {/* Same underline tab treatment as the Matches/Stats tabs inside a tournament. */}
          <div style={{ display: "flex", gap: 28, marginTop: "1.6rem" }}>
            {SPORTS.map((s) => {
              const active = s.key === sport;
              return (
                <button
                  key={s.key}
                  onClick={() => selectSport(s.key)}
                  style={{
                    background: "none",
                    border: "none",
                    borderBottom: `3px solid ${active ? theme.accent : "transparent"}`,
                    color: active ? theme.onDark : "rgba(247,245,239,0.7)",
                    fontFamily: font.display,
                    fontSize: 18,
                    letterSpacing: "0.06em",
                    padding: "0 0 0.7rem",
                    marginBottom: -3,
                    cursor: "pointer",
                  }}
                >
                  {s.icon} {s.label.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 920, margin: "0 auto", padding: "2.5rem clamp(1rem, 4vw, 2rem)" }}>
        <ErrorBanner message={error || notice} />

        <div style={{ background: theme.cream, color: theme.ink, borderRadius: 12, padding: "1.2rem", marginBottom: nameError ? 8 : 12 }}>
          <label htmlFor="new-tournament-name" style={{ display: "block", fontSize: 14, fontWeight: 600, color: theme.muted, marginBottom: 8 }}>
            New {theme.label.toLowerCase()} tournament
          </label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              id="new-tournament-name"
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? "new-tournament-error" : undefined}
              value={newName}
              onChange={handleNameChange}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder={theme.placeholder}
              disabled={creating}
              style={{
                flex: "1 1 220px",
                padding: "0.6rem 0.8rem",
                borderRadius: 8,
                border: nameError ? "1.5px solid #e2a13a" : "1.5px solid #d8d4c8",
                fontSize: 14,
                transition: "border-color 0.15s",
              }}
            />
            <button
              onClick={handleCreate}
              disabled={creating}
              style={{ flex: "1 0 auto", minHeight: 44, background: theme.accent, color: theme.accentInk, border: "none", borderRadius: 8, padding: "0.6rem 1.3rem", fontWeight: 700, cursor: "pointer", fontSize: 14, whiteSpace: "nowrap" }}
            >
              {creating ? "Creating…" : "Create tournament"}
            </button>
          </div>
          {nameError && (
            <p id="new-tournament-error" style={{ color: "#8a5a1b", fontSize: 14, margin: "8px 2px 0" }}>
              {nameError}
            </p>
          )}
          <label htmlFor="new-tournament-league" style={{ display: "block", fontSize: 13, fontWeight: 600, color: theme.muted, margin: "12px 0 6px" }}>
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
            style={{ width: "100%", minHeight: 44, padding: "0.5rem 0.7rem", borderRadius: 8, border: "1.5px solid #d8d4c8", fontSize: 14, background: "#fff" }}
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

        {/* Playing rather than organising: the team's code links you to your place in it. */}
        <button
          onClick={onJoinTeam}
          className="pressable"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%", minHeight: 48, background: theme.surfaceOnDark, color: theme.onDark, border: `1px solid ${theme.borderOnDark}`, borderRadius: 10, padding: "0.7rem 1.1rem", fontSize: 14, cursor: "pointer", marginBottom: 24, textAlign: "left" }}
        >
          <span><strong>Join a team</strong> <span style={{ color: theme.onDarkMuted }}>· got a code from an organiser or a team’s admin?</span></span>
          <span aria-hidden="true">→</span>
        </button>

        {/* Watching someone else's: public tournaments by name or code (6E). */}
        <button
          onClick={onFindTournament}
          className="pressable"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%", minHeight: 48, background: theme.surfaceOnDark, color: theme.onDark, border: `1px solid ${theme.borderOnDark}`, borderRadius: 10, padding: "0.7rem 1.1rem", fontSize: 14, cursor: "pointer", marginTop: -14, marginBottom: 24, textAlign: "left" }}
        >
          <span><strong>Find tournaments and people</strong> <span style={{ color: theme.onDarkMuted }}>· follow a tournament, or a player</span></span>
          <span aria-hidden="true">→</span>
        </button>

        {/* Leagues the person runs (2026-11-24): a league with no season yet is reached here. */}
        {leagues.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <h2 style={{ fontFamily: font.condensed, fontSize: 18, letterSpacing: "0.2em", color: theme.onDarkMuted, margin: "0 0 8px", fontWeight: 600 }}>LEAGUES YOU RUN</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {leagues.map((l) => (
                <button
                  key={l.leagueId}
                  type="button"
                  className="pressable"
                  onClick={() => onOpenLeague?.(l.leagueId)}
                  style={{ display: "flex", alignItems: "center", gap: 12, background: theme.cream, color: theme.ink, border: "none", borderRadius: 10, padding: "0.8rem 1.1rem", cursor: "pointer", textAlign: "left" }}
                >
                  {l.logoUrl ? (
                    <img src={pictureSrc(l.logoUrl)} alt="" width={40} height={40} style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", background: theme.accent, color: theme.accentInk, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                      {l.shortName}
                    </span>
                  )}
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ display: "block", fontWeight: 600 }}>{l.name}</strong>
                    <span style={{ fontSize: 13, color: theme.muted }}>{l.line}</span>
                  </span>
                  <span aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Lasting teams (C-22): the ones I run or play for, and "Make a team". */}
        <MyTeams sport={sport} theme={theme} onOpenClub={onOpenClub} />

        {loading && <p style={{ color: theme.onDarkMuted }}>Loading…</p>}

        {!loading && tournaments.length > 0 && (
          <div role="group" aria-label="Show tournaments" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
            {FILTERS.map((f) => {
              const on = filter === f.key;
              const count = f.key === "all" ? tournaments.length : tournaments.filter((t) => phaseOf(t) === f.key).length;
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilter(f.key)}
                  style={{
                    minHeight: 36,
                    background: on ? theme.accent : "rgba(247,245,239,0.1)",
                    color: on ? theme.accentInk : theme.onDark,
                    border: on ? `1px solid ${theme.accent}` : "1px solid rgba(247,245,239,0.22)",
                    borderRadius: 999,
                    padding: "0.35rem 0.9rem",
                    fontSize: 14,
                    fontWeight: on ? 700 : 500,
                    cursor: "pointer",
                  }}
                >
                  {f.label} <span style={{ opacity: 0.75 }}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {!loading && filter !== "all" && tournaments.length > 0 && !tournaments.some((t) => phaseOf(t) === filter) && (
          <p style={{ color: theme.onDarkMuted, fontSize: 14 }}>
            {FILTER_EMPTY[filter]}{" "}
            <button type="button" onClick={() => setFilter("all")} style={{ background: "none", border: "none", color: theme.accent, textDecoration: "underline", cursor: "pointer", fontSize: 14, padding: 0 }}>
              Show all
            </button>
          </p>
        )}

        {SECTIONS.map((section) => {
          const rows = tournaments.filter((t) => section.match(t) && (filter === "all" || phaseOf(t) === filter));
          if (rows.length === 0) return null;
          return (
            <section key={section.key} style={{ marginBottom: 22 }}>
              <h2 style={{ fontFamily: font.condensed, fontSize: 18, letterSpacing: "0.2em", color: theme.onDarkMuted, margin: "0 0 8px", fontWeight: 600 }}>
                {section.title}
              </h2>
              <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {rows.map((t, i) => {
                  const chip = statusChip(t, theme);
                  const range = dateRange(t);
                  const role = roleLabel(t.myRoles);
                  return (
                    <button
                      key={t.id}
                      className="pressable"
                      onClick={() => onSelectTournament(t.id, t.hasSchedule, t.isStarted, t.sport, t.name)}
                      style={{
                        "--i": i,
                        background: theme.cream,
                        color: theme.ink,
                        border: "none",
                        textAlign: "left",
                        gap: 12,
                        borderRadius: 10,
                        padding: "1rem 1.2rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        opacity: section.key === "past" ? 0.85 : 1,
                      }}
                    >
                      {/* The tournament's logo when it has one (HLD P-26). */}
                      {t.logoUrl && (
                        <img src={pictureSrc(t.logoUrl)} alt="" width={44} height={44} style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 16, overflowWrap: "anywhere" }}>{theme.icon} {t.name}</div>
                        <div style={{ fontSize: 12, color: theme.muted }}>
                          {t.league && <>Season {t.league.season} · </>}
                          {range ?? `Created ${new Date(t.createdAt).toLocaleDateString()}`}
                          {role && <> · {role}</>}
                        </div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", padding: "0.3rem 0.7rem", borderRadius: 6, background: chip.bg, color: chip.fg }}>
                        {chip.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
        {!loading && tournaments.length === 0 && (
          <p style={{ color: theme.onDarkMuted, fontSize: 14 }}>
            No {theme.label.toLowerCase()} tournaments yet. Create one above, join a team with its code — or ask an
            organiser to add you using the email you signed in with.
          </p>
        )}
      </main>
    </div>
  );
}
