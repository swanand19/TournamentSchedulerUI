import { useEffect, useRef, useState } from "react";
import {
  addMember, cancelInvite, completeTournament, getMembers, getTournament, leaveTournament, removeMember, resendInvite, updateTournament,
} from "./api/tournamentsApi";
import { publicLinkFor, unfollowTournament } from "./api/publicApi";
import ErrorBanner from "./ErrorBanner";
import PictureField from "./PictureField";
import { removeTournamentPicture, setTournamentPicture } from "./api/picturesApi";
import { font, themeFor } from "./theme";
import { formatPhone, useAuthOptions } from "./useAuthOptions";

// A tournament's people and settings: its name and dates, completing it, its owners and scorers
// (added by email or mobile number; someone with no account yet gets an invite, listed here for
// owners to send again or cancel), and leaving. What each person may do comes from the
// tournament's `access` block — the server decides; this screen only shows the buttons it allows.

const card = (theme) => ({ background: theme.cream, color: theme.ink, borderRadius: 12, padding: "1.2rem", marginBottom: 16 });
const heading = { fontFamily: font.display, fontSize: 18, margin: "0 0 10px", letterSpacing: "0.02em" };
const input = { width: "100%", boxSizing: "border-box", padding: "0.55rem 0.7rem", borderRadius: 8, border: "1.5px solid #d8d4c8", fontSize: 14 };
const button = (bg, fg, extra = {}) => ({
  minHeight: 44, background: bg, color: fg, border: "none", borderRadius: 8, padding: "0.55rem 1.1rem",
  fontWeight: 700, fontSize: 14, cursor: "pointer", ...extra,
});

