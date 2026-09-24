// One place for the look of the app.
//
// Before this existed, eight components each redeclared the same `font` object and pasted the same
// hex codes inline. Cricket needs its own palette so the two sections are tellable apart at a
// glance, which made the duplication untenable — hence a single module both sports read from.

export const font = {
  display: "'Anton', sans-serif",
  body: "'Inter', sans-serif",
  condensed: "'Teko', sans-serif",
};

/** Loaded once in index.html; components should not inject their own <link>. */
export const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&family=Teko:wght@500;600&display=swap";

const shared = {
  cream: "#F7F5EF",
  ink: "#1B1B1B",
  /** Secondary text on cream. 5.2:1 on cream, 4.7:1 on the #EDEAE0 chips (was #8a8677, 3.4:1). */
  muted: "#6b675b",
  danger: "#e24b4a",
  success: "#639922",
  successInk: "#3b6d11",
  /** Fills behind white button labels: 6.2:1 and 5.1:1. The lighter success/danger stay for tints. */
  successSolid: "#3b6d11",
  dangerSolid: "#c63b3a",
  /** Warm brown for "needs attention" text on cream: live status, warnings, the second group. */
  warnInk: "#8a4b1b",
  tintAlt: "#F5E4CE",
};

/** Football: a floodlit pitch — dark green stripes, amber accents. */
export const footballTheme = {
  ...shared,
  key: "Football",
  label: "Football",
  icon: "⚽",
  accent: "#F2A93B",
  accentInk: "#1B1B1B",
  deep: "#1B4332",
  /** A selected item on a cream card. */
  tint: "#E3EEE6",
  accentSoft: "rgba(242,169,59,0.15)",
  background:
    "repeating-linear-gradient(180deg, #1B4332 0px, #1B4332 60px, #17402E 60px, #17402E 120px)",
  onDark: "#F7F5EF",
  onDarkMuted: "rgba(247,245,239,0.6)",
  surfaceOnDark: "rgba(247,245,239,0.06)",
  borderOnDark: "rgba(247,245,239,0.15)",
  placeholder: "e.g. Summer Cup 2026",
};

/** Cricket: a dusk-blue ground under lights, with a gold accent (red is kept for wickets). */
export const cricketTheme = {
  ...shared,
  key: "Cricket",
  label: "Cricket",
  icon: "🏏",
  accent: "#E8B03A",
  accentInk: "#12243B",
  deep: "#12243B",
  tint: "#E1E8F2",
  accentSoft: "rgba(232,176,58,0.15)",
  background:
    "repeating-linear-gradient(180deg, #12243B 0px, #12243B 60px, #0F1F34 60px, #0F1F34 120px)",
  onDark: "#F7F5EF",
  onDarkMuted: "rgba(247,245,239,0.6)",
  surfaceOnDark: "rgba(247,245,239,0.06)",
  borderOnDark: "rgba(247,245,239,0.15)",
  placeholder: "e.g. Premier League T20",
};

export const SPORTS = [footballTheme, cricketTheme];

/** Falls back to football for anything unrecognised, including undefined. */
export function themeFor(sport) {
  return sport === "Cricket" ? cricketTheme : footballTheme;
}

/** Lets global CSS (focus rings, the page colour behind overscroll) follow the open sport. */
export function syncDocumentSport(sport) {
  document.documentElement.dataset.sport = themeFor(sport).key;
}
