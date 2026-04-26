## Goal
Allow mobile users to pinch-zoom in and out on every page of the app.

## Background
The current viewport meta tag in `index.html` is:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```
While this doesn't explicitly set `user-scalable=no`, some mobile browsers default to restrictive behavior. We'll make zoom support explicit and generous.

## Change
Update the viewport meta tag in `index.html` to:
```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=5.0, user-scalable=yes"
/>
```

This:
- Keeps the default render at 1× (so layouts look the same).
- Explicitly allows the user to pinch-zoom up to 5× and zoom back out.
- Sets `user-scalable=yes` so all mobile browsers (including older Safari) honor it.

## Files touched
- `index.html` — single line change to the viewport meta tag.

## Notes
- No CSS or component changes are needed — pinch-zoom is controlled entirely by the viewport meta tag.
- This is a global change, so it applies to the marketing site, dashboard, and public form/funnel pages.
