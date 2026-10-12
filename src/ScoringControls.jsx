// A screen's scoring controls, switched off while someone else holds the scorer lock. Kept apart
// from ScoringBanner, which talks to the API, so it can be used (and previewed) without the client.

/** Wraps a screen's scoring controls: everything inside is disabled while `locked`. */
export function ScoringControls({ locked, children }) {
  return (
    <fieldset disabled={locked} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, opacity: locked ? 0.55 : 1 }}>
      {children}
    </fieldset>
  );
}
