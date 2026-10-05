import { useEffect, useRef, useState } from "react";
import {
  addMember, completeTournament, getMembers, leaveTournament, removeMember, updateTournament,
} from "./api/tournamentsApi";
import ErrorBanner from "./ErrorBanner";
import { font, themeFor } from "./theme";

// A tournament's people and settings: its name and dates, completing it, its owners and scorers,
// and leaving. What each person may do comes from the tournament's `access` block — the server
// decides; this screen only shows the buttons it allows.

const card = (theme) => ({ background: theme.cream, color: theme.ink, borderRadius: 12, padding: "1.2rem", marginBottom: 16 });
const heading = { fontFamily: font.display, fontSize: 18, margin: "0 0 10px", letterSpacing: "0.02em" };
const input = { width: "100%", boxSizing: "border-box", padding: "0.55rem 0.7rem", borderRadius: 8, border: "1.5px solid #d8d4c8", fontSize: 14 };
const button = (bg, fg, extra = {}) => ({
  minHeight: 44, background: bg, color: fg, border: "none", borderRadius: 8, padding: "0.55rem 1.1rem",
  fontWeight: 700, fontSize: 14, cursor: "pointer", ...extra,
});

const STATUS_TEXT = {
  Upcoming: "Not started yet.",
  Live: "In play.",
  Completed: "Completed — nothing can be started or changed any more.",
  Cancelled: "Cancelled — it never started and its dates have passed.",
};

