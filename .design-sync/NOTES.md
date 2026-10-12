# design-sync notes — tournament-scheduler-ui → Claude Design "Tournament Scheduler"

Project: https://claude.ai/design/p/42e2e60e-5eeb-4c95-9521-97bb968c026f (first synced 2026-10-07).

## How this repo is synced

- This is a Vite **app**, not a library: no `dist/`, no `.d.ts`. The design-system surface is
  `.design-sync/entry.jsx`, which re-exports the shared pieces from `src/` plus the theme tokens and
  imports `src/styles.css` and `.design-sync/fonts.css` (the Google Fonts URL from `index.html`).
  Run the converter with `--entry ./.design-sync/entry.jsx` (also `cfg.entry`); there is no build command.
- The component list is `cfg.componentSrcMap` (no `.d.ts` to discover from). Props are hand-written in
  `cfg.dtsPropsFor`; docs (with `category` for grouping) are in `.design-sync/docs/<Name>.md`.
- `--node-modules ./node_modules` (run `npm ci` in `tournament-scheduler-ui/` first).
- Render check / capture use the system Chrome, not a downloaded Chromium:
  `DS_CHROMIUM_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe"`. Playwright was installed
  into `.ds-sync/` with `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i playwright`. No Python on this laptop.
- Stop the review server (`http-serve.mjs ./ds-bundle`) before any rebuild: on Windows it holds
  `ds-bundle/` open and the build fails with `EPERM ... rmSync` (the driver then misreports `shape: storybook`).

## Deliberately left out

- `ScoringBanner`: its buttons call the API (scoring request/respond/take-over), which would pull the
  encrypted gateway client and Vite's `import.meta.env` into the bundle. `ScoringControls` was moved
  out of `ScoringBanner.jsx` into `src/ScoringControls.jsx` (2026-10-07) so it can be synced on its own.
- Every screen (Home, LiveMatch, …): they fetch through the gateway. Only shared, data-free pieces go in.
- `syncDocumentSport` (mutates `<html>`); the conventions tell designs to set `data-sport` themselves.

## Preview quirks

- Modal cards (`cardMode: single`) show a grey backdrop: the harness page behind is white, not the
  pitch. A fixed pitch-coloured layer behind the dialog didn't show in captures, so it was dropped.
- The 11 line-icon previews share one shape (Sizes + InContext); they were generated once from a
  script and are now ordinary owned files — edit them directly.
- Known render warns: none (16/16 clean on 2026-10-07).

## Re-sync risks

- **Hand-copied API surface.** `dtsPropsFor` and `docs/*.md` restate props and usage of `src/Bump.jsx`,
  `ErrorBanner.jsx`, `Modal.jsx`, `ScoringControls.jsx`, `icons.jsx`. If a prop changes there, update both.
- **Previews copy app markup.** Button and card styles in `previews/*.tsx` were taken from
  `LiveMatch.jsx`, `PenaltyShootout.jsx`, `CricketLiveMatch.jsx` (event buttons, scorebug, dialogs).
  They won't follow restyles of those screens — re-check the previews after a visual change.
- **New shared component?** Add it to `entry.jsx`, `componentSrcMap`, `dtsPropsFor`, `docs/`, and a preview.
- **Remote fonts.** Anton / Inter / Teko load from fonts.googleapis.com at runtime (`[FONT_REMOTE]`);
  designs render in fallbacks offline.
- The server messages in the ErrorBanner previews are real (`FootballMatchService`, `TournamentAccessService`);
  if those sentences change, the previews only drift cosmetically.
