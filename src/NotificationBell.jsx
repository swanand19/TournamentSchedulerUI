import { useCallback, useEffect, useRef, useState } from "react";
import { getUnreadCount } from "./api/notificationsApi";
import { LIVE_POLL_MS, useLive } from "./realtime/useLive";
import { BellIcon } from "./ui/icons";

// The bell in the top bar: how many notifications are unread — asked for at once when the live line says
// the inbox changed, and every 30 seconds while the tab is visible (every minute while the line is
// open, in case a nudge went missing; at once when the tab becomes visible again). Opens the inbox.

const POLL_MS = 30_000;
const INBOX = { kind: "inbox" };

export default function NotificationBell({ onOpen }) {
  const [count, setCount] = useState(0);
  const alive = useRef(true);

  const check = useCallback(() => {
    if (document.visibilityState !== "visible") return;
    getUnreadCount()
      .then((r) => alive.current && setCount(r?.unreadCount ?? 0))
      .catch(() => {}); // the bell just keeps its last count; Home shows real errors
  }, []);

  const live = useLive(INBOX, check);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    check();
    const timer = setInterval(check, live ? LIVE_POLL_MS : POLL_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [check, live]);

  return (
    <button type="button" onClick={onOpen} className="kc-ib kc-glass" aria-label={count > 0 ? `Inbox, ${count} unread` : "Inbox"}>
      <BellIcon />
      {count > 0 && <span className="kc-badge">{count > 99 ? "99+" : count}</span>}
    </button>
  );
}
