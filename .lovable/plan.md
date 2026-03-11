

# Replace Header Logo with New Brand Image

## What Changes
Copy the uploaded logo to `src/assets/nexusflo24-logo-full.png` and update the Header logo link (line 24-28) to use the full logo image instead of the current icon + text spans combo.

## File Changes

**New asset**: Copy `user-uploads://Screenshot_11-3-2026_142238_chatgpt.com.jpeg` → `src/assets/nexusflo24-logo-full.png`

**`src/components/layout/Header.tsx`** — Replace the logo `<Link>` contents (lines 24-28):
- Remove the separate icon image + two `<span>` elements
- Use a single `<img>` tag with the full logo, sized appropriately (~h-8 for desktop)
- Keep the same Link wrapper and routing to `/`

