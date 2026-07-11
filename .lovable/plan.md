## Goal

Business-initiated WhatsApp automation and broadcast sends must use an approved Twilio Content Template (Content SID + variables), not a raw `Body`. Free‑text is only allowed inside the 24‑hour customer‑initiated window. This also removes the `20422 Region capability` error, which is really "no template attached to this outbound".

## Data model

Extend `whatsapp_templates` (single table for both providers) with:

- `provider` text default `'meta'` — one of `meta`, `twilio`, `both`
- `twilio_content_sid` text nullable — must match `^HX[0-9a-fA-F]{32}$`
- `twilio_variable_sample` jsonb nullable — example `{ "1": "John", "2": "Acme" }` for preview

Migration adds column, GRANTs unchanged (table already has policies), plus a check constraint on the SID shape. No RLS change.

## Settings → WhatsApp Templates tab

`src/components/settings/WhatsAppTemplatesTab.tsx`:

- Add "Provider" select (Meta / Twilio / Both).
- When provider ≠ meta, show a **Twilio Content SID** input (validated `HX…`) and a **Variable mapping** helper — one row per `{{n}}` up to `variable_count` with a token dropdown (`first_name`, `full_name`, `company`, `email`, `phone`, custom text). Persist as JSON in `twilio_variable_sample`.
- Row badges: show `Twilio HX…` chip when a SID is set, `Meta` chip when the template exists in Meta.
- Deep link to Twilio Content Template Builder.

## Automation step editor (Send WhatsApp)

`src/components/automations/AutomationStepEditor.tsx` + `email-editor/AutomationEmailEditor.tsx`:

When `resolvedChannel === "whatsapp"`:

1. New **Template picker** at the top of the WhatsApp editor (required for business‑initiated).
   - Lists approved templates for the workspace (`useApprovedWhatsAppTemplates`).
   - Filters to those with a `twilio_content_sid` when the active provider is Twilio, otherwise to those with `meta_template_id`.
   - Shows body_preview with `{{1}}…{{n}}` highlighted.
2. **Variable mapping** UI: one row per template variable. Each maps to a lead token (default: `first_name`, then `full_name`, then blank) or a static string. Stored on `step.config.whatsapp_template = { id, contentSid, variables: { "1": "{{first_name}}", ... } }`.
3. Free‑text `message` box is kept but relabelled "Session message (only used inside the 24h window)" with an inline warning: "Automations to cold contacts must select a template."
4. Save is blocked (inline error, not toast spam) when `send_whatsapp` step has no template selected and no explicit "session‑only" checkbox.
5. Fix segment counter already shipped — no change needed.

## Send test button

`AutomationEmailEditor.sendTest` for `whatsapp`:

- If a template is selected, POST to `whatsapp-send` with:
  ```json
  { workspaceId, to, preview: true,
    template: { contentSid, contentVariables: interpolate(vars, previewLead) } }
  ```
  Do not send `body`.
- If no template but user ticked "session only", keep current free‑text path.
- Error mapping already handles `region_capability`; add a specific message for `reason === "no_template"` → "Business‑initiated WhatsApp requires an approved template. Pick one in the editor."

## Backend send path

`supabase/functions/whatsapp-send/index.ts`:

- Accept `template.contentSid` + `template.contentVariables` already forwarded; also accept a `template.id` and, if present, hydrate `contentSid`/variables from `whatsapp_templates` by id (defence‑in‑depth so callers can pass the id only).
- When provider resolves to `twilio` and neither `contentSid` nor a session‑window override is provided, short‑circuit:
  ```json
  { success:false, reason:"no_template", error:"…" }
  ```
- Interpolate `contentVariables` values through `interpolateText(buildLeadVars(lead))` before forwarding (values may contain `{{first_name}}`).

`supabase/functions/twilio-whatsapp-send/index.ts` (already supports ContentSid):

- No routing change. Add log field `templateSid` for observability. Ensure `body` is optional when `contentSid` is set (already true).

## Execute automation / campaign

`execute-automation/index.ts` (`send_whatsapp` branch) and `execute-campaign/index.ts`:

- Read `config.whatsapp_template` (or campaign‑level equivalent).
- Interpolate `variables` map against the lead vars.
- Post to `whatsapp-send` with `template: { contentSid, contentVariables }` instead of `body`, keeping `body` as fallback only when the step is explicitly session‑only.
- Existing 24h‑window fallback logic stays untouched; template sends bypass the window so `fallback:true` should not fire.

## Broadcasts

`src/components/campaigns/CreateCampaignDialog.tsx` (already reads `whatsapp_templates`): add the same provider filter and Content SID variable‑mapping UI. Persist on the campaign row (`campaigns.template_meta` JSON — already exists per current usage).

## Sender guidance

`SenderProfilePicker` for WhatsApp: add a hint under the field — "Twilio senders must be a WhatsApp Business sender approved for the destination country. Messaging Service SIDs (MG…) are supported." No code beyond copy.

## Files touched

- `supabase/migrations/<new>.sql` — add columns + check constraint
- `src/components/settings/WhatsAppTemplatesTab.tsx`
- `src/hooks/useWhatsAppTemplates.ts` — extend type with new fields
- `src/components/automations/AutomationStepEditor.tsx`
- `src/components/automations/email-editor/AutomationEmailEditor.tsx`
- `src/components/campaigns/CreateCampaignDialog.tsx`
- `supabase/functions/whatsapp-send/index.ts`
- `supabase/functions/twilio-whatsapp-send/index.ts` (logging only)
- `supabase/functions/execute-automation/index.ts`
- `supabase/functions/execute-campaign/index.ts`

## Out of scope

- Auto‑syncing Twilio content templates via API (user pastes SID manually for now).
- Meta template header/footer/button parameters (current model is body variables only, matching existing UI).
