import { useCallback, useEffect, useRef, useState } from "react";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "./api/notificationsApi";
import ErrorBanner from "./ErrorBanner";
import { FollowButton } from "./people/PeopleBits";
import { font, themeFor } from "./theme";

// The inbox (phase 6D): what happened that concerns you — scoring handovers, being added to a
// tournament or a team, invites taken up, a tournament ready to complete or reaching its end date.
// Newest first, a page at a time. Clicking one marks it read and opens what it's about. Chips (2026-11-23): All ·
// Social · Scoring · Tournaments · Teams with their unread counts; Social news has Follow back or Watch live.

const CHIPS = ["All", "Social", "Scoring", "Tournaments", "Teams"];

const SYMBOLS = {
  ScoringRequested: "✋",
  ScoringAllowed: "✓",
  ScoringDeclined: "✕",
  ScoringTakenOver: "⇄",
  AddedToTournament: "+",
  InviteAccepted: "✉",
  LinkedToTeam: "★",
  AllMatchesPlayed: "⚑",
  EndDateReminder: "◷",
  Social: "♥",
};

const parseUtc = (v) => (v ? new Date(/Z$|[+-]\d{2}:\d{2}$/.test(v) ? v : `${v}Z`) : null);

function ago(value) {
  const date = parseUtc(value);
  if (!date) return "";
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  return date.toLocaleDateString();
}

