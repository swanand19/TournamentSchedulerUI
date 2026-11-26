import { describeError } from "./api/errors";

/**
 * The one error banner every screen uses. `role="alert"` has screen readers announce it when it
 * appears, and the message is put into words someone can act on.
 */
export default function ErrorBanner({ message, style }) {
  if (!message) return null;
  return (
    <div
      className="drop-in"
      role="alert"
      style={{
        background: "color-mix(in srgb, var(--danger) 15%, transparent)",
        border: "1px solid var(--danger)",
        color: "var(--ink)",
        padding: "0.8rem 1rem",
        borderRadius: 14,
        marginBottom: 16,
        fontSize: 14,
        lineHeight: 1.5,
        ...style,
      }}
    >
      {describeError(message)}
    </div>
  );
}
