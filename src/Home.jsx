import { useState, useEffect } from "react";
import { getTournaments, createTournament } from "./api/tournamentsApi";

export default function Home({ onSelectTournament }) {
  const [tournaments, setTournaments] = useState([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const font = { display: "'Anton', sans-serif", body: "'Inter', sans-serif" };

  const load = async () => {
    setLoading(true);
    try {
      const data = await getTournaments();
      setTournaments(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

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
      const t = await createTournament(name);
      setNewName("");
      await load();
      onSelectTournament(t.id, false);
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
        background: "repeating-linear-gradient(180deg, #1B4332 0px, #1B4332 60px, #17402E 60px, #17402E 120px)",
        fontFamily: font.body,
        color: "#F7F5EF",
        paddingBottom: "4rem",
      }}
    >
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&family=Teko:wght@500;600&display=swap" />

      <header style={{ padding: "2.5rem 2rem 2rem", borderBottom: "3px solid rgba(247,245,239,0.15)" }}>
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
          <p style={{ fontFamily: "'Teko', sans-serif", fontSize: 18, letterSpacing: "0.35em", color: "#F2A93B", margin: 0, fontWeight: 600 }}>
            MATCHDAY SCHEDULER
          </p>
          <h1 style={{ fontFamily: font.display, fontSize: "3rem", margin: "0.2rem 0 0", lineHeight: 1 }}>
            YOUR TOURNAMENTS
          </h1>
        </div>
      </header>

      <main style={{ maxWidth: 920, margin: "0 auto", padding: "2.5rem 2rem" }}>
        {error && (
          <div style={{ background: "rgba(226,75,74,0.15)", border: "1px solid #e24b4a", padding: "0.8rem 1rem", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}

        <div style={{ background: "#F7F5EF", color: "#1B1B1B", borderRadius: 12, padding: "1.2rem", marginBottom: nameError ? 8 : 24 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={newName}
              onChange={handleNameChange}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="e.g. Summer Cup 2026"
              disabled={creating}
              style={{
                flex: 1,
                padding: "0.6rem 0.8rem",
                borderRadius: 8,
                border: nameError ? "1.5px solid #e2a13a" : "1.5px solid #d8d4c8",
                fontSize: 14,
                outline: "none",
                transition: "border-color 0.15s",
              }}
            />
            <button
              onClick={handleCreate}
              disabled={creating}
              style={{ background: "#F2A93B", color: "#1B1B1B", border: "none", borderRadius: 8, padding: "0.6rem 1.3rem", fontWeight: 700, cursor: "pointer", fontSize: 14 }}
            >
              {creating ? "Creating…" : "+ New tournament"}
            </button>
          </div>
          {nameError && (
            <p style={{ color: "#8a5a1b", fontSize: 13, margin: "8px 2px 0", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14 }}>⚠️</span> {nameError}
            </p>
          )}
        </div>

        {loading && <p style={{ color: "rgba(247,245,239,0.6)" }}>Loading…</p>}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {tournaments.map((t) => (
            <div
              key={t.id}
              onClick={() => onSelectTournament(t.id, t.hasSchedule, t.isStarted)}
              style={{
                background: "#F7F5EF",
                color: "#1B1B1B",
                borderRadius: 10,
                padding: "1rem 1.2rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>🏆 {t.name}</div>
                <div style={{ fontSize: 12, color: "#8a8677" }}>
                  Created {new Date(t.createdAt).toLocaleDateString()}
                </div>
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "0.3rem 0.7rem",
                  borderRadius: 6,
                  background: t.isStarted
                    ? "rgba(66,133,244,0.15)"
                    : t.hasSchedule
                    ? "rgba(99,153,34,0.15)"
                    : "rgba(242,169,59,0.15)",
                  color: t.isStarted ? "#2b5fb8" : t.hasSchedule ? "#3b6d11" : "#8a4b1b",
                }}
              >
                {t.isStarted ? "Tournament started" : t.hasSchedule ? "Schedule ready" : "Setup in progress"}
              </span>
            </div>
          ))}
          {!loading && tournaments.length === 0 && (
            <p style={{ color: "rgba(247,245,239,0.6)", fontSize: 14 }}>
              No tournaments yet. Create your first one above.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}