import { useId, useRef, useState } from "react";
import ErrorBanner from "./ErrorBanner";
import { pictureSrc, preparePicture } from "./pictures";

// One picture on a cream card (HLD P-26): what it looks like now, "Choose a photo" / "Change" and
// "Remove". The file is cropped and shrunk in the browser (pictures.js), then sent with `upload`,
// which answers { url }; the server's refusal is shown here, as worded.

const button = (primary, theme) => ({
  minHeight: 44,
  borderRadius: 8,
  padding: "0.5rem 1rem",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  border: primary ? "none" : `1px solid ${theme.muted}`,
  background: primary ? theme.accent : "transparent",
  color: primary ? theme.accentInk : theme.ink,
});

export default function PictureField({ label, hint, shape, link, name, upload, remove, onChanged, theme }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef(null);
  const hintId = useId();
  const src = pictureSrc(link);

  const run = async (fn) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      onChanged(await fn());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const chosen = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // the same file can be chosen again after a refusal
    if (file) run(async () => (await upload(await preparePicture(file, shape))).url);
  };

  const clear = () => {
    if (window.confirm(`Remove the ${label.toLowerCase()}? It goes for everyone straight away.`)) run(async () => (await remove()).url);
  };

  const initials = (name ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("") || "?";

  return (
    <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {shape === "square" &&
          (src ? (
            <img src={src} alt="" width={64} height={64} style={{ width: 64, height: 64, borderRadius: shape === "square" ? "50%" : 8, objectFit: "cover", background: theme.tint }} />
          ) : (
            <div aria-hidden="true" style={{ width: 64, height: 64, borderRadius: "50%", display: "grid", placeItems: "center", background: theme.tint, color: theme.ink, fontWeight: 700, fontSize: 22 }}>
              {initials}
            </div>
          ))}
        <div>
          <div style={{ fontWeight: 700 }}>{label}</div>
          {hint && <div id={hintId} style={{ fontSize: 13, color: theme.muted }}>{hint}</div>}
        </div>
      </div>
      {shape === "banner" &&
        (src ? (
          <img src={src} alt={label} style={{ width: "100%", maxWidth: 420, aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 10, background: theme.tint }} />
        ) : (
          <div style={{ width: "100%", maxWidth: 420, aspectRatio: "16 / 9", borderRadius: 10, border: `1px dashed ${theme.muted}`, display: "grid", placeItems: "center", color: theme.muted, fontSize: 13 }}>
            No banner yet · 16:9
          </div>
        ))}
      <ErrorBanner message={error} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic" onChange={chosen} hidden aria-describedby={hint ? hintId : undefined} />
        <button type="button" disabled={busy} onClick={() => input.current?.click()} style={button(true, theme)}>
          {busy ? "Saving…" : src ? "Change" : "Choose a photo"}
        </button>
        {src && (
          <button type="button" disabled={busy} onClick={clear} style={button(false, theme)}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
