## Goal

Give every workspace a polished, hosted public URL that opens the lead capture form as a full standalone page — perfect for sharing in social bios, QR codes, DMs, emails, and link-in-bio tools. No iframe, no embedding required.

## What the user gets

A new shareable URL pattern:

```
https://nexusflo24.com/form/{workspaceId}?fields=name,email,phone&tags=newsletter&button=Subscribe
```

Opens a **fully branded standalone page** (NexusFlo24 logo + workspace name, headline, supporting copy, hero card with the form, success state, footer trust line) — not the bare iframe-style form.

All existing query params (`fields`, `tags`, `source`, `button`, `color`, `redirect`, UTM params) continue to work exactly the same.

## New page: `/form/:workspaceId` (HostedLeadForm)

A new public route built for direct browser viewing:

- **Top bar**: NexusFlo24 logo (links to homepage), small "Powered by NexusFlo24" badge.
- **Hero**: workspace-customizable title + subtitle (defaults: "Get in touch" / "Fill out the form below and we'll be in touch shortly."). Title and subtitle overridable via `?title=` and `?subtitle=` URL params.
- **Form card**: same fields/validation/submission logic as today's `EmbedForm`, but styled with the project's design system (rounded card, navy/gold accents, Inter font, proper spacing) instead of inline styles.
- **Success state**: full-page checkmark, thank-you message, optional auto-redirect when `redirect` param is set.
- **Footer**: small trust line + privacy/terms links.
- **Mobile-first responsive**, works as a standalone share target.

Submissions still flow through the existing `capture-lead` Edge Function — no backend changes required. Workspace ID comes from the route param, removing the need for `?workspace=...`.

## Updates to the Embed dialog (`EmbedCodeDialog.tsx`)

Add a fourth tab — **Hosted Page** — and an "Open preview" button:

- New tab labeled **"Share Link"** showing the clean hosted URL: `https://nexusflo24.com/form/{workspaceId}?...`
- "Copy link" button (existing copy UX).
- "Open in new tab" button that loads the live hosted page so the user can preview it before sharing.
- Short helper text: *"Share this link anywhere — Instagram bio, WhatsApp, QR codes, email signatures."*

The existing iFrame, JS Snippet, and Direct (raw embed) tabs remain unchanged.

## Routing

Register the new route in `src/App.tsx` alongside the existing `/embed/form` route:

```text
/embed/form          → existing bare iframe-friendly form (unchanged)
/form/:workspaceId   → new hosted, branded standalone page
```

Both coexist; the embed dialog will recommend the hosted link for direct sharing and keep the iframe URL for website embedding.

## Out of scope (can add later)

- Per-workspace custom logo/banner on the hosted page (currently uses NexusFlo24 branding by default).
- Slug-based vanity URLs like `/form/acme-newsletter` (currently uses the workspace ID).
- Saving form configurations as named "share links" in the database.

## Files to touch

- **Create** `src/pages/HostedLeadForm.tsx` — the new branded standalone page.
- **Edit** `src/App.tsx` — add `<Route path="/form/:workspaceId" element={<HostedLeadForm />} />`.
- **Edit** `src/components/funnels/EmbedCodeDialog.tsx` — add "Share Link" tab with copy + open-preview buttons.
