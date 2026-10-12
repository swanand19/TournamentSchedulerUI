---
category: Icons
---
# CardIcon

A booking card, filled with `color` — yellow `#F4C430` or red (`theme.danger`, `#e24b4a`) — so it stays the referee's colour whatever the text colour. Red is reserved for red cards and wickets.

A 16×16 icon that keeps its own fill (not `currentColor`) and sits on the text baseline, so it can go inline in a label. Pass `size` for larger use and `title` when the icon is the only label.

```jsx
<CardIcon size={18} color="#F4C430" title="Booked" />
```
