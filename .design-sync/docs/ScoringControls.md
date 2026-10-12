---
category: Scoring
---
# ScoringControls

Wraps a screen's scoring buttons in a borderless `<fieldset>`. While `locked` (someone else holds the scorer lock) every control inside is disabled and the group dims to 55%. Only one person scores a match at a time; everyone else watches the same screen with the buttons off.

```jsx
<ScoringControls locked={!canScore}>
  <button>Goal</button>
  <button>Yellow card</button>
</ScoringControls>
```