export default function TournamentPeople({ tournament, sport, onBack, onChanged, onLeft }) {
  const theme = themeFor(sport);
  const access = tournament.access ?? {};
  const [members, setMembers] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const inFlight = useRef(false);

  const [name, setName] = useState(tournament.name);
  const [startDate, setStartDate] = useState(tournament.startDate ?? "");
  const [endDate, setEndDate] = useState(tournament.endDate ?? "");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Scorer");

  useEffect(() => {
    let live = true;
    getMembers(tournament.id).then((m) => live && setMembers(m)).catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, [tournament.id]);

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

  const saveDetails = (e) => {
    e.preventDefault();
    run("details", async () => onChanged(await updateTournament(tournament.id, { name: name.trim(), startDate, endDate })));
  };

  const complete = () => {
    if (!window.confirm(`Mark ${tournament.name} complete?\n\nNothing can be started or changed afterwards. This can't be undone.`)) return;
    run("complete", async () => onChanged(await completeTournament(tournament.id)));
  };

  const add = (e) => {
    e.preventDefault();
    run("add", async () => {
      setMembers(await addMember(tournament.id, email.trim(), role));
      setEmail("");
    });
  };

  const remove = (m) => {
    if (!window.confirm(`Remove ${m.name} from this tournament?`)) return;
    run(`remove-${m.userId}`, async () => setMembers(await removeMember(tournament.id, m.userId)));
  };

  const leave = () => {
    if (!window.confirm(`Leave ${tournament.name}? It disappears from your list until an owner adds you again.`)) return;
    run("leave", async () => {
      await leaveTournament(tournament.id);
      onLeft();
    });
  };

  const detailsChanged = name.trim() !== tournament.name || startDate !== (tournament.startDate ?? "") || endDate !== (tournament.endDate ?? "");

  return (
    <div className="view-in">
      <button onClick={onBack} style={{ background: "rgba(247,245,239,0.1)", color: "#F7F5EF", border: "1px solid rgba(247,245,239,0.25)", borderRadius: 8, padding: "0.5rem 1rem", fontSize: 14, cursor: "pointer", marginBottom: 16, minHeight: 44 }}>
        ← Back
      </button>

      <ErrorBanner message={error} />

      {/* --- The tournament itself ------------------------------------ */}
      <form onSubmit={saveDetails} style={card(theme)}>
        <h2 style={heading}>TOURNAMENT</h2>
        <p style={{ fontSize: 14, margin: "0 0 12px", color: theme.muted }}>{STATUS_TEXT[tournament.status] ?? ""}</p>
        {access.canEdit ? (
          <>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: theme.muted, marginBottom: 10 }}>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} disabled={!!busy} style={{ ...input, marginTop: 4 }} />
            </label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <label style={{ flex: "1 1 150px", fontSize: 13, fontWeight: 600, color: theme.muted }}>
                Starts
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={!!busy} style={{ ...input, marginTop: 4 }} />
              </label>
              <label style={{ flex: "1 1 150px", fontSize: 13, fontWeight: 600, color: theme.muted }}>
                Ends
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={!!busy} style={{ ...input, marginTop: 4 }} />
              </label>
            </div>
            <p style={{ fontSize: 12, color: theme.muted, margin: "8px 0 12px" }}>
              Rain delay? Move the end date. It completes by itself the day after it ends.
            </p>
            <button type="submit" disabled={!!busy || !detailsChanged} style={button(theme.accent, theme.accentInk, { opacity: detailsChanged ? 1 : 0.5 })}>
              {busy === "details" ? "Saving…" : "Save"}
            </button>
          </>
        ) : (
          <p style={{ fontSize: 14, margin: 0 }}>
            {tournament.startDate ? `${tournament.startDate} to ${tournament.endDate}` : "No dates set."}
          </p>
        )}

        {access.canComplete && (
          <div style={{ borderTop: "1px solid #e4e0d4", marginTop: 16, paddingTop: 14 }}>
            <button type="button" onClick={complete} disabled={!!busy} style={button(theme.successSolid, "#fff")}>
              {busy === "complete" ? "Completing…" : "Mark tournament complete"}
            </button>
          </div>
        )}
        {!access.canComplete && access.canEdit && tournament.status === "Live" && (
          <p style={{ fontSize: 13, color: theme.muted, margin: "14px 0 0" }}>
            A match is being played. Finish it before completing the tournament.
          </p>
        )}
      </form>

      {/* --- People ----------------------------------------------------- */}
      <div style={card(theme)}>
        <h2 style={heading}>OWNERS AND SCORERS</h2>
        <p style={{ fontSize: 13, color: theme.muted, margin: "0 0 12px" }}>
          Owners run the tournament. Scorers can only set up and score matches.
        </p>

        {!members && !error && <p style={{ fontSize: 14, color: theme.muted }}>Loading…</p>}
        {members && (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {members.map((m) => (
              <li key={m.userId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.6rem 0", borderTop: "1px solid #ece8dc" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, overflowWrap: "anywhere" }}>
                    {m.name}{m.isMe && <span style={{ color: theme.muted, fontWeight: 400 }}> (you)</span>}
                  </div>
                  {m.email && <div style={{ fontSize: 12, color: theme.muted, overflowWrap: "anywhere" }}>{m.email}</div>}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, padding: "0.25rem 0.6rem", borderRadius: 6, background: m.role === "Scorer" ? "#EDEAE0" : theme.tint, whiteSpace: "nowrap" }}>
                  {m.role === "Creator" ? "Creator · Owner" : m.role}
                </span>
                {m.canRemove && (
                  <button onClick={() => remove(m)} disabled={!!busy} aria-label={`Remove ${m.name}`} style={button("transparent", theme.ink, { border: "1.5px solid #d8d4c8", padding: "0.4rem 0.8rem" })}>
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {access.canManageMembers && (
          <form onSubmit={add} style={{ borderTop: "1px solid #e4e0d4", marginTop: 12, paddingTop: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <label style={{ flex: "2 1 220px", fontSize: 13, fontWeight: 600, color: theme.muted }}>
              Add someone by the email they signed in with
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="friend@example.com" disabled={!!busy} style={{ ...input, marginTop: 4 }} />
            </label>
            <label style={{ flex: "1 1 120px", fontSize: 13, fontWeight: 600, color: theme.muted }}>
              As
              <select value={role} onChange={(e) => setRole(e.target.value)} disabled={!!busy} style={{ ...input, marginTop: 4 }}>
                <option value="Scorer">Scorer</option>
                <option value="Owner">Owner</option>
              </select>
            </label>
            <button type="submit" disabled={!!busy || !email.trim()} style={button(theme.deep, theme.cream)}>
              {busy === "add" ? "Adding…" : "Add"}
            </button>
          </form>
        )}
      </div>

      {access.canLeave && (
        <button onClick={leave} disabled={!!busy} style={button("transparent", "#F7F5EF", { border: "1px solid rgba(247,245,239,0.35)" })}>
          {busy === "leave" ? "Leaving…" : "Leave this tournament"}
        </button>
      )}
    </div>
  );
}
