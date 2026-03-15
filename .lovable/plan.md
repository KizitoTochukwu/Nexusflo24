

# Add Color Palette to Formatting Toolbar

## What
Add text color and background/highlight color picker buttons to the FormattingToolbar, allowing users to apply color styling to selected text in the email/funnel editor.

## Changes

### `src/components/automations/email-editor/FormattingToolbar.tsx`
- Import `Paintbrush` and `Type` icons from lucide-react, plus `Popover` components
- Add two new color picker buttons after the existing tools:
  - **Text Color** (`Type` icon) — wraps selection in `<span style="color:#hex">...</span>`
  - **Highlight/Background Color** (`Paintbrush` icon) — wraps selection in `<span style="background-color:#hex">...</span>`
- Each button opens a small popover containing:
  - A grid of ~12 preset color swatches (matching the app's visual style: navy, gold, black, white, red, green, blue, teal, purple, orange, gray, pink)
  - A native `<input type="color">` for custom color picking
- On color selection, call `onWrap()` with the appropriate `<span style="...">` tags and close the popover
- State: two boolean states for popover open/close (`textColorOpen`, `bgColorOpen`)

### Color Presets
```
#000000 (Black), #FFFFFF (White), #0B1F3A (Navy), #E6B325 (Gold),
#DC2626 (Red), #16A34A (Green), #2563EB (Blue), #0D9488 (Teal),
#7C3AED (Purple), #EA580C (Orange), #6B7280 (Gray), #EC4899 (Pink)
```

No other files need changes — the toolbar is already consumed by both the email editor and funnel text editor.

