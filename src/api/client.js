import { ApiError, apiError, unreachable, unreadableAnswer } from "./errors";
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

const GATEWAY_URL = `${(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "")}/gateway`;
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

  let res;
  let text;
  try {
    res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sealed.envelope),
    });
    text = await res.text();
  } catch {
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
    throw apiError(res.status, JSON.stringify(envelope));
  }
  return isEnvelope(envelope) ? envelope.data : envelope;
}

export const api = { call };
export { ApiError };
