import { useCallback, useEffect, useMemo, useState } from "react";
import { font, themeFor, syncDocumentSport } from "../theme";
import ErrorBanner from "../ErrorBanner";
import Modal from "../Modal";
import MatchList from "../MatchList";
import MatchWatch from "../watch/MatchWatch";
import Knockouts from "../Knockouts";
import TournamentStats from "../TournamentStats";
import CricketStats from "../cricket/CricketStats";
import { usePoll } from "../watch/usePoll";
import { SourceContext, publicSource } from "../api/source";
import { getPublicMatches, getPublicPlayer, getPublicTournament } from "../api/publicApi";
import { getSession } from "../auth/session";

// A public tournament (6E) for anyone with its link, no account needed: its matches, table and stats,
// knockouts, and every match through the same viewer the app uses. Outside the sign-in gate (main.jsx).
// Its own small set of addresses under /live/<code>: /stats, /knockout, /match/<id>.

const TABS = [
  { key: "matches", label: "Matches" },
  { key: "stats", label: "Table & stats" },
  { key: "knockout", label: "Knockouts" },
];

function parse(pathname) {
  const [, , code = "", what, id] = pathname.split("/");
  if (what === "match" && /^\d+$/.test(id ?? "")) return { code, tab: "matches", matchId: Number(id) };
  return { code, tab: ["stats", "knockout"].includes(what) ? what : "matches", matchId: null };
}

const pathOf = ({ code, tab, matchId }) =>
  `/live/${code}${matchId ? `/match/${matchId}` : tab === "matches" ? "" : `/${tab}`}`;

const dateLine = (t) => {
  if (!t?.startDate) return "";
  const day = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  return t.startDate === t.endDate || !t.endDate ? day(t.startDate) : `${day(t.startDate)} – ${day(t.endDate)}`;
};

const STATUS = { Upcoming: "Not started yet", Live: "In play", Completed: "Completed", Cancelled: "Cancelled" };

