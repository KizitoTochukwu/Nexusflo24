# Make NexusFlo24 Installable on Mobile (Add to Home Screen)

## Goal
Let visitors install NexusFlo24 onto their phone home screen from the browser — an app icon, full-screen launch, no app store. This is **manifest-only** home-screen support (no offline caching, no service worker), which is the smallest path the PWA skill allows for "installable / Add to Home Screen."

## What changes

### 1. App manifest — `public/manifest.webmanifest` (new)
```json
{
  "name": "NexusFlo24 — Marketing Automation",
  "short_name": "NexusFlo24",
  "description": "CRM, WhatsApp, Email & SMS marketing automation — turn visitors into paying customers with AI.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#FFFFFF",
  "theme_color": "#0B1F3B",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```
- Brand colors: Navy `#0B1F3B` theme, white background.
- `display: standalone` → opens full-screen, no browser chrome, feels like an app.

### 2. App icons — `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png` (new)
Generate three PNG icons from the existing NexusFlo24 logo (`public/nexusflo24-logo.png`) on the Navy `#0B1F3B` background:
- 192×192 (standard home-screen icon)
- 512×512 (standard + Play Store-style)
- 512×512 maskable (icon fills the maskable safe zone — logo centered with padding so Android adaptive icons don't crop it)

The existing `apple-touch-icon.png` (180×180) stays for iOS home-screen bookmarks.

### 3. Head tags — `index.html` (edit)
Add inside `<head>`:
- `<link rel="manifest" href="/manifest.webmanifest">`
- `<meta name="theme-color" content="#0B1F3B">` (Android status bar matches Navy)

The existing `<link rel="apple-touch-icon" ...>` already covers iOS Add to Home Screen.

## What is NOT included
- No service worker, no offline caching, no `vite-plugin-pwa`. The user asked for installability only; offline is a separate explicit ask.
- No changes to app logic, routes, or data.
- No install-prompt UI — browsers show their own Add to Home Screen prompt when the manifest + icons are present and the user engages. (iOS Safari always requires manual Add to Home Screen from the share sheet; no prompt.)

## How users install
- **Android (Chrome):** visit nexusflo24.com → browser shows "Install app" prompt → icon appears on home screen → opens full-screen.
- **iPhone (Safari):** visit nexusflo24.com → Share → Add to Home Screen → icon appears → opens full-screen.
- Works on the published app (`nexusflo24.com`) and custom domain. Installability does not affect the Lovable preview.

## Verification
After edits, in the published/preview app:
- `curl https://nexusflo24.com/manifest.webmanifest` returns the manifest JSON.
- Lighthouse "Installable" check passes (manifest + 192 + 512 icons + start_url + display standalone + fetch listener not required for installability).
- On a phone, visiting the site shows the Add to Home Screen option.

## Files
- `public/manifest.webmanifest` (new)
- `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png` (new, generated)
- `index.html` (edit — add manifest + theme-color link tags)
