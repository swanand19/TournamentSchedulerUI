import { useState } from "react";

// A team's invite link (2026-11-23): its join code as an address. Whoever opens it joins straight in, after signing in
// or up. The server says when it stops working (`invite.note`); for an organiser looking at a lasting team's side
// there is only that note, because the link is the team's own admins' to share. WhatsApp opens its own share page
// with the message filled in; Share is the browser's own sheet where there is one (phones).
export default function InviteLink({ invite, teamName, buttonStyle, mutedColor }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  if (!invite) return null;
  const message = invite.url ? `Join ${teamName} on KickCricket: ${invite.url}` : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invite.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy the link. Select it and copy it yourself.");
    }
  };
  const share = async () => {
    try {
      await navigator.share({ text: message });
    } catch {
      // Closing the sheet counts as an error here; nothing to tell.
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {invite.url && (
        <>
          <span style={{ fontSize: 14, wordBreak: "break-all" }}>{invite.url}</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={copy} style={buttonStyle}>
              {copied ? "Copied" : "Copy link"}
            </button>
            <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" style={{ color: "inherit", ...buttonStyle, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              WhatsApp
            </a>
            {typeof navigator.share === "function" && (
              <button type="button" onClick={share} style={buttonStyle}>
                Share
              </button>
            )}
          </div>
        </>
      )}
      <span style={{ fontSize: 13, color: mutedColor }}>{invite.note}</span>
      {error && (
        <span role="alert" style={{ fontSize: 13, color: mutedColor }}>
          {error}
        </span>
      )}
    </div>
  );
}
