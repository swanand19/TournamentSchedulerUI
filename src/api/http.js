import { responseError } from "./errors";

// How every API call reads its answer. The API wraps each response as
//   { status: { isSuccess, message, statusCode }, data }
// so callers get `data`, and a failure throws an Error carrying `status.message` (see errors.js).
// A body without the envelope (a server from before it) is returned as it is, so the website and
// the API can be updated in either order.

export async function handleResponse(res) {
  if (!res.ok) throw await responseError(res);
  if (res.status === 204) return null;
  const body = await res.json();
  return isEnvelope(body) ? body.data : body;
}

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
