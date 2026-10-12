---
category: Scoring
---
# Bump

Shows a number and replays a short drop-in whenever it changes (`.score-bump`, 420ms; opacity-only under reduced motion). Never animates on first render — opening a match that is already 2–1 must not look like two goals just went in.

Use it only for numbers that change rarely and matter when they do: goals, wickets, shootout scores. Never for runs, balls or the clock — they change every few seconds and would flicker.

```jsx
<div className="scorebug-score num" style={{ fontFamily: font.display, fontSize: 48, color: footballTheme.deep, display: "flex", gap: 14 }}>
  <Bump value={2} />
  <span style={{ opacity: 0.5 }}>–</span>
  <Bump value={1} />
</div>
```
