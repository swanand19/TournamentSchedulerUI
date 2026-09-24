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
        background: "rgba(226,75,74,0.15)",
        border: "1px solid #e24b4a",
        color: "#F7F5EF",
        padding: "0.8rem 1rem",
        borderRadius: 8,
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
