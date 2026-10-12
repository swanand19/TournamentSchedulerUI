# Tournament Scheduler — how to build with it

A touchline scoring app for amateur football and cricket: "a floodlit ground at night". Dark striped
pitch pages, cream cards on top, one amber/gold accent. No provider or wrapper is needed — components
style themselves; the page look comes from `styles.css` plus inline styles that use the theme objects.

## Setup

- Everything is on `window.TournamentScheduler`: the components, and the tokens `footballTheme`,
  `cricketTheme`, `font`, `themeFor(sport)`, `SPORTS`.
- Pick ONE sport per screen and use its theme everywhere on it: `const t = footballTheme` (green
  pitch, amber `#F2A93B`) or `cricketTheme` (navy ground, gold `#E8B03A`). For cricket also set
  `<html data-sport="Cricket">` so the CSS variables `--accent` and `--page` (focus rings, page colour) switch.
- Page shell: `<div style={{ background: t.background, color: t.onDark, fontFamily: font.body, minHeight: "100vh" }}>`.
- Open a `Modal` only while it is shown (`{open && <Modal …/>}`): while mounted it makes `#root` inert.

## Styling idiom: inline styles + theme tokens (no utility classes)

Theme keys (same names on both themes): `background` (striped page), `deep` (solid page colour,
headings on cream), `cream` (cards), `ink` (text on cream), `muted` (secondary text on cream),
`onDark` / `onDarkMuted` (text on the pitch), `surfaceOnDark` + `borderOnDark` (translucent panels
on the pitch), `accent` + `accentInk` (the one primary action), `accentSoft`, `tint` (selected item
on cream), `successSolid` (confirm buttons, white text), `dangerSolid` / `danger` (destructive only),
`warnInk` (live status, warnings, trophies on cream), `tintAlt`.

Fonts: `font.display` (Anton — headings, scores; one weight, use `fontWeight: 400`, usually UPPERCASE),
`font.body` (Inter — everything else), `font.condensed` (Teko — clocks, join codes, eyebrow labels).

Global classes from `styles.css` you may use: `num` (tabular digits for scores/clocks), `cols`
(grid; set `--cols` and `--cols-sm` in style), `scorebug` + `scorebug-score` (home | score | away),
`live-dot` (pulsing LIVE dot), `drop-in` (banners), `pop-in`, `view-in`, `stagger` (children set
`--i`), `stoppage-pulse`, `sr-only`, `pressable`. Buttons already get press feedback and focus rings.

Rules: red is reserved for red cards, wickets and destructive actions. Touch targets at least 44px
high; primary scoring buttons bigger. Cards: `borderRadius` 12–14, padding 1–1.5rem.

## Where the truth lives

`_ds_bundle.css` (the app's `styles.css`) for classes and animations; each
`components/<group>/<Name>/<Name>.prompt.md` for when and how to use a component; the token values
in `window.TournamentScheduler.footballTheme` / `cricketTheme`.

## Example

```jsx
const { Bump, BallIcon, footballTheme: t, font } = window.TournamentScheduler;

<div style={{ background: t.background, padding: 20, fontFamily: font.body }}>
  <div style={{ background: t.cream, color: t.ink, borderRadius: 14, padding: "1.5rem", textAlign: "center" }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: t.warnInk, letterSpacing: "0.08em", marginBottom: 12 }}>
      <span className="live-dot" />LIVE — SECOND HALF
    </div>
    <div className="scorebug">
      <div style={{ textAlign: "right", fontSize: 18, fontWeight: 700 }}>Riverside FC</div>
      <div className="scorebug-score num" style={{ fontFamily: font.display, fontSize: 48, color: t.deep, display: "flex", gap: 14 }}>
        <Bump value={2} /><span style={{ opacity: 0.5 }}>–</span><Bump value={1} />
      </div>
      <div style={{ textAlign: "left", fontSize: 18, fontWeight: 700 }}>Hilltop United</div>
    </div>
  </div>
</div>
```