export default function LiveTournament() {
  const [place, setPlace] = useState(() => parse(window.location.pathname));
  const { code } = place;
  const source = useMemo(() => publicSource(code), [code]);
  const [tournament, setTournament] = useState(null);
  const [error, setError] = useState("");
  const [player, setPlayer] = useState(null); // { name, sports } | { error }

  useEffect(() => {
    let live = true;
    getPublicTournament(code)
      .then((t) => {
        if (!live) return;
        setTournament(t);
        document.title = `${t.name} · Live scores`;
        syncDocumentSport(t.sport);
      })
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [code]);

  // Back and Forward walk this page's own addresses.
  useEffect(() => {
    const onPop = () => setPlace(parse(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = (next) => {
    const target = { ...place, ...next };
    if (pathOf(target) !== window.location.pathname) window.history.pushState(null, "", pathOf(target));
    setPlace(target);
    window.scrollTo(0, 0);
  };

  const loadMatches = useCallback(() => getPublicMatches(code), [code]);
  const matches = usePoll(loadMatches, 15000, !!tournament?.isStarted && !place.matchId);

  const openPlayer = useCallback(
    async (playerId) => {
      setPlayer({ loading: true });
      try {
        setPlayer(await getPublicPlayer(code, playerId));
      } catch (e) {
        setPlayer({ error: e.message });
      }
    },
    [code]
  );

  const sport = tournament?.sport ?? "Football";
  const theme = themeFor(sport);
  const signedIn = !!getSession();
  const tabs = TABS.filter((x) => x.key !== "knockout" || tournament?.hasKnockouts);

  const page = { minHeight: "100vh", background: theme.background, color: theme.onDark, fontFamily: font.body, paddingBottom: "4rem" };
  const main = { maxWidth: 1040, margin: "0 auto", padding: "2rem clamp(1rem, 4vw, 2rem)" };

  if (error) {
    return (
      <div style={page}>
        <main style={{ ...main, maxWidth: 560 }}>
          <h1 style={{ fontFamily: font.display, fontSize: 30, margin: "1rem 0" }}>LIVE SCORES</h1>
          <ErrorBanner message={error} />
          <a href="/" style={{ color: theme.accent, fontWeight: 600 }}>Go to Tournament Scheduler</a>
        </main>
      </div>
    );
  }

  return (
    <SourceContext.Provider value={source}>
      <div style={page}>
        <header style={{ padding: "2rem clamp(1rem, 4vw, 2rem) 1.5rem", borderBottom: `3px solid ${theme.borderOnDark}` }}>
          <div style={{ maxWidth: 1040, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
            <div>
              <p style={{ fontFamily: font.condensed, fontSize: 18, letterSpacing: "clamp(0.12em, 0.9vw, 0.3em)", color: theme.accent, margin: 0, fontWeight: 600 }}>
                {theme.label.toUpperCase()} · LIVE SCORES
              </p>
              <h1 style={{ fontFamily: font.display, fontSize: "clamp(2rem, 8vw, 3rem)", margin: "0.2rem 0 0", lineHeight: 1.05, textTransform: "uppercase", overflowWrap: "anywhere" }}>
                {tournament?.name ?? "Loading…"}
              </h1>
              {tournament && (
                <p style={{ margin: "6px 0 0", color: theme.onDarkMuted, fontSize: 14 }}>
                  {[STATUS[tournament.status], dateLine(tournament)].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            {tournament && (
              <a
                href={`/follow/${code}`}
                style={{ minHeight: 44, display: "inline-flex", alignItems: "center", background: theme.accent, color: theme.accentInk, borderRadius: 8, padding: "0 1.1rem", fontWeight: 700, fontSize: 14, textDecoration: "none" }}
              >
                {signedIn ? "Follow in the app" : "Sign in to follow"}
              </a>
            )}
          </div>
        </header>

        <main style={main}>
          {!tournament ? (
            <p style={{ color: theme.onDarkMuted }}>Loading…</p>
          ) : place.matchId ? (
            <div className="view-in">
              <MatchWatch
                key={place.matchId}
                sport={sport}
                matchId={place.matchId}
                canScore={false}
                onBack={() => go({ matchId: null, tab: "matches" })}
                onOpenScoring={() => {}}
                onOpenPlayer={openPlayer}
              />
            </div>
          ) : (
            <>
              <div role="tablist" style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: `1px solid ${theme.borderOnDark}`, overflowX: "auto" }}>
                {tabs.map((x) => {
                  const on = place.tab === x.key;
                  return (
                    <button
                      key={x.key}
                      role="tab"
                      aria-selected={on}
                      onClick={() => go({ tab: x.key, matchId: null })}
                      style={{ background: "transparent", color: on ? theme.accent : theme.onDarkMuted, border: "none", borderBottom: `3px solid ${on ? theme.accent : "transparent"}`, padding: "0.6rem 1rem", minHeight: 44, fontSize: 15, cursor: "pointer", fontFamily: font.display, letterSpacing: "0.04em", whiteSpace: "nowrap" }}
                    >
                      {x.label.toUpperCase()}
                    </button>
                  );
                })}
              </div>

              {place.tab === "matches" && (
                <div className="view-in">
                  {!tournament.isStarted ? (
                    <p style={{ color: theme.onDarkMuted }}>The matches appear here once the organisers start the tournament.</p>
                  ) : (
                    <>
                      <ErrorBanner message={matches.error} />
                      <MatchList
                        matches={matches.data ?? []}
                        loading={!matches.data && !matches.error}
                        tournamentStarted
                        canScore={false}
                        onWatchMatch={(id) => go({ matchId: id })}
                        onOpenKnockouts={tournament.hasKnockouts ? () => go({ tab: "knockout" }) : null}
                        onStartTournament={() => {}}
                        onStartMatch={() => {}}
                        onEnterMatch={() => {}}
                        onBack={null}
                        sport={sport}
                      />
                    </>
                  )}
                </div>
              )}

              {place.tab === "stats" && (
                <div className="view-in">
                  {sport === "Cricket" ? (
                    <CricketStats tournamentId={tournament.id} onOpenPlayer={openPlayer} />
                  ) : (
                    <TournamentStats tournamentId={tournament.id} onOpenPlayer={openPlayer} />
                  )}
                </div>
              )}

              {place.tab === "knockout" && (
                <div className="view-in">
                  <Knockouts
                    tournamentId={tournament.id}
                    sport={sport}
                    tournament={tournament}
                    started={tournament.isStarted}
                    canEdit={false}
                    canScore={false}
                    teams={[]}
                    onBack={null}
                    onOpenMatch={(f) => f.matchId && go({ matchId: f.matchId })}
                  />
                </div>
              )}
            </>
          )}
        </main>

        {player && (
          <Modal labelledBy="public-player" onClose={() => setPlayer(null)} panelStyle={{ background: theme.cream, color: theme.ink, borderRadius: 14, padding: "1.25rem", width: "min(420px, 100%)" }}>
            {player.loading ? (
              <p style={{ margin: 0 }}>Loading…</p>
            ) : player.error ? (
              <p id="public-player" style={{ margin: 0 }}>{player.error}</p>
            ) : (
              <>
                <h2 id="public-player" style={{ fontFamily: font.display, fontSize: 24, margin: "0 0 12px" }}>{player.name.toUpperCase()}</h2>
                <div style={{ display: "grid", gap: 8 }}>
                  {player.sports.filter((s) => s.matches > 0).map((s) => (
                    <div key={s.sport} style={{ background: theme.tint, borderRadius: 10, padding: "0.7rem 0.9rem" }}>
                      <div style={{ fontWeight: 700 }}>{s.sport}</div>
                      <div style={{ fontSize: 14, color: theme.muted }}>
                        {[`${s.matches} match${s.matches === 1 ? "" : "es"}`, ...s.headline.map((h) => `${h.value} ${h.label.toLowerCase()}`)].join(" · ")}
                      </div>
                    </div>
                  ))}
                  {player.sports.every((s) => s.matches === 0) && <p style={{ margin: 0, fontSize: 14 }}>No completed matches yet.</p>}
                </div>
                <button onClick={() => setPlayer(null)} style={{ marginTop: 16, minHeight: 44, width: "100%", background: theme.deep, color: theme.cream, border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>
                  Close
                </button>
              </>
            )}
          </Modal>
        )}
      </div>
    </SourceContext.Provider>
  );
}
