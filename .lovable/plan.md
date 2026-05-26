
# WhatsApp Cloud API — "It Just Works" Wiring

Goal: match HubSpot / ManyChat / Wati behavior. User writes a message → it gets delivered, regardless of the 24h window, by automatically swapping in an approved Marketing template when needed. Pricing is transparent, fallbacks are explicit, and the UI surfaces what happened.

## How it will feel to the user

- **Inbox**: typing inside an open thread sends free text. If the 24h window is closed, the composer shows a small banner "Window closed — sending as approved template (~£0.04)" and a template picker pre-selected to the workspace default. One click sends.
- **Campaigns (WhatsApp)**: step always asks for a "Re-engagement template" (any approved Marketing template). Free-text body becomes the `{{1}}` variable. Sending shows "X delivered, Y via template, Z blocked (no template configured)".
- **Automations (WhatsApp step)**: same template picker baked into the step editor, with the same auto-fill behavior.
- **Settings → Channels → WhatsApp**: new "Default re-engagement template" dropdown (populated from `whatsapp_templates` where `status = approved` and `category = MARKETING`). Tooltip explains the 24h rule and per-message cost.

## What gets built

### 1. Backend — `whatsapp-send` becomes self-healing

In `supabase/functions/whatsapp-send/index.ts`, when caller sends free text AND window is closed:
1. Look up `whatsapp_settings.default_reengagement_template_id` for the workspace.
2. If set → load template from `whatsapp_templates`, build payload with the original `body` injected as `{{1}}`, send to Graph as `type: "template"`.
3. Log `whatsapp_messages` row with `auto_templated: true`, `template_name`, `original_body`, `category: "marketing"`.
4. Return `success: true, auto_templated: true, template_used: <name>`.
5. If no default template configured → keep current `success:false, fallback:true, reason:"window_closed"` behavior so SMS/email fallback still fires.

No change to behavior when caller already passes an explicit `template`.

### 2. Database — one column + one log field

Migration:
- `ALTER TABLE whatsapp_settings ADD COLUMN default_reengagement_template_id uuid REFERENCES whatsapp_templates(id) ON DELETE SET NULL;`
- `ALTER TABLE whatsapp_messages ADD COLUMN auto_templated boolean NOT NULL DEFAULT false;`
- `ALTER TABLE whatsapp_messages ADD COLUMN template_name text;`

(Re-uses existing `whatsapp_templates` table — no new table needed.)

### 3. Settings UI

`src/components/settings/ChannelSettingsTab.tsx` (WhatsApp section):
- Add "Default re-engagement template" `<Select>` populated from approved Marketing templates.
- Helper text: "When a contact hasn't messaged you in 24h, WhatsApp blocks free text. We'll automatically send this approved template instead (~£0.04 per message). Your text goes into the {{1}} variable."
- Link to "Manage templates" → existing `WhatsAppTemplatesTab`.

### 4. Campaign UI

`src/components/campaigns/CreateCampaignDialog.tsx` (when channel = whatsapp or multi-channel):
- New "Re-engagement template" field (defaults to workspace default).
- Stored in `campaigns.message_content.whatsappTemplate` (already used by `execute-campaign`).
- Inline cost badge: "~£0.04 per message outside 24h window".

`src/components/campaigns/CampaignAnalytics.tsx`:
- Add counters: `delivered_via_template`, `blocked_window_closed`.
- Banner when `blocked_window_closed > 0`: "X messages blocked — configure a re-engagement template to recover these automatically." → CTA to Settings.

### 5. Automation UI

`src/components/automations/AutomationStepEditor.tsx` (WhatsApp action type):
- Same template picker as Campaigns. Stores `step.config.whatsappTemplate`.
- `execute-automation` already forwards arbitrary config to `whatsapp-send` — just needs to pass `template` through (small edit).

### 6. Inbox UI

`src/pages/dashboard/DashboardMessages.tsx` + WhatsApp thread composer:
- Compute `is_window_open` from latest inbound message timestamp (< 24h).
- When closed: show amber banner above composer with template picker (default = workspace default).
- Send button label switches to "Send as template (~£0.04)" when window closed.
- After send, show in thread as "Sent via template: {name}" pill.

### 7. Reporting touch

Update `useDashboardMetrics` (or campaign report queries) to surface `auto_templated` count so users see "Re-engagement templates used: N (£N.NN)".

## Files touched (estimate)

```text
Backend
  supabase/functions/whatsapp-send/index.ts          (auto-template logic)
  supabase/functions/execute-automation/index.ts     (pass template through)
  supabase/migrations/<new>.sql                       (2 columns)

Settings
  src/components/settings/ChannelSettingsTab.tsx
  src/hooks/useChannelSettings.ts (if exists)

Campaigns
  src/components/campaigns/CreateCampaignDialog.tsx
  src/components/campaigns/CampaignAnalytics.tsx
  src/components/campaigns/CampaignDetailsDrawer.tsx

Automations
  src/components/automations/AutomationStepEditor.tsx

Inbox
  src/pages/dashboard/DashboardMessages.tsx
  src/hooks/useWhatsAppInbox.ts                       (expose last_inbound_at)
  + small composer component for window banner

Shared
  src/hooks/useWhatsAppTemplates.ts (new — approved Marketing templates)
```

## Out of scope (intentionally)

- Submitting new templates to Meta from inside the app (use existing `WhatsAppTemplatesTab` flow).
- Per-template pricing tiers per country (show single "~£0.04" indicative price; Meta bills actuals).
- Sessions-based bulk re-opening of windows (no API exists for this — that's the whole point of templates).

## Risk / caveats called out to user

- User must have **at least one approved Marketing template** for the auto-recovery to work. UI will prompt them to create one if none exists.
- Meta charges per conversation (~£0.04 marketing) — surfaced everywhere a template send can happen so there are no billing surprises.
- Templates can be rejected by Meta; we'll show `status` from `whatsapp_templates` and only allow `approved` ones in pickers.

Approve to switch to build mode and I'll ship it in this order: migration → `whatsapp-send` logic → Settings picker → Campaign/Automation steps → Inbox composer → analytics counters.
