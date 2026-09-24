import { useState, useEffect } from "react";
import { getTournaments, createTournament } from "./api/tournamentsApi";
import { font, SPORTS, themeFor, syncDocumentSport } from "./theme";
import ErrorBanner from "./ErrorBanner";

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

export default function Home({ onSelectTournament }) {
  const [sport, setSport] = useState(loadStoredSport);
  const [tournaments, setTournaments] = useState([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");

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
      const t = await createTournament(name, sport);
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
          <p style={{ fontFamily: font.condensed, fontSize: 18, letterSpacing: "0.35em", color: theme.accent, margin: 0, fontWeight: 600 }}>
            MATCHDAY SCHEDULER
          </p>
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
        <ErrorBanner message={error} />

        <div style={{ background: theme.cream, color: theme.ink, borderRadius: 12, padding: "1.2rem", marginBottom: nameError ? 8 : 24 }}>
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
              style={{ flex: "1 0 auto", background: theme.accent, color: theme.accentInk, border: "none", borderRadius: 8, padding: "0.6rem 1.3rem", fontWeight: 700, cursor: "pointer", fontSize: 14, whiteSpace: "nowrap" }}
            >
              {creating ? "Creating…" : "Create tournament"}
            </button>
          </div>
          {nameError && (
            <p id="new-tournament-error" style={{ color: "#8a5a1b", fontSize: 14, margin: "8px 2px 0" }}>
              {nameError}
            </p>
          )}
        </div>

        {loading && <p style={{ color: theme.onDarkMuted }}>Loading…</p>}

        <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {tournaments.map((t, i) => (
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
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{theme.icon} {t.name}</div>
                <div style={{ fontSize: 12, color: theme.muted }}>
                  Created {new Date(t.createdAt).toLocaleDateString()}
                </div>
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  padding: "0.3rem 0.7rem",
                  borderRadius: 6,
                  background: t.isStarted
                    ? "rgba(66,133,244,0.15)"
                    : t.hasSchedule
                    ? "rgba(99,153,34,0.15)"
                    : "rgba(242,169,59,0.15)",
                  color: t.isStarted ? "#2b5fb8" : t.hasSchedule ? theme.successInk : "#8a4b1b",
                }}
              >
                {t.isStarted ? "Tournament started" : t.hasSchedule ? "Schedule ready" : "Setup in progress"}
              </span>
            </button>
          ))}
          {!loading && tournaments.length === 0 && (
            <p style={{ color: theme.onDarkMuted, fontSize: 14 }}>
              No {theme.label.toLowerCase()} tournaments yet. Create your first one above.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
