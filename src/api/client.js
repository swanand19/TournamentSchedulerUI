import { clearSession } from "../auth/session";
import { ApiError, apiError, unreachable, unreadableAnswer } from "./errors";
import { API_BASE } from "./apiBase";
import { openResponse, sealRequest } from "./gateway";
import { SERVICES } from "./services";

// The one way the website talks to the API: api.call("SERVICE_ID", { routeParams, query, body }).
// The page modules in src/api/ are thin wrappers over it; components never see fetch, URLs, keys
// or the response envelope.
//
// Every call goes through the secure gateway: the request is encrypted for the server's public key
// and posted to {VITE_API_BASE_URL}/gateway, and the answer comes back encrypted for this request
// alone (see gateway.js). Inside, the answer is the usual { status: { isSuccess, message,
// statusCode }, data }; callers get `data`, and a failure throws an ApiError carrying `status.message`.

const GATEWAY_URL = `${API_BASE}/gateway`;
const KNOWN = new Set(SERVICES);

function isEnvelope(body) {
  return (
    body !== null &&
    typeof body === "object" &&
    "data" in body &&
    typeof body.status === "object" &&
    body.status !== null &&
    typeof body.status.isSuccess === "boolean"
  );
}

async function call(serviceRequestId, { routeParams, query, body } = {}) {
  if (!KNOWN.has(serviceRequestId)) throw new Error(`Unknown service ${serviceRequestId} — add it to src/api/services.js.`);

  const definedQuery = Object.fromEntries(Object.entries(query ?? {}).filter(([, v]) => v !== undefined && v !== null));
  const sealed = sealRequest(serviceRequestId, { routeParams, query: definedQuery, body });

  // A phone on mobile data keeps an idle connection the carrier has already dropped; the first post
  // down it fails before any answer, and browsers don't retry a POST by themselves. So one quick
  // retry of the very same sealed request: safe even for scoring, because its requestUUID is
  // single-use - if the first copy did arrive, the server refuses this one as a replay.
  const post = () =>
    fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sealed.envelope),
    });
  let res;
  let text;
  try {
    try {
      res = await post();
    } catch {
      if (typeof navigator !== "undefined" && navigator.onLine === false) throw new Error("offline");
      await new Promise((resolve) => setTimeout(resolve, 400));
      res = await post();
    }
    text = await res.text();
  } catch {
    sealed.contentKey.fill(0);
    throw unreachable();
  }

  let outer = null;
  try {
    outer = text ? JSON.parse(text) : null;
  } catch {
    // Not JSON (a proxy's error page, say): errors.js words it from the status alone.
  }

  let envelope;
  try {
    envelope = openResponse(outer, sealed.contentKey);
  } catch {
    throw unreadableAnswer(res.status);
  } finally {
    sealed.contentKey.fill(0);
  }

  // Refused before decryption: the gateway could only answer in the clear.
  if (envelope === undefined) throw apiError(res.status, text);

  if (!res.ok || (isEnvelope(envelope) && !envelope.status.isSuccess)) {
    const error = apiError(res.status, JSON.stringify(envelope));
    // Signed out on the server (signed out elsewhere, expired, blocked): back to the sign-in
    // screen, which shows why.
    if (res.status === 401) clearSession(error.message);
    throw error;
  }
  return isEnvelope(envelope) ? envelope.data : envelope;
}

export const api = { call };
export { ApiError };
