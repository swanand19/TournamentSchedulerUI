// What a failed request says to the person using the app.
//
// The API explains its own rules in plain text ("Minutes per half must be at least 1."), and
// those pass straight through: they already say what to fix. What gets translated is everything
// that doesn't: a bare status code, an ASP.NET problem-details JSON body, an HTML error page, or
// fetch failing because the API isn't reachable at all.

function serverMessage(text) {
  const t = (text || "").trim();
  if (!t) return "";
  if (t.startsWith("<")) return ""; // an HTML error page
  if (t.startsWith("{")) {
    try {
      const body = JSON.parse(t);
      const firstFieldError = body.errors && Object.values(body.errors).flat()[0];
      return String(firstFieldError || body.detail || body.message || body.title || "");
    } catch {
      return t;
    }
  }
  return t;
}

function messageFor(status, text) {
  const server = serverMessage(text);
  if (status >= 500) {
    // Keep a short, deliberate message; hide stack traces and exception dumps.
    const readable = server && server.length < 200 && !server.includes("\n");
    return readable ? server : "The server ran into a problem. Wait a moment and try again.";
  }
  if (status === 404) return server || "That item no longer exists. Go back and reload the list.";
  if (status === 409) return server || "Something changed since this screen loaded. Reload it and try again.";
  return server || `The request was refused (error ${status}). Reload the page and try again.`;
}

/** The Error to throw for a response that wasn't ok. */
export async function responseError(res) {
  return new Error(messageFor(res.status, await res.text()));
}

/** Also covers errors thrown before any response exists: the API is down or unreachable. */
export function describeError(message) {
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return "Can't reach the server. Check that the API is running and you're online, then try again.";
  }
  return message;
}
