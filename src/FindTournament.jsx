import { useRef, useState } from "react";
import { followTournament, searchPublicTournaments } from "./api/publicApi";
import { searchPeople } from "./api/peopleApi";
import { PersonRow } from "./people/PeopleBits";
import ErrorBanner from "./ErrorBanner";
import { themeFor } from "./theme";

// Finding a public tournament to follow (6E): by its name (3 letters or more), or its code or link.
// Every tournament is public, but found by name only once its schedule or knockout stage is set. Several may share a name, so each shows its
// sport, dates, status and number of teams. Following opens it; one already followed or played in
// just opens. The People tab (2026-11-23) finds players by name to follow.

const button = { minHeight: 44, border: "none", borderRadius: 8, padding: "0.6rem 1.2rem", fontWeight: 700, fontSize: 14, cursor: "pointer" };

const STATUS = { Upcoming: "Not started yet", Live: "In play", Completed: "Completed", Cancelled: "Cancelled" };

const dates = (r) => {
  if (!r.startDate) return null;
  const day = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  return r.startDate === r.endDate || !r.endDate ? day(r.startDate) : `${day(r.startDate)} – ${day(r.endDate)}`;
};

export default function FindTournament({ onBack, onOpen, onOpenPerson }) {
  const [tab, setTab] = useState("tournaments");
  const [people, setPeople] = useState(null);
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
    if (tab === "people") run("search", async () => setPeople(await searchPeople(query.trim())));
    else run("search", async () => setResults(await searchPublicTournaments(query.trim())));
  };
  const peopleShort = tab === "people" && query.trim().length < 3;

  const follow = (r) =>
    run(`f-${r.tournamentId}`, async () => {
      if (!r.isFollowing && !r.isMine) await followTournament(r.code);
      onOpen(r.tournamentId);
    });

  return (
    <div style={{ color: theme.onDark, paddingBottom: "4rem" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "14px clamp(1rem, 4vw, 2rem) 0" }}>
        <button type="button" className="kc-link" onClick={onBack} style={{ minHeight: 40, fontWeight: 500 }}>
          ← Your tournaments
        </button>
        <h1 className="kc-title" style={{ margin: "0.5rem 0 0" }}>Find</h1>
      </div>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "1.25rem clamp(1rem, 4vw, 2rem)" }}>
        <div role="tablist" aria-label="Find" className="kc-seg" style={{ marginBottom: 18 }}>
          {[["tournaments", "Tournaments"], ["people", "People"]].map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>
        <form onSubmit={search} style={{ background: theme.cream, color: theme.ink, borderRadius: 12, padding: "1.2rem", marginBottom: 20 }}>
          <label htmlFor="find-query" style={{ display: "block", fontSize: 14, fontWeight: 600, color: theme.muted, marginBottom: 8 }}>
            {tab === "people" ? "Their name" : "Tournament name, code or link"}
          </label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              id="find-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === "people" ? "e.g. Rohan" : "e.g. Monsoon Cup"}
              autoComplete="off"
              spellCheck={false}
              disabled={!!busy}
              style={{ flex: "1 1 220px", padding: "0.6rem 0.8rem", borderRadius: 8, border: "1.5px solid var(--line)", fontSize: 16 }}
            />
            <button type="submit" disabled={!query.trim() || peopleShort || !!busy} style={{ ...button, background: theme.accent, color: theme.accentInk, opacity: query.trim() && !peopleShort ? 1 : 0.5 }}>
              {busy === "search" ? "Searching…" : "Search"}
            </button>
          </div>
          <p style={{ fontSize: 13, color: theme.muted, margin: "8px 0 0" }}>
            {tab === "people"
              ? "Players on KickCricket, by name (three letters or more). Following someone tells you when they start a match you can watch."
              : "Tournaments show up here once their schedule or knockout stage is set. A code or link finds any."}
          </p>
        </form>

        <ErrorBanner message={error} />

        {tab === "people" && people && people.length === 0 && (
          <p style={{ color: theme.onDarkMuted, fontSize: 14 }}>Nobody who plays has that name. Check the spelling, or try part of it.</p>
        )}
        {tab === "people" && people && people.length > 0 && (
          <div style={{ background: theme.cream, color: theme.ink, borderRadius: 12, padding: "0.4rem 1.2rem" }}>
            {people.map((p) => (
              <PersonRow key={p.userId} person={p} theme={theme} onOpen={() => onOpenPerson(p.userId)} />
            ))}
          </div>
        )}

        {tab === "tournaments" && results && results.length === 0 && (
          <p style={{ color: theme.onDarkMuted, fontSize: 14 }}>
            No tournament matches that. Check the spelling, or ask the organiser for its code or link.
          </p>
        )}

        {tab === "tournaments" && results && results.length > 0 && (
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
                  <button onClick={() => follow(r)} disabled={!!busy} style={{ ...button, background: opens ? "transparent" : t.accent, color: opens ? t.accent : t.cream, border: opens ? `1.5px solid ${t.deep}` : "none" }}>
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