/** "16 Oct 2026" from a UTC timestamp the API may send without its Z. */
const day = (value) =>
  new Date(/Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const shown = (invite) => (invite.channel === "Sms" ? formatPhone(invite.contact) : invite.contact);

const STATUS_TEXT = {
  Upcoming: "Not started yet.",
  Live: "In play.",
  Completed: "Completed — nothing can be started or changed any more.",
  Cancelled: "Cancelled — it never started and its dates have passed.",
};

export default function TournamentPeople({ tournament, sport, onBack, onChanged, onLeft }) {
  const theme = themeFor(sport);
  const access = tournament.access ?? {};
  const [people, setPeople] = useState(null); // { members, invites, notice }
  const [notice, setNotice] = useState("");
  const options = useAuthOptions();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const inFlight = useRef(false);

  const [name, setName] = useState(tournament.name);
  const [startDate, setStartDate] = useState(tournament.startDate ?? "");
  const [endDate, setEndDate] = useState(tournament.endDate ?? "");
  const [contact, setContact] = useState("");
  const [role, setRole] = useState("Scorer");

  useEffect(() => {
    let live = true;
    getMembers(tournament.id).then((p) => live && setPeople(p)).catch((e) => live && setError(e.message));
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

  const show = (p) => {
    setPeople(p);
    setNotice(p.notice ?? "");
  };

  const add = (e) => {
    e.preventDefault();
    setNotice("");
    run("add", async () => {
      show(await addMember(tournament.id, contact.trim(), role));
      setContact("");
    });
  };

  const remove = (m) => {
    if (!window.confirm(`Remove ${m.name} from this tournament?`)) return;
    run(`remove-${m.userId}`, async () => show(await removeMember(tournament.id, m.userId)));
  };

  const resend = (i) => {
    setNotice("");
    run(`resend-${i.inviteId}`, async () => show(await resendInvite(tournament.id, i.inviteId)));
  };

  const cancel = (i) => {
    if (!window.confirm(`Cancel the invite to ${shown(i)}? Signing up with it won't add them any more.`)) return;
    run(`cancel-${i.inviteId}`, async () => show(await cancelInvite(tournament.id, i.inviteId)));
  };

  const leave = () => {
    if (!window.confirm(`Leave ${tournament.name}? It disappears from your list until an owner adds you again.`)) return;
    run("leave", async () => {
      await leaveTournament(tournament.id);
      onLeft();
    });
  };

  // Public live scores (6E): every tournament is public (2026-11-23) with one link for good; everyone may copy it.
  const link = publicLinkFor(tournament.share);
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy here. Select the link and copy it yourself.");
    }
  };

  // A follower who is nothing more is gone from it afterwards; a player who also follows stays.
  const unfollow = () =>
    run("unfollow", async () => {
      await unfollowTournament(tournament.id);
      if (access.canLeave) onChanged(await getTournament(tournament.id));
      else onLeft();
    });

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

      {/* --- Pictures (HLD P-26): a logo beside the name, a banner across the top ---------- */}
      {access.canEdit && (
        <section style={card(theme)} aria-labelledby="pictures-title">
          <h2 id="pictures-title" style={heading}>PICTURES</h2>
          {[
            { kind: "logo", label: "Logo", shape: "square", hint: "Square. Shown beside the name on everyone's Home.", link: tournament.logoUrl },
            { kind: "banner", label: "Banner", shape: "banner", hint: "Landscape, 16:9. Shown across the top of the tournament, and on its public page.", link: tournament.bannerUrl },
          ].map((p) => (
            <PictureField
              key={p.kind}
              label={p.label}
              hint={p.hint}
              shape={p.shape}
              link={p.link}
              name={tournament.name}
              upload={(image) => setTournamentPicture(tournament.id, p.kind, image)}
              remove={() => removeTournamentPicture(tournament.id, p.kind)}
              onChanged={(url) => onChanged({ ...tournament, [`${p.kind}Url`]: url })}
              theme={theme}
            />
          ))}
        </section>
      )}

      {/* --- Public live scores (6E) ----------------------------------- */}
      {/* Every tournament is public (2026-11-23); only an admin can hide one, which takes the link away. */}
        <div style={card(theme)}>
          <h2 style={heading}>PUBLIC LIVE SCORES</h2>
          <p style={{ fontSize: 14, color: theme.muted, margin: 0 }}>
            {tournament.isPublic
              ? "Anyone can watch this tournament with its link: scores, tables, stats and knockouts, no account needed. People can also find it by name once its schedule or knockout stage is set. No emails or numbers are shown."
              : "KickCricket has hidden this tournament from the public, so only the people in it can see it."}
          </p>
          {link && (
            <div style={{ marginTop: 12 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: theme.muted }}>
                Link
                <input readOnly value={link} onFocus={(e) => e.target.select()} style={{ ...input, marginTop: 4 }} />
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <button type="button" onClick={copyLink} style={button(theme.deep, theme.cream)}>
                  {copied ? "Copied" : "Copy link"}
                </button>
                <a href={link} target="_blank" rel="noreferrer" style={{ ...button("transparent", theme.deep, { border: `1.5px solid ${theme.deep}` }), display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
                  Open
                </a>
              </div>
              <p style={{ fontSize: 12, color: theme.muted, margin: "8px 0 0" }}>Code {tournament.share.code}</p>
            </div>
          )}
        </div>

      {/* --- People ----------------------------------------------------- */}
      <div style={card(theme)}>
        <h2 style={heading}>OWNERS AND SCORERS</h2>
        <p style={{ fontSize: 13, color: theme.muted, margin: "0 0 12px" }}>
          Owners run the tournament. Scorers can only set up and score matches.
        </p>

        {!people && !error && <p style={{ fontSize: 14, color: theme.muted }}>Loading…</p>}
        {people && (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {people.members.map((m) => (
              <li key={m.userId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.6rem 0", borderTop: "1px solid #ece8dc" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, overflowWrap: "anywhere" }}>
                    {m.name}{m.isMe && <span style={{ color: theme.muted, fontWeight: 400 }}> (you)</span>}
                  </div>
                  {(m.email || m.phone) && (
                    <div style={{ fontSize: 12, color: theme.muted, overflowWrap: "anywhere" }}>{[m.email, formatPhone(m.phone)].filter(Boolean).join(" · ")}</div>
                  )}
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

        {people?.invites.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: theme.muted, margin: "0 0 4px" }}>Invited, no account yet</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {people.invites.map((i) => (
                <li key={i.inviteId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.6rem 0", borderTop: "1px solid #ece8dc", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, overflowWrap: "anywhere" }}>{shown(i)}</div>
                    <div style={{ fontSize: 12, color: i.isExpired ? theme.warnInk : theme.muted }}>
                      {i.role} · {i.isExpired ? `expired ${day(i.expiresAt)}` : `sent ${day(i.sentAt)}, works until ${day(i.expiresAt)}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => cancel(i)} disabled={!!busy} style={button("transparent", theme.muted, { border: "1.5px solid #d8d4c8", padding: "0.4rem 0.8rem" })}>
                      Cancel
                    </button>
                    <button onClick={() => resend(i)} disabled={!!busy} style={button("transparent", theme.ink, { border: "1.5px solid #d8d4c8", padding: "0.4rem 0.8rem" })}>
                      {busy === `resend-${i.inviteId}` ? "Sending…" : "Send again"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {notice && (
          <p role="status" style={{ fontSize: 14, lineHeight: 1.45, margin: "12px 0 0", padding: "0.6rem 0.8rem", borderRadius: 8, background: theme.tint }}>
            {notice}
          </p>
        )}

        {access.canManageMembers && (
          <form onSubmit={add} style={{ borderTop: "1px solid #e4e0d4", marginTop: 12, paddingTop: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <label style={{ flex: "2 1 220px", fontSize: 13, fontWeight: 600, color: theme.muted }}>
              {options.phone ? "Add someone by email or mobile number" : "Add someone by email"}
              <input
                type={options.phone ? "text" : "email"}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder={options.phone ? "friend@example.com or 98765 43210" : "friend@example.com"}
                disabled={!!busy}
                style={{ ...input, marginTop: 4 }}
              />
            </label>
            <label style={{ flex: "1 1 120px", fontSize: 13, fontWeight: 600, color: theme.muted }}>
              As
              <select value={role} onChange={(e) => setRole(e.target.value)} disabled={!!busy} style={{ ...input, marginTop: 4 }}>
                <option value="Scorer">Scorer</option>
                <option value="Owner">Owner</option>
              </select>
            </label>
            <button type="submit" disabled={!!busy || !contact.trim()} style={button(theme.deep, theme.cream)}>
              {busy === "add" ? "Adding…" : "Add"}
            </button>
            <p style={{ flex: "1 1 100%", fontSize: 12, color: theme.muted, margin: 0 }}>
              No account yet? We'll send them an invite, and they join as soon as they sign up.
            </p>
          </form>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {access.canLeave && (
          <button onClick={leave} disabled={!!busy} style={button("transparent", "#F7F5EF", { border: "1px solid rgba(247,245,239,0.35)" })}>
            {busy === "leave" ? "Leaving…" : "Leave this tournament"}
          </button>
        )}
        {access.isFollowing && (
          <button onClick={unfollow} disabled={!!busy} style={button("transparent", "#F7F5EF", { border: "1px solid rgba(247,245,239,0.35)" })}>
            {busy === "unfollow" ? "Stopping…" : "Stop following"}
          </button>
        )}
      </div>
    </div>
  );
}
