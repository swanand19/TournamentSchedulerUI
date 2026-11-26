import { useRef, useState } from "react";
import { joinTeam, previewJoin } from "./api/teamsApi";
import { joinClub, previewClubJoin } from "./api/clubsApi";
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

// A lasting team's code is eight characters (step 2): the same field takes it, and joining opens the team's page. Nine
// is a tournament's entry code, which is for a team's admin, so the screen says where it goes instead.

export default function JoinTeam({ onBack, onJoined, onJoinedClub }) {
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
    const typed = code.replace(/[\s-]/g, "").length;
    if (typed === 9) {
      setError("That’s a tournament’s entry code, for a team’s admin: open your team from Home and choose Enter a tournament.");
      return;
    }
    if (typed === 8) {
      run("look", async () => {
        const club = await previewClubJoin(code);
        const where = [`${club.sport} team`, club.area].filter(Boolean).join(" · ");
        setPreview({ club: true, clubId: club.clubId, sport: club.sport, teamName: club.name, tournamentName: where, places: club.places.map((p) => ({ playerId: p.clubPlayerId, name: p.name, detail: p.detail })) });
      });
      return;
    }
    run("look", async () => setPreview(await previewJoin(code)));
  };

  const join = (playerId, label) =>
    run(label, async () => {
      if (preview?.club) {
        const joined = await joinClub(code, playerId);
        onJoinedClub(joined.clubId);
        return;
      }
      const joined = await joinTeam(code, playerId);
      onJoined(joined);
    });

  return (
    <div style={{ color: theme.onDark, paddingBottom: "4rem" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "14px clamp(1rem, 4vw, 2rem) 0" }}>
        <button type="button" className="kc-link" onClick={onBack} style={{ minHeight: 40, fontWeight: 500 }}>
          ← Your tournaments
        </button>
        <h1 className="kc-title" style={{ margin: "0.5rem 0 0" }}>Join a team</h1>
      </div>

      <main style={{ maxWidth: 560, margin: "0 auto", padding: "1.25rem clamp(1rem, 4vw, 2rem)" }}>
        <ErrorBanner message={error} />

        {!preview ? (
          <form onSubmit={look} style={{ background: theme.cream, color: theme.ink, borderRadius: 12, padding: "1.2rem" }}>
            <label htmlFor="join-code" style={{ display: "block", fontSize: 14, fontWeight: 600, color: theme.muted, marginBottom: 8 }}>
              Code from the organiser or the team’s admin
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
                maxLength={10}
                disabled={!!busy}
                style={{ flex: "1 1 180px", padding: "0.6rem 0.8rem", borderRadius: 8, border: "1.5px solid var(--line)", fontSize: 20, fontFamily: font.condensed, letterSpacing: "0.2em" }}
              />
              <button type="submit" disabled={!code.trim() || !!busy} style={{ ...button, background: theme.accent, color: theme.accentInk, opacity: code.trim() ? 1 : 0.5 }}>
                {busy === "look" ? "Looking…" : "Find team"}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ background: theme.cream, color: theme.ink, borderRadius: 12, padding: "1.2rem" }}>
            <p style={{ margin: 0, fontSize: 14, color: theme.muted }}>{theme.icon} {preview.tournamentName}</p>
            <h2 style={{ fontFamily: font.display, fontSize: 26, margin: "0.2rem 0 1rem", overflowWrap: "anywhere" }}>{preview.teamName}</h2>

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
                      style={{ ...button, background: "var(--chip)", color: theme.ink, textAlign: "left", fontWeight: 600, display: "flex", justifyContent: "space-between", gap: 10 }}
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
