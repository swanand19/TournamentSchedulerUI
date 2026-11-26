import { useEffect, useState } from "react";
import { createClub, listMyClubs } from "../api/clubsApi";
import { Errors, Logo } from "./parts";
import { plural, useRun } from "./style";
import { ChevronIcon, PlusIcon } from "../ui/icons";

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
  return (
    <section aria-labelledby="my-teams-title">
      <div className="kc-sechd" style={{ marginTop: 26 }}>
        <h2 id="my-teams-title" className="kc-h2">Your teams</h2>
        {!making && (
          <button type="button" className="kc-btn sm sec" onClick={() => setMaking(true)}>
            <PlusIcon size={18} /> Make a team
          </button>
        )}
      </div>
      <Errors message={r.error} />
      {making && (
        <form onSubmit={make} className="kc-pane" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
          <strong style={{ fontWeight: "var(--w-strong)" }}>A {theme.label.toLowerCase()} team that lasts</strong>
          <span className="kc-cap">Keep your players once and enter tournament after tournament with them. You’ll be its first admin.</span>
          <input className="kc-field" aria-label="Team name" placeholder="Team name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus />
          <input className="kc-field" aria-label="Where it plays (optional)" placeholder="Where it plays, e.g. Pune" value={area} onChange={(e) => setArea(e.target.value)} maxLength={60} />
          <label style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 40 }}>
            <input type="checkbox" checked={iPlay} onChange={(e) => setIPlay(e.target.checked)} style={{ width: 20, height: 20, accentColor: "var(--accent)" }} />
            I play for this team
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="kc-btn pri" disabled={!name.trim() || !!r.busy}>{r.busy === "make" ? "Making…" : "Make the team"}</button>
            <button type="button" className="kc-btn sec" onClick={() => setMaking(false)}>Cancel</button>
          </div>
        </form>
      )}
      {clubs && rows.length === 0 && !making && (
        <p className="kc-cap" style={{ margin: 0 }}>
          No {theme.label.toLowerCase()} teams yet. Make one for the group you play with, or join one with its code.
        </p>
      )}
      {rows.length > 0 && (
        <div className="kc-rows">
          {rows.map((c) => (
            <button key={c.clubId} type="button" onClick={() => onOpenClub(c.clubId)} className="kc-row pressable" style={{ padding: "12px 16px" }}>
              <Logo link={c.logoUrl} name={c.name} size={40} theme={theme} />
              <span className="kc-grow">
                <span className="nm" style={{ fontSize: 16 }}>{c.name}</span>
                <span className="kc-cap">
                  {[c.area, plural(c.players, "player"), c.isAdmin ? "you run it" : "you play"].filter(Boolean).join(" · ")}
                </span>
              </span>
              {c.live > 0 && (
                <span className="kc-status">
                  <span className="kc-dot" aria-hidden="true" /> In play
                </span>
              )}
              <ChevronIcon />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
