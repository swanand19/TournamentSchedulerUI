---
category: Overlays
---
# Modal

A dialog over the screen: dark backdrop, a panel you style through `panelStyle` (the app always passes a cream card), portalled into `<body>`. Escape and a backdrop click call `onClose`; the app behind (`#root`) is made inert, focus moves to the panel and returns to the trigger on close.

Use for decisions that need focus: recording an event (pick the scorer), abandoning a match, a wicket's details. Put a heading with the `labelledBy` id first, in Anton, uppercase. Destructive choices are full-width buttons, with the safe "Keep playing" option last.

```jsx
<Modal labelledBy="abandon-title" onClose={close} panelStyle={{ background: "#F7F5EF", color: "#1B1B1B", borderRadius: 14, padding: "1.5rem" }}>
  <h3 id="abandon-title" style={{ fontFamily: font.display, fontSize: 20, margin: "0 0 6px" }}>ABANDON MATCH</h3>
  …
</Modal>
```
