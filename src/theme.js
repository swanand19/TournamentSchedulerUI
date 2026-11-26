// One place for the look of the app (2026-11-26: the phone app's two themes).
//
// Every token is a CSS variable (theme.css) rather than a colour, so the same inline style draws the
// dark "Liquid Glass" theme or the light "Sight-screen" one, whichever <html data-mode> says; nothing
// re-renders when the theme changes. Each sport reads its own prefixed set (--fb-*, --ck-*), so a page
// that shows both sports still colours each one right. Because tokens are var(...) strings, never
// glue an alpha onto one (`${theme.ink}33`): use the `rgba(var(--fg-rgb), a)` form or a token.

export const font = {
  /** Inter in dark, Outfit in light. */
  body: "var(--font-body)",
  /** Titles and figures: Inter Bold in dark, Outfit Light in light (weight set in ui.css). */
  display: "var(--font-display)",
  /** Labels that used to be condensed capitals: Inter SemiBold / Outfit Medium, sentence case. */
  condensed: "var(--font-condensed)",
};

const v = (name) => `var(--${name})`;

/** The shared tokens, then the sport's own under its prefix. */
function makeTheme(prefix, extra) {
  return {
    cream: v(`${prefix}-cream`),
    ink: v("ink"),
    muted: v(`${prefix}-muted`),
    danger: v("danger"),
    success: v("success"),
    successInk: v("success-ink"),
    successSolid: v("success-solid"),
    dangerSolid: v("danger-solid"),
    dangerInk: v("danger-ink"),
    dangerTint: v("danger-tint"),
    successTint: v("success-tint"),
    warnInk: v("warn-ink"),
    tintAlt: v("tint-alt"),
    night: v("nt-wall"),
    yellowCard: v("yellow-card"),
    redCard: v("red-card"),
    liveOnDark: v("live"),
    chip: v("chip"),
    hair: v("hair"),
    line: v("line"),
    field: v("field"),
    cardDivider: v("hair"),
    accent: v(`${prefix}-accent`),
    accentInk: v(`${prefix}-accent-ink`),
    /** Accent words and icons (a darker ink of the accent in light). */
    deep: v(`${prefix}-deep`),
    /** A selected item on a pane. */
    tint: v(`${prefix}-tint`),
    accentSoft: v(`${prefix}-tint`),
    ring: v(`${prefix}-ring`),
    accentGradient: v(`${prefix}-grad`),
    background: v(`${prefix}-wall`),
    page: v(`${prefix}-page`),
    onDark: v("on-page"),
    onDarkMuted: v(`${prefix}-muted`),
    surfaceOnDark: "rgba(var(--fg-rgb), 0.07)",
    borderOnDark: v("line"),
    deck: v(`${prefix}-deck`),
    deckRaised: v("chip"),
    stripes: [v(`${prefix}-deck`), v(`${prefix}-deck`)],
    ...extra,
  };
}

/** Football: sea-glass teal in dark, leaf green in light. */
export const footballTheme = makeTheme("fb", {
  key: "Football",
  label: "Football",
  icon: "⚽",
  placeholder: "e.g. Summer Cup 2026",
});

/** Cricket: periwinkle in dark, sky blue in light. */
export const cricketTheme = makeTheme("ck", {
  key: "Cricket",
  label: "Cricket",
  icon: "🏏",
  placeholder: "e.g. Premier League T20",
});

/**
 * Pages that belong to no sport (Home's frame, sign-in, the profile, the inbox): the neutral
 * wallpaper in dark, football's palette in light, as on the phone. Still answers to football's key.
 */
export const neutralTheme = makeTheme("nt", {
  key: "Football",
  label: "Football",
  icon: "⚽",
  placeholder: "e.g. Summer Cup 2026",
});

export const SPORTS = [footballTheme, cricketTheme];

/** Falls back to football for anything unrecognised, including undefined. */
export function themeFor(sport) {
  return sport === "Cricket" ? cricketTheme : footballTheme;
}

/** Lets global CSS (focus rings, the page behind overscroll, the unprefixed tokens) follow the open
 *  sport; "None" for a page that belongs to no sport. */
export function syncDocumentSport(sport) {
  document.documentElement.dataset.sport = sport === "None" ? "None" : themeFor(sport).key;
}
