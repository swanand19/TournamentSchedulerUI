import { useRef, useState } from "react";
import { followTournament, searchPublicTournaments } from "./api/publicApi";
import ErrorBanner from "./ErrorBanner";
import { font, themeFor } from "./theme";

// Finding a public tournament to follow (6E): by its name (3 letters or more), or its code or link.
// Only tournaments their owners made public are found. Several may share a name, so each shows its
// sport, dates, status and number of teams. Following opens it; one already followed or played in
// just opens.

const button = { minHeight: 44, border: "none", borderRadius: 8, padding: "0.6rem 1.2rem", fontWeight: 700, fontSize: 14, cursor: "pointer" };

const STATUS = { Upcoming: "Not started yet", Live: "In play", Completed: "Completed", Cancelled: "Cancelled" };

const dates = (r) => {
  if (!r.startDate) return null;
  const day = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  return r.startDate === r.endDate || !r.endDate ? day(r.startDate) : `${day(r.startDate)} – ${day(r.endDate)}`;
};

export default function FindTournament({ onBack, onOpen }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const inFlight = useRef(false);
  const theme = themeFor("Football");

  const run = async (label, action) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(label);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e.message);
    } finally {
      inFlight.current = false;
      setBusy("");
    }
  };

  const search = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    run("search", async () => setResults(await searchPublicTournaments(query.trim())));
  };

  const follow = (r) =>
    run(`f-${r.tournamentId}`, async () => {
      if (!r.isFollowing && !r.isMine) await followTournament(r.code);
      onOpen(r.tournamentId);
    });

  return (
    <div style={{ minHeight: "100vh", background: theme.background, fontFamily: font.body, color: theme.onDark, paddingBottom: "4rem" }}>
      <header style={{ padding: "2.5rem clamp(1rem, 4vw, 2rem) 2rem", borderBottom: `3px solid ${theme.borderOnDark}` }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: theme.onDarkMuted, cursor: "pointer", fontSize: 14, padding: 0, minHeight: 44 }}>
            ← Your tournaments
          </button>
          <h1 style={{ fontFamily: font.display, fontSize: "clamp(2rem, 8vw, 3rem)", margin: "0.2rem 0 0", lineHeight: 1 }}>FIND A TOURNAMENT</h1>
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "2rem clamp(1rem, 4vw, 2rem)" }}>
        <form onSubmit={search} style={{ background: theme.cream, color: theme.ink, borderRadius: 12, padding: "1.2rem", marginBottom: 20 }}>
          <label htmlFor="find-query" style={{ display: "block", fontSize: 14, fontWeight: 600, color: theme.muted, marginBottom: 8 }}>
            Tournament name, code or link
          </label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              id="find-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Monsoon Cup"
              autoComplete="off"
              spellCheck={false}
              disabled={!!busy}
              style={{ flex: "1 1 220px", padding: "0.6rem 0.8rem", borderRadius: 8, border: "1.5px solid #d8d4c8", fontSize: 16 }}
            />
            <button type="submit" disabled={!query.trim() || !!busy} style={{ ...button, background: theme.accent, color: theme.accentInk, opacity: query.trim() ? 1 : 0.5 }}>
              {busy === "search" ? "Searching…" : "Search"}
            </button>
          </div>
          <p style={{ fontSize: 13, color: theme.muted, margin: "8px 0 0" }}>Only tournaments their organisers have made public show up.</p>
        </form>

        <ErrorBanner message={error} />

        {results && results.length === 0 && (
          <p style={{ color: theme.onDarkMuted, fontSize: 14 }}>
            No public tournament matches that. Check the spelling, or ask the organiser for its code.
          </p>
        )}

        {results && results.length > 0 && (
          <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {results.map((r, i) => {
              const t = themeFor(r.sport);
              const line = [r.sport, STATUS[r.status], dates(r), `${r.teams} team${r.teams === 1 ? "" : "s"}`].filter(Boolean).join(" · ");
              const opens = r.isFollowing || r.isMine;
              return (
                <div key={r.tournamentId} style={{ "--i": i, background: t.cream, color: t.ink, borderRadius: 10, padding: "1rem 1.2rem", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, overflowWrap: "anywhere" }}>{t.icon} {r.name}</div>
                    <div style={{ fontSize: 13, color: t.muted, marginTop: 2 }}>{line}</div>
                    {opens && <div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>{r.isMine ? "Already on your list" : "You follow it"}</div>}
                  </div>
                  <button onClick={() => follow(r)} disabled={!!busy} style={{ ...button, background: opens ? "transparent" : t.deep, color: opens ? t.deep : t.cream, border: opens ? `1.5px solid ${t.deep}` : "none" }}>
                    {busy === `f-${r.tournamentId}` ? "Opening…" : opens ? "Open" : "Follow"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
