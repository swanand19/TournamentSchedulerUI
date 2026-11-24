import { useEffect, useState } from "react";
import { createClub, listMyClubs } from "../api/clubsApi";
import { font } from "../theme";
import { Errors, Logo } from "./parts";
import { button, input, plural, useRun } from "./style";

// Home's "Your teams" (C-22): the lasting teams the person runs or plays for, in the sport chosen above, and "Make a
// team" (name, where it plays, "I play for it"). The maker is its first admin; its page opens straight away.

export default function MyTeams({ sport, theme, onOpenClub }) {
  const [clubs, setClubs] = useState(null);
  const [making, setMaking] = useState(false);
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [iPlay, setIPlay] = useState(true);
  const r = useRun();

  useEffect(() => {
    r.run("load", async () => setClubs(await listMyClubs()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const make = async (e) => {
    e.preventDefault();
    const club = await r.run("make", () => createClub({ name: name.trim(), sport, area: area.trim() || null, iPlay }));
    if (club) onOpenClub(club.clubId);
  };

  const rows = (clubs ?? []).filter((c) => c.sport === sport);
  const cardTheme = { ...theme, onDark: theme.ink, surfaceOnDark: "#EDEAE0", borderOnDark: "#e0dccf" };
  return (
    <section style={{ marginBottom: 26 }} aria-labelledby="my-teams-title">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, margin: "0 0 8px" }}>
        <h2 id="my-teams-title" style={{ fontFamily: font.condensed, fontSize: 18, letterSpacing: "0.2em", color: theme.onDarkMuted, margin: 0, fontWeight: 600 }}>
          YOUR TEAMS{clubs ? ` · ${rows.length}` : ""}
        </h2>
        {!making && (
          <button onClick={() => setMaking(true)} style={{ background: "none", border: `1px solid ${theme.borderOnDark}`, color: theme.onDark, borderRadius: 999, minHeight: 36, padding: "0.3rem 0.9rem", cursor: "pointer", fontSize: 14 }}>
            + Make a team
          </button>
        )}
      </div>
      <Errors message={r.error} />
      {making && (
        <form onSubmit={make} style={{ background: theme.cream, color: theme.ink, borderRadius: 12, padding: "1rem 1.2rem", display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
          <strong>A {theme.label.toLowerCase()} team that lasts</strong>
          <span style={{ fontSize: 14, color: theme.muted }}>Keep your players once and enter tournament after tournament with them. You’ll be its first admin.</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input aria-label="Team name" placeholder="Team name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} style={input} autoFocus />
            <input aria-label="Where it plays (optional)" placeholder="Where it plays, e.g. Pune" value={area} onChange={(e) => setArea(e.target.value)} maxLength={60} style={input} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 40 }}>
            <input type="checkbox" checked={iPlay} onChange={(e) => setIPlay(e.target.checked)} style={{ width: 20, height: 20 }} />
            I play for this team
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" disabled={!name.trim() || !!r.busy} style={button(theme)}>{r.busy === "make" ? "Making…" : "Make the team"}</button>
            <button type="button" onClick={() => setMaking(false)} style={button(theme, "secondary")}>Cancel</button>
          </div>
        </form>
      )}
      {clubs && rows.length === 0 && !making && (
        <p style={{ color: theme.onDarkMuted, fontSize: 14, margin: 0 }}>
          No {theme.label.toLowerCase()} teams yet. Make one for the group you play with, or join one with its code.
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((c) => (
          <button key={c.clubId} onClick={() => onOpenClub(c.clubId)} className="pressable" style={{ display: "flex", alignItems: "center", gap: 12, background: theme.cream, color: theme.ink, border: "none", borderRadius: 10, padding: "0.8rem 1rem", cursor: "pointer", textAlign: "left" }}>
            <Logo link={c.logoUrl} name={c.name} size={40} theme={cardTheme} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ display: "block" }}>{c.name}</strong>
              <span style={{ fontSize: 13, color: theme.muted }}>
                {[c.area, plural(c.players, "player"), plural(c.tournaments, "tournament"), c.isAdmin ? "you run it" : "you play"].filter(Boolean).join(" · ")}
              </span>
            </span>
            {c.live > 0 && <span style={{ fontSize: 12, fontWeight: 700, padding: "0.25rem 0.6rem", borderRadius: 6, background: "rgba(66,133,244,0.15)", color: "#2b5fb8" }}>In play</span>}
            <span aria-hidden="true">→</span>
          </button>
        ))}
      </div>
    </section>
  );
}
