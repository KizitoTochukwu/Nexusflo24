# WhatsApp Production Parity — Close 4 Gaps

Bring real WhatsApp campaign/automation sends to full HubSpot / GoHighLevel parity by closing the four gaps flagged in the last comparison.

---

## Gap 1 — Delivery-status webhook transitions

**Goal:** When Meta posts a status webhook (`sent` → `delivered` → `read` → `failed`), propagate it to both `whatsapp_messages` and `campaign_messages` so campaign analytics reflect real delivery, not just the initial send result.

**Changes**
- `supabase/functions/whatsapp-webhook/index.ts`
  - On `statuses[]` entries: look up the matching `whatsapp_messages` row by `wa_message_id`; update `status`, `delivered_at`, `read_at`, `error_code`, `error_title`.
  - Then, if that row has a `campaign_id`, update the corresponding `campaign_messages` row (matched by `campaign_id + lead_id + channel='whatsapp'`) with:
    - `delivery_status = delivered | read | failed`
    - `error = <meta error title>` on failure
  - Idempotent: only advance status forward (`sent < delivered < read`); never regress.

**Out of scope:** email/SMS webhook rewiring, historical backfill.

---

## Gap 2 — Caller-side auto-fallback wiring

**Goal:** When `whatsapp-send` returns `success:false, fallback:true` (window closed, template unavailable, non-retryable error), the workflow/automation engine should automatically switch channel to the configured fallback (SMS or Email) inside the same run, matching how HubSpot & GHL workflow steps behave.

**Changes**
- `supabase/functions/execute-workflow/index.ts` (audit + patch)
  - After a WhatsApp node send, if the response is `{ success:false, fallback:true }` and the node has `fallback_channel` configured (SMS/Email), invoke that channel's send function inline with the same body/subject.
  - Log both attempts to `workflow_logs` with `primary_channel`, `fallback_channel`, `fallback_reason`.
- `supabase/functions/execute-automation/index.ts` — same pattern for legacy automations.
- `execute-campaign/index.ts` already schedules a fallback job on failure; extend it so `fallback:true` from WhatsApp fires the fallback **immediately** (0 delay) instead of using the "unread" delay. (Already partly done — verify + tighten.)

**Out of scope:** UI to configure fallback per node (already exists), retry-with-backoff, cross-workspace routing.

---

## Gap 3 — WhatsApp-specific pacing

**Goal:** Respect Meta's per-phone-number tier limits (250 / 1K / 10K / 100K per 24h) and burst limits (~80 msg/sec/phone), separate from the global 550 ms email throttle.

**Changes**
- `supabase/functions/_shared/wa-rate-limit.ts` (new)
  - `enforceWaPacing(workspaceId, phoneNumberId)` — sleeps to keep sends under ~25/sec per phone (safe under Meta's 80/sec cap while leaving headroom).
  - `checkDailyTier(phoneNumberId)` — reads today's count from `whatsapp_messages`; if within 10% of the workspace's `whatsapp_settings.tier_limit` (new column, defaults to 1000), returns a soft-warn flag; if over, returns hard-stop.
- `execute-campaign/index.ts` — for WA legs, call `enforceWaPacing` before each send instead of the flat 550 ms sleep.
- `execute-workflow` + `process-scheduled-jobs` — same call before WA sends.
- Migration: `ALTER TABLE public.whatsapp_settings ADD COLUMN IF NOT EXISTS tier_limit int DEFAULT 1000;`
- `whatsapp-sync-templates` (or a new `whatsapp-sync-phone`) — populate `tier_limit` from Meta's `messaging_limit_tier` on the phone number.

**Out of scope:** dynamic tier upgrade detection, per-recipient dedup, marketing-message frequency caps.

---

## Gap 4 — Template-category compliance

**Goal:** Enforce Meta's rules — MARKETING templates require opt-in and honor unsubscribe; UTILITY/AUTHENTICATION templates must be transactional and cannot be used for promo blasts.

**Changes**
- `whatsapp_templates` already stores `category` from Meta sync. Add a runtime guard in `whatsapp-send/index.ts`:
  - If the resolved live template's `category === 'MARKETING'`:
    - Reject the send if the lead's `tags` include `unsubscribed` or `wa_opted_out` (return `success:false, reason:'opted_out'`).
    - Require the lead to have an opt-in marker (`wa_opt_in_at` on `leads`, new column) OR the workspace's `whatsapp_settings.assume_opt_in = true` (existing pattern for imported lists).
  - If `category === 'UTILITY'` or `'AUTHENTICATION'` and the send is coming from a `campaign` (not a workflow/transactional trigger), log a warning to `whatsapp_messages.compliance_note` but do not block (Meta enforces on their side).
- Migration:
  ```sql
  ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS wa_opt_in_at timestamptz;
  ALTER TABLE public.whatsapp_settings ADD COLUMN IF NOT EXISTS assume_opt_in boolean DEFAULT false;
  ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS compliance_note text;
  ```
- `src/components/settings/WhatsAppTemplatesTab.tsx` — show category badge (MARKETING / UTILITY / AUTHENTICATION) on each template card so users pick the right one.
- `CreateCampaignDialog.tsx` — when a WA template is selected and its `category === 'MARKETING'`, show an "audience opt-in required" hint.

**Out of scope:** building a full double-opt-in flow, WhatsApp-native unsubscribe keyword handler (already partially in `whatsapp-webhook`), template submission UI.

---

## Technical notes

- All new columns are additive with defaults → no data migration risk.
- `enforceWaPacing` uses in-memory per-cold-start token bucket; acceptable because edge functions are short-lived and Meta's 80/sec is a per-second cap, not per-hour.
- Status transitions are guarded by an enum ordering check so out-of-order webhooks (Meta sometimes retries) don't regress `read` back to `sent`.
- No changes to Twilio path, credit accounting, or preview/`hello_world` behavior.

## Deliverables

1. Migration for `tier_limit`, `wa_opt_in_at`, `assume_opt_in`, `compliance_note`.
2. New `_shared/wa-rate-limit.ts`.
3. Patched `whatsapp-webhook`, `whatsapp-send`, `execute-workflow`, `execute-automation`, `execute-campaign`.
4. UI badges/hints on `WhatsAppTemplatesTab` and `CreateCampaignDialog`.
5. Verify via `curl_edge_functions` that a MARKETING send to an opted-out lead returns `success:false, reason:'opted_out'` and a status webhook advances a `campaign_messages` row from `delivered` → `read`.
