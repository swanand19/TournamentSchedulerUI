import { useRef, useState } from "react";
import { joinTeam, previewJoin } from "./api/teamsApi";
import ErrorBanner from "./ErrorBanner";
import { font, themeFor } from "./theme";

// Joining a team with the code its organiser shared: type the code, see the team and the names in
// it nobody has claimed, tap yours — or join as a new player. Instant; the server keeps it to one
// team per tournament.

const button = {
  minHeight: 44,
  border: "none",
  borderRadius: 8,
  padding: "0.6rem 1.2rem",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

export default function JoinTeam({ onBack, onJoined }) {
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const inFlight = useRef(false);

  const theme = themeFor(preview?.sport ?? "Football");

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

  const look = (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    run("look", async () => setPreview(await previewJoin(code)));
  };

  const join = (playerId, label) =>
    run(label, async () => {
      const joined = await joinTeam(code, playerId);
      onJoined(joined);
    });

  return (
    <div style={{ minHeight: "100vh", background: theme.background, fontFamily: font.body, color: theme.onDark, paddingBottom: "4rem" }}>
      <header style={{ padding: "2.5rem clamp(1rem, 4vw, 2rem) 2rem", borderBottom: `3px solid ${theme.borderOnDark}` }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: theme.onDarkMuted, cursor: "pointer", fontSize: 14, padding: 0, minHeight: 44 }}>
            ← Your tournaments
          </button>
          <h1 style={{ fontFamily: font.display, fontSize: "clamp(2rem, 8vw, 3rem)", margin: "0.2rem 0 0", lineHeight: 1 }}>JOIN A TEAM</h1>
        </div>
      </header>

      <main style={{ maxWidth: 560, margin: "0 auto", padding: "2rem clamp(1rem, 4vw, 2rem)" }}>
        <ErrorBanner message={error} />

        {!preview ? (
          <form onSubmit={look} style={{ background: theme.cream, color: theme.ink, borderRadius: 12, padding: "1.2rem" }}>
            <label htmlFor="join-code" style={{ display: "block", fontSize: 14, fontWeight: 600, color: theme.muted, marginBottom: 8 }}>
              Team code from the organiser
            </label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                id="join-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. K7MQ2D"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={8}
                disabled={!!busy}
                style={{ flex: "1 1 180px", padding: "0.6rem 0.8rem", borderRadius: 8, border: "1.5px solid #d8d4c8", fontSize: 20, fontFamily: font.condensed, letterSpacing: "0.2em" }}
              />
              <button type="submit" disabled={!code.trim() || !!busy} style={{ ...button, background: theme.accent, color: theme.accentInk, opacity: code.trim() ? 1 : 0.5 }}>
                {busy === "look" ? "Looking…" : "Find team"}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ background: theme.cream, color: theme.ink, borderRadius: 12, padding: "1.2rem" }}>
            <p style={{ margin: 0, fontSize: 14, color: theme.muted }}>{theme.icon} {preview.tournamentName}</p>
            <h2 style={{ fontFamily: font.display, fontSize: 26, margin: "0.2rem 0 1rem", overflowWrap: "anywhere" }}>{preview.teamName.toUpperCase()}</h2>

            {preview.places.length > 0 && (
              <>
                <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>Are you one of these?</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                  {preview.places.map((p) => (
                    <button
                      key={p.playerId}
                      className="pressable"
                      onClick={() => join(p.playerId, `p-${p.playerId}`)}
                      disabled={!!busy}
                      style={{ ...button, background: "#EDEAE0", color: theme.ink, textAlign: "left", fontWeight: 600, display: "flex", justifyContent: "space-between", gap: 10 }}
                    >
                      <span style={{ overflowWrap: "anywhere" }}>
                        {p.name}
                        {p.detail && <span style={{ color: theme.muted, fontWeight: 400 }}> · {p.detail}</span>}
                      </span>
                      <span style={{ color: theme.muted, fontWeight: 400, whiteSpace: "nowrap" }}>{busy === `p-${p.playerId}` ? "Joining…" : "That's me"}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <button onClick={() => join(null, "new")} disabled={!!busy} style={{ ...button, background: theme.accent, color: theme.accentInk, width: "100%" }}>
              {busy === "new" ? "Joining…" : preview.places.length > 0 ? "I'm not listed — join as a new player" : "Join as a new player"}
            </button>
            <button onClick={() => { setPreview(null); setError(""); }} disabled={!!busy} style={{ ...button, background: "transparent", color: theme.muted, width: "100%", marginTop: 8 }}>
              Use a different code
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
