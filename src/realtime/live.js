import { HubConnectionBuilder, HttpTransportType, HubConnectionState, LogLevel } from "@microsoft/signalr";
import { API_BASE } from "../api/apiBase";
import { getLiveTicket, unwatch, watchMatch, watchTournament } from "../api/liveApi";

// The live line (SignalR): the server nudges — "your inbox changed", "match 12 changed" — and the
// screen that cares fetches through the gateway as it always has. Nudges carry ids only, so nothing
// private travels outside the encrypted gateway.
//
// One line per tab, opened when the first screen subscribes and closed a little after the last one
// leaves. A one-minute ticket from LIVE_TICKET opens it (never the session token, which would sit in
// the address). If it can't open (no WebSockets on the server, say) or drops, screens keep polling,
// only slower while it's up; on every (re)connect each subscriber is told once, to catch up on
// anything missed.

const SERVER = API_BASE.replace(/\/api$/i, "");
const RETRY_MS = [0, 2000, 5000, 10000];
const STOP_AFTER_MS = 10_000;
const UNWATCH_AFTER_MS = 2000;

const topics = new Map(); // key -> { topic, listeners: Set<fn> }
const stateListeners = new Set();
let connection = null;
let connectionId = null;
let stopTimer = null;
let restartTimer = null;

const keyOf = (t) =>
  t.kind === "inbox" ? "inbox" : t.kind === "tournament" ? `t:${t.tournamentId}` : `m:${t.sport}:${t.matchId}`;

export const isLive = () => connectionId !== null;

function setConnected(id) {
  connectionId = id;
  stateListeners.forEach((fn) => fn(id !== null));
}

/** Asks the server to send this line nudges about the topic (the inbox needs no asking). */
function watch(topic) {
  if (!connectionId || topic.kind === "inbox") return;
  const call =
    topic.kind === "tournament"
      ? watchTournament(connectionId, topic.tournamentId)
      : watchMatch(connectionId, topic.sport, topic.matchId);
  call.catch(() => {}); // not allowed or line gone: polling carries on
}

function onHello(id) {
  setConnected(id);
  for (const { topic, listeners } of topics.values()) {
    watch(topic);
    listeners.forEach((fn) => fn()); // catch up on whatever happened while the line was down
  }
}

function onNudge(nudge) {
  const keys = nudge.kind === "inbox" ? ["inbox"] : [`t:${nudge.tournamentId}`];
  if (nudge.kind === "match") keys.push(`m:${nudge.sport}:${nudge.matchId}`);
  for (const key of keys) topics.get(key)?.listeners.forEach((fn) => fn());
}

function start() {
  clearTimeout(stopTimer);
  if (connection || !SERVER) return;
  const c = new HubConnectionBuilder()
    .withUrl(`${SERVER}/hubs/live`, {
      transport: HttpTransportType.WebSockets,
      skipNegotiation: true,
      accessTokenFactory: async () => (await getLiveTicket()).ticket,
    })
    .withAutomaticReconnect({ nextRetryDelayInMilliseconds: (ctx) => RETRY_MS[ctx.previousRetryCount] ?? 30_000 })
    .configureLogging(LogLevel.None)
    .build();
  c.on("hello", onHello);
  c.on("nudge", onNudge);
  c.onreconnecting(() => setConnected(null));
  c.onclose(() => {
    setConnected(null);
    if (connection === c) connection = null;
    if (topics.size) restartTimer = setTimeout(start, 30_000); // closed for good (or never opened): try again later
  });
  connection = c;
  c.start().catch(() => {
    if (connection === c) connection = null;
    if (topics.size) restartTimer = setTimeout(start, 30_000);
  });
}

function stopSoon() {
  clearTimeout(stopTimer);
  stopTimer = setTimeout(() => {
    if (topics.size) return;
    clearTimeout(restartTimer);
    const c = connection;
    connection = null;
    setConnected(null);
    if (c && c.state !== HubConnectionState.Disconnected) c.stop().catch(() => {});
  }, STOP_AFTER_MS);
}

/**
 * Calls `onNudge` whenever the topic changes — { kind: "inbox" }, { kind: "tournament", tournamentId }
 * or { kind: "match", sport: "football" | "cricket", matchId } — and once on every (re)connect.
 * Returns the unsubscribe.
 */
export function subscribe(topic, onNudge) {
  const key = keyOf(topic);
  let entry = topics.get(key);
  if (!entry) {
    entry = { topic, listeners: new Set() };
    topics.set(key, entry);
    watch(topic);
  }
  entry.listeners.add(onNudge);
  start();

  return () => {
    entry.listeners.delete(onNudge);
    if (entry.listeners.size) return;
    topics.delete(key);
    // A moment later, and only if nothing has subscribed again: leaving a screen and coming straight
    // back (or React mounting it twice) must not have its "stop" land after the new "watch".
    if (topic.kind !== "inbox") {
      const line = connectionId;
      setTimeout(() => {
        if (topics.has(key) || !line || line !== connectionId) return;
        unwatch(line, topic.kind === "tournament" ? { tournamentId: topic.tournamentId } : { sport: topic.sport, matchId: topic.matchId }).catch(() => {});
      }, UNWATCH_AFTER_MS);
    }
    if (!topics.size) stopSoon();
  };
}

/** Called with true / false as the line opens and closes. Returns the unsubscribe. */
export function onLiveChange(fn) {
  stateListeners.add(fn);
  return () => stateListeners.delete(fn);
}
