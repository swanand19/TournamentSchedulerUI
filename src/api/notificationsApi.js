import { api } from "./client";

// Your inbox (phase 6D). Newest first; the words come from the server, and tournamentId / sport /
// matchId say where a notification leads.

/** { items: [{ notificationId, kind, title, body, tournamentId, sport, matchId, createdAt, isRead }], unreadCount, hasMore } */
export const getNotifications = (before) => api.call("NOTIFICATION_LIST", { query: { before } });

/** { unreadCount } — what the bell on Home shows. */
export const getUnreadCount = () => api.call("NOTIFICATION_UNREAD");

/** { unreadCount } after marking it. */
export const markNotificationRead = (notificationId) => api.call("NOTIFICATION_READ", { routeParams: { notificationId } });

export const markAllNotificationsRead = () => api.call("NOTIFICATION_READ_ALL");
