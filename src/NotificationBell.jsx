import { useEffect, useState } from "react";
import { getUnreadCount } from "./api/notificationsApi";

// The bell on Home: how many notifications are unread, asked for every 30 seconds while the tab is
// visible (and at once when it becomes visible again). Opens the inbox.

const POLL_MS = 30_000;

export default function NotificationBell({ theme, onOpen }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      getUnreadCount()
        .then((r) => alive && setCount(r?.unreadCount ?? 0))
        .catch(() => {}); // the bell just keeps its last count; Home shows real errors
    };
    check();
    const timer = setInterval(check, POLL_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  return (
    <button
      onClick={onOpen}
      aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
      style={{
        position: "relative",
        background: theme.surfaceOnDark,
        border: `1px solid ${theme.borderOnDark}`,
        color: theme.onDark,
        borderRadius: 999,
        width: 44,
        height: 44,
        padding: 0,
        cursor: "pointer",
        flexShrink: 0,
        display: "inline-grid",
        placeItems: "center",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {count > 0 && (
        <span
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            minWidth: 20,
            height: 20,
            borderRadius: 999,
            padding: "0 5px",
            boxSizing: "border-box",
            background: theme.accent,
            color: theme.accentInk,
            fontSize: 12,
            fontWeight: 700,
            lineHeight: "20px",
            textAlign: "center",
          }}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