const button = {
  minHeight: 44,
  border: "none",
  borderRadius: 8,
  padding: "0.6rem 1.2rem",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

export default function Notifications({ onBack, onOpen }) {
  const theme = themeFor("Football");
  const [items, setItems] = useState(null);
  const [chip, setChip] = useState("All");
  const [counts, setCounts] = useState(null);
  const category = chip === "All" ? undefined : chip;
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const inFlight = useRef(false);

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

  const load = useCallback(async () => {
    setError("");
    try {
      const page = await getNotifications(undefined, category);
      setItems(page.items);
      setHasMore(page.hasMore);
      setCounts({ All: page.unreadCount, ...page.unreadByCategory });
    } catch (e) {
      setError(e.message);
    }
  }, [category]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const older = () =>
    run("older", async () => {
      const page = await getNotifications(items.at(-1).notificationId, category);
      setItems((now) => [...now, ...page.items]);
      setHasMore(page.hasMore);
    });

  const readAll = () =>
    run("all", async () => {
      await markAllNotificationsRead();
      setItems((now) => now.map((n) => ({ ...n, isRead: true })));
    });

  const open = (n) => {
    if (!n.isRead) {
      setItems((now) => now.map((x) => (x.notificationId === n.notificationId ? { ...x, isRead: true } : x)));
      // Not waited for: opening shouldn't hang on it.
      markNotificationRead(n.notificationId).catch(() => {});
    }
    if (n.tournamentId != null || n.clubId != null || n.profileUserId != null || n.leagueId != null) onOpen(n);
  };

  const unread = items ? items.filter((n) => !n.isRead).length : 0;

  return (
    <div style={{ color: theme.onDark, paddingBottom: "4rem" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "14px clamp(1rem, 4vw, 2rem) 0" }}>
        <button type="button" className="kc-link" onClick={onBack} style={{ minHeight: 40, fontWeight: 500 }}>
          ← Your tournaments
        </button>
        <h1 className="kc-title" style={{ margin: "0.5rem 0 0" }}>Notifications</h1>
      </div>

      <main style={{ maxWidth: 560, margin: "0 auto", padding: "1.25rem clamp(1rem, 4vw, 2rem)", display: "flex", flexDirection: "column", gap: 12 }}>
        <div role="tablist" aria-label="Kinds of notification" className="kc-chips" style={{ flexWrap: "nowrap", overflowX: "auto", paddingBottom: 2 }}>
          {CHIPS.map((c) => {
            const on = c === chip;
            const n = counts?.[c] ?? 0;
            return (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setItems(null);
                  setChip(c);
                }}
                className="kc-chip"
                style={{ flex: "none" }}
              >
                {c}
                {n > 0 && <span style={{ minWidth: 20, height: 20, borderRadius: 10, padding: "0 6px", display: "inline-grid", placeItems: "center", fontSize: 12, fontWeight: 600, background: theme.accent, color: theme.accentInk }}>{n}</span>}
              </button>
            );
          })}
        </div>
        <ErrorBanner message={error} />
        {error && !items && (
          <button onClick={load} style={{ ...button, background: theme.accent, color: theme.accentInk, alignSelf: "flex-start" }}>
            Try again
          </button>
        )}

        {!items ? (
          !error && [0, 1, 2].map((i) => <div key={i} style={{ height: 72, borderRadius: 18, background: "var(--chip)" }} />)
        ) : items.length === 0 ? (
          <div style={{ border: `1.5px dashed ${theme.borderOnDark}`, borderRadius: 14, padding: "2rem 1.2rem", textAlign: "center" }}>
            <p style={{ fontWeight: 700, fontSize: 18, margin: "0 0 6px" }}>Nothing yet</p>
            <p style={{ color: theme.onDarkMuted, margin: 0, fontSize: 14 }}>
              {chip === "Social"
                ? "When someone follows you, or someone you follow starts a match you can watch, it shows up here."
                : "You'll hear here when someone asks to take over your scoring, adds you to a tournament or a team, or a tournament of yours needs finishing."}
            </p>
          </div>
        ) : (
          <>
            {unread > 0 && (
              <button
                onClick={readAll}
                disabled={!!busy}
                style={{ ...button, background: "transparent", border: `1px solid ${theme.borderOnDark}`, color: theme.onDark, alignSelf: "flex-start" }}
              >
                {busy === "all" ? "Marking…" : "Mark all as read"}
              </button>
            )}
            {items.map((n) => (
              <div key={n.notificationId} style={{ borderRadius: 12, background: n.isRead ? "var(--chip)" : theme.cream, color: theme.ink }}>
              <button
                className="pressable"
                onClick={() => open(n)}
                aria-label={`${n.isRead ? "" : "Unread. "}${n.title}. ${n.body} ${ago(n.createdAt)}`}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  textAlign: "left",
                  width: "100%",
                  border: "none",
                  borderRadius: 12,
                  padding: "0.9rem 1rem",
                  background: "transparent",
                  color: theme.ink,
                  cursor: n.tournamentId != null || n.profileUserId != null || n.clubId != null || n.leagueId != null ? "pointer" : "default",
                  fontFamily: font.body,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    background: n.isRead ? theme.cream : theme.tint,
                    color: theme.deep,
                    fontWeight: 700,
                  }}
                >
                  {SYMBOLS[n.kind] ?? "•"}
                </span>
                <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  {chip === "All" && <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, color: theme.deep }}>{n.category}</span>}
                  <span style={{ fontSize: 15, fontWeight: n.isRead ? 500 : 700, overflowWrap: "anywhere" }}>{n.title}</span>
                  <span style={{ fontSize: 13, color: theme.muted, overflowWrap: "anywhere" }}>{n.body}</span>
                  <span style={{ fontSize: 12, color: theme.muted }}>{ago(n.createdAt)}</span>
                </span>
                {!n.isRead && <span aria-hidden="true" style={{ flexShrink: 0, width: 10, height: 10, borderRadius: 5, marginTop: 6, background: theme.accent }} />}
              </button>
              {n.kind === "Social" && (n.matchId != null || n.profileUserId != null) && (
                <div style={{ padding: "0 1rem 0.9rem 64px", display: "flex", gap: 8 }}>
                  {n.matchId != null ? (
                    <button type="button" onClick={() => open(n)} style={{ ...button, minHeight: 36, padding: "0 14px", borderRadius: 999, background: theme.accent, color: theme.accentInk }}>
                      ▶ Watch live
                    </button>
                  ) : (
                    <FollowButton userId={n.profileUserId} name={n.title.replace(/ started following you$/, "")} state={{ isFollowing: false, followsMe: true }} theme={theme} />
                  )}
                </div>
              )}
              </div>
            ))}
            {hasMore && (
              <button
                onClick={older}
                disabled={!!busy}
                style={{ ...button, background: "transparent", border: `1px solid ${theme.borderOnDark}`, color: theme.onDark }}
              >
                {busy === "older" ? "Loading…" : "Show older"}
              </button>
            )}
          </>
        )}
      </main>
    </div>
  );
}
