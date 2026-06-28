
## Goal

Refactor `src/components/settings/ChannelSettingsTab.tsx` (and the WhatsApp card it embeds) into a premium, SaaS-grade Communication Settings page — navy/white/gold, accordion-based, cleaner hierarchy — without touching any edge function, Supabase call, or wiring.

## Scope guarantees (no backend changes)

- No edits to `supabase/functions/*`, Supabase tables, RLS, or any hook in `src/hooks/*`.
- All existing handlers stay wired: save, disconnect, test email/SMS/WhatsApp, add domain, refresh verification, DNS records dialog, Twilio subaccount provisioning, Meta Embedded Signup, sync templates, regenerate verify token, default re-engagement template, masked-credential display, "leave blank to keep current" semantics.
- Provider switch logic (Resend ↔ SendGrid prefix validation), `re_` / `SG.` rules, and provider-change "require new key" guard remain untouched.

## Files to edit

1. `src/components/settings/ChannelSettingsTab.tsx` — primary rewrite (presentation only).
2. `src/components/settings/WhatsAppConnectCard.tsx` — tighten layout, move the second "manual credentials" panel into the Meta tab as a collapsible "Advanced: manual credentials" sub-section so only ONE WhatsApp Business card is rendered. Both manual-mode and Embedded Signup wiring stay intact — just visually merged.
3. (Optional, only if needed) small additions to `src/index.css` for one or two semantic tokens (e.g. `--badge-success`, `--badge-warning`) — only if existing tokens don't cover it.

## New page structure

```text
┌─ Page Header ────────────────────────────────────┐
│ Communication Settings                            │
│ Connect email, SMS, WhatsApp, and sender creds…  │
│ [Email: Connected] [SMS: Connected]               │
│ [WhatsApp: Connected] [Sender: Workspace]         │
└──────────────────────────────────────────────────┘

┌─ Bring Your Own Sender (premium info card) ─────┐
│ ✦ gold-bordered, icon + 2-line copy              │
└──────────────────────────────────────────────────┘

Accordion (single-open, default = first not-configured):
  ▸ Email           [Resend · Connected]  · updated 3d ago
  ▸ SMS             [Twilio · Connected]
  ▸ WhatsApp Business  [Connected via Meta Cloud API]
  ▸ Sender Defaults / Platform Credentials
```

### Email card (expanded)

- Header row: provider pill (Resend/SendGrid), status pill, "Last updated" muted text.
- 2-col grid (1-col mobile): From Email, From Name, Reply-To, Provider select.
- Credentials block: masked API key display + **Update API Key** button (reveals input) + **Disconnect** (with AlertDialog confirm). Full key never shown.
- Domain verification → table layout:

```text
Domain                 Status        DNS         Actions
www.nexusflo24.com     ✓ Verified    [DNS Records]  [⟳]
nexusflo24.com         ✓ Verified    [DNS Records]  [⟳]
```

  Plus an inline "Add domain" row (input + button) below the table.
- Footer: Save (primary navy), Test (secondary) with inline email input.

### SMS card (expanded)

- Provider pill: Twilio. Status pill.
- Masked Account SID / Auth Token / Sender Number (read-only display when set).
- "Update credentials" reveals the existing input fields.
- Auto-Provision Subaccount section kept as-is, visually grouped under a subtle divider.
- Footer: Save, Test SMS (with phone input), Disconnect (confirm dialog).

### WhatsApp Business card (single card, two tabs)

- Tabs: **Meta Cloud API** | **Twilio WhatsApp** (existing component).
- Active tab shows clear selected state (already does).
- Meta tab content reorganised into:
  - Connection summary grid (Phone, Verified business, WABA ID, Connection method).
  - Webhook configuration sub-card (Callback URL + copy, Verify Token masked + show/hide + copy + Regenerate, warning note).
  - **Advanced — manual credentials** collapsible (the current second "WhatsApp Business / Custom credentials active" panel folded into here so the page only renders ONE WhatsApp card).
  - Test send row (number + message + Test button).
  - Default re-engagement template selector (unchanged).
  - Actions: Sync Templates, Disconnect (confirm).
- Twilio WhatsApp tab: unchanged functionality, restyled to match (masked Account SID/Auth Token, Sender Number, Save, Test, Disconnect).

### Sender Defaults card (new, presentational only)

Static informational card listing platform-default fallbacks:
- Email default: NexusFlo24 platform sender
- SMS default: NexusFlo24 Twilio
- WhatsApp default: NexusFlo24 Meta/Twilio provider
- Footnote about BYO vs platform-managed.

No data fetching; pure copy.

## Visual system

- Card: `bg-card`, `rounded-xl`, `border`, soft shadow, `p-6`.
- Page background: `bg-muted/30`.
- Badges:
  - Connected / Verified → green (`bg-green-500/10 text-green-700 border-green-500/20`).
  - Pending / Workspace sender → amber (`bg-amber-500/10 text-amber-700 border-amber-500/20`).
  - Not connected → muted outline.
- Buttons:
  - Primary: default shadcn (navy via theme).
  - Secondary: `variant="outline"`.
  - Danger: outline + `text-destructive border-destructive/40`, always behind an AlertDialog confirm.
- Icons: lucide, gold tint (`text-primary` mapped to gold accent where appropriate, or `text-amber-500` for accent icons like Bring-Your-Own).
- Spacing: 8px scale, `space-y-6` between cards, `gap-4` inside grids.

## Copy changes

- "Custom credentials active" → "Workspace sender active".
- "Meta Connected" badge → "Connected via Meta Cloud API".
- Disconnect buttons → always open existing AlertDialog confirm before firing.

## Responsive

- `md:grid-cols-2` for credential field grids, collapsing to single column on mobile.
- Action button rows use `flex flex-wrap gap-2`.
- Accordion is touch-friendly (shadcn `Accordion` component, full-row trigger).

## Status summary row (header)

Derived from existing data already loaded in the tab:
- Email: `channels.email.configured && is_active`.
- SMS: `channels.sms.configured && is_active`.
- WhatsApp: from `useWhatsAppConnection`.
- Sender mode: any of the above configured → "Workspace sender", else "Platform default".

No new queries.

## Out of scope

- No new edge functions, no schema changes, no new secrets.
- No changes to test/save/disconnect behaviour or payloads.
- No changes to WhatsApp template marketplace tab or other Settings tabs.

## Validation

- After edits: typecheck passes, page renders, all existing buttons fire the same handlers, Network panel shows identical request shapes for Save/Test/Disconnect/Add-Domain/Sync-Templates/Regenerate-Token.
