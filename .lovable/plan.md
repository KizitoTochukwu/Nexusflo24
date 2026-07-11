## Problem

The Automation Builder → Send WhatsApp step always shows "No Twilio-approved templates found" even when Meta Cloud API is the active provider and 7 Meta templates were synced successfully.

Root cause: `WhatsAppTemplatePicker` is hardcoded with `requireTwilio` in both `AutomationStepEditor` and `CreateCampaignDialog`. That filters `whatsapp_templates` down to rows with a `twilio_content_sid` and shows Twilio-only copy — regardless of the workspace's active WA provider.

## Fix

Make the picker (and the send pipeline) provider-aware, driven by the active WhatsApp provider stored in `workspace_channel_settings` (`channel='whatsapp'`, `is_active=true`).

### 1. Provider detection hook
- Add `useActiveWhatsAppProvider(workspaceId)` returning `"meta" | "twilio" | null`.
- Reads the active row from `workspace_channel_settings` (falls back to `whatsapp_settings.is_active` → meta, else twilio if a twilio row exists).

### 2. WhatsAppTemplatePicker becomes provider-aware
- Remove `requireTwilio` prop; add optional `provider` override, otherwise auto-detects via the hook.
- Filter rules:
  - `provider === "meta"`: show templates where `provider ∈ {meta, both, null}` (Meta sync writes `meta`/leaves null) AND `status = 'approved'`.
  - `provider === "twilio"`: show templates with a non-null `twilio_content_sid` AND `status = 'approved'`.
- Selection payload:
  - Meta: `{ id, name, language, variableCount, variables: { "1": "{{first_name}}", … } }` — server maps variables to Meta `components[{type:"body", parameters:[…]}]`.
  - Twilio: `{ id, name, language, contentSid, contentVariables: { "1": … } }` — unchanged.
- Copy:
  - Header/help text stays generic ("Approved WhatsApp template").
  - Empty state:
    - Meta: "No Meta-approved templates found. Open Settings → Channels → WhatsApp and click 'Sync templates from Meta', then approve at least one template in Meta Business Manager."
    - Twilio: existing HX Content SID hint.
  - Badge next to the selected template: `Meta` or `Twilio · HX…`.

### 3. Automation + campaign editors
- `AutomationStepEditor` and `CreateCampaignDialog`: drop the `requireTwilio` flag; picker resolves the provider itself.
- Persist the new selection object on the step/campaign as `whatsappTemplate`.

### 4. Send test + runtime dispatch
- `AutomationEmailEditor.sendTest` (WhatsApp branch): if `provider = meta` and a template is selected, pass `template: { id, name, language, components }` to `whatsapp-send`; otherwise free-text (session-only) as today. Twilio branch unchanged (uses `contentSid`).
- `execute-automation` and `execute-campaign`: when dispatching WhatsApp, build the per-lead payload:
  - Meta: interpolate variables per lead, wrap as `components: [{ type: "body", parameters: [{ type: "text", text }] }]`, forward `{ name, language, components }`.
  - Twilio: interpolate `contentVariables` per lead, forward `{ contentSid, contentVariables }` (already implemented).
- `whatsapp-send` Meta branch: add id-only hydration parallel to the existing Twilio hydration — if `template.id` is present without `name`, look up `whatsapp_templates` by id/workspace to fill `name` + `language` before sending.

### 5. Warning banners
- Update the "no approved senders / no templates" banners around the WhatsApp action so they name the correct provider ("Meta Cloud API" vs "Twilio").

## Technical notes

- No DB migration needed — `whatsapp_templates.provider` and `twilio_content_sid` columns already exist. Meta-synced rows either have `provider='meta'` or `NULL`, so the Meta filter treats both as Meta.
- Edge functions to redeploy: `whatsapp-send`, `execute-automation`, `execute-campaign`.
- Files to touch:
  - `src/hooks/useWhatsAppConnection.ts` (add `useActiveWhatsAppProvider`) or new `src/hooks/useActiveWhatsAppProvider.ts`.
  - `src/components/settings/WhatsAppTemplatePicker.tsx`
  - `src/components/automations/AutomationStepEditor.tsx`
  - `src/components/automations/email-editor/AutomationEmailEditor.tsx`
  - `src/components/campaigns/CreateCampaignDialog.tsx`
  - `supabase/functions/whatsapp-send/index.ts`
  - `supabase/functions/execute-automation/index.ts`
  - `supabase/functions/execute-campaign/index.ts`

## Result

With Meta active, the dropdown lists the 7 synced Meta templates, variable mapping still works, and Send test / automations / campaigns route through the Meta `template` payload — no Twilio HX SID required. Switching the workspace to Twilio flips the same picker back to HX-SID mode with Twilio-specific copy.
