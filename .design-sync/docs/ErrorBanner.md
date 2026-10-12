---
category: Feedback
---
# ErrorBanner

The one error banner every screen uses: a translucent red box on the dark page, cream text, `role="alert"`, drop-in entry. Renders nothing when `message` is empty, so it can always be placed and fed the current error.

Show the API's message verbatim, right above the action that failed; keep the person's input and don't navigate away. It is styled for the dark pitch background the screens sit on.

```jsx
<ErrorBanner message="Minutes per half must be at least 1." />
```
