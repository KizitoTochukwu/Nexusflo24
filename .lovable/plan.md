## Diagnosis: Does WhatsApp Send actually fire?

**Yes — the pipeline fires and the Graph API is being called.** But there are two real reasons a recipient may "not receive" the message you intended, both confirmed in the database.

### What the data shows (last 14 days, outbound)

| Status | Type | Count |
|--------|------|-------|
| read | text | 4 |
| read | template | 3 |
| delivered | template | 2 |
| **failed** | **template** | **12** |

So most outbound traffic in the last 2 weeks went through `hello_world` as a template — and 12 of those failed at the Graph API level. Free-form `text` messages (24h window open) all succeeded.

### Root cause of the user complaint

In `supabase/functions/whatsapp-send/index.ts` (lines 207-218), when no inbound message exists in the last 24h, the code silently rewrites the send as the Meta-provided `hello_world` template:

```ts
effectiveTemplate = { name: "hello_world", language: "en_US" };
autoTemplated = true;
```

This means:

1. **The user's actual message body is NEVER delivered.** Meta's `hello_world` template just says "Hello World" — the recipient receives that, not the campaign content. Your DB log appends `[auto-sent as template: hello_world]` but the recipient sees nothing of the real message.
2. **For numbers outside the WhatsApp Business Account's allowed test list, even `hello_world` fails** (graph error 131000/131026/131047) — which matches the 12 failed template sends in the data.
3. The UI/campaign drawer shows "delivered" or "sent" because the Graph 200 response is treated as success, even though the recipient got "Hello World" or nothing at all.

So the user who reported "didn't receive a WhatsApp message" almost certainly:
- Either received `hello_world` (and didn't recognize it as your message), or
- Was outside the 24h window AND not on the WABA's verified template-recipient list, so even `hello_world` was rejected.

### Secondary issues found

- One failed log still has raw `{{FirstName}}` in the body — that send originated from a path that bypassed the new interpolation normalizer (likely a legacy scheduled job).
- Another failed log contains raw `<p data-start="…">` HTML — the rich-text editor's HTML leaked through despite the `htmlToPlainText` strip (works only for new sends; old `scheduled_jobs` payloads were saved before the strip was added).

---

## Plan

### 1. Fix the silent `hello_world` fallback (highest impact)

Stop pretending we delivered the user's message when we actually sent "Hello World".

- In `whatsapp-send/index.ts`, when the 24h window is closed and no caller-supplied template exists:
  - **Do not auto-substitute `hello_world`.** Instead, fail fast with a clear, structured error: `WHATSAPP_WINDOW_CLOSED`, returning HTTP 200 + `{ success: false, fallback: true, reason: "window_closed" }` so callers (campaign/automation/inbox) can react.
  - Log the failed attempt to `whatsapp_messages` with `status='failed'` and `error='24h window closed — approved template required'`.
- In `execute-campaign/index.ts`: treat `fallback: true` from whatsapp-send the same as a hard send failure — immediately schedule the configured fallback channel (SMS/Email) instead of silently "succeeding".
- In `execute-automation` and the messages inbox: surface the same error to the UI ("Last inbound > 24h ago. Send an approved template or wait for a reply.").

### 2. Allow per-workspace approved templates (proper long-term fix)

`hello_world` is a placeholder. Real campaigns need approved templates registered in the workspace's WhatsApp Business Account.

- Add a `whatsapp_templates` table (workspace_id, name, language, body_preview, status, components_schema) populated by the user in **Settings → Channels → WhatsApp**.
- In the campaign editor, when channel = WhatsApp, add a "Send as template (re-engagement)" toggle that lets the user pick one of their approved templates and map `{{1}}, {{2}}` to lead variables.
- `whatsapp-send` accepts that template payload (already supported via the `template` arg) and uses it instead of free text when the window is closed.

### 3. Clean up legacy raw-HTML / unresolved-token sends

The two failed records with raw `{{FirstName}}` and raw `<p>` HTML come from `scheduled_jobs` rows enqueued before the recent fixes.

- In `process-scheduled-jobs`, run the same `htmlToPlainText` + `interpolateText` normalization on the payload body just before dispatch (defense in depth). This protects any old queued jobs.
- Add a one-time SQL cleanup to mark stale pending `whatsapp` jobs older than 7 days as `failed` with reason `stale_payload`.

### 4. Make delivery status truthful in the UI

Right now the Campaign Details Drawer shows "delivered" for any 200 response from Graph, even when Meta later marks it `failed` via webhook.

- Show the latest webhook status (`sent → delivered → read → failed`) per `wa_message_id` rather than the initial insert status.
- Add a small badge "(re-engagement template)" next to messages where `autoTemplated = true` so the workspace owner can see when their actual content didn't go through.

### 5. Add a diagnostic to Channel Settings

Add a "Send test WhatsApp" button on **Settings → Channels → WhatsApp** that:
- Calls `whatsapp-send` with `preview: true` to a phone the admin enters
- Surfaces the exact Graph error (code, subcode, message) inline — including "this number is not on your WABA's allowed list" cases
- Saves a record so support can debug.

---

## Technical summary

**Files to edit**
- `supabase/functions/whatsapp-send/index.ts` — remove auto `hello_world` fallback, return structured `fallback: true` payload, always log failed attempt.
- `supabase/functions/execute-campaign/index.ts` — treat `fallback: true` like `failed` and trigger the campaign's configured fallback channel immediately.
- `supabase/functions/execute-automation/index.ts` — same treatment + log a `notification` for the workspace owner.
- `supabase/functions/process-scheduled-jobs/index.ts` — re-run `htmlToPlainText` + `interpolateText` on payload right before dispatch.
- `src/components/campaigns/CampaignDetailsDrawer.tsx` — show webhook-driven status + auto-template badge.
- `src/components/settings/ChannelSettingsTab.tsx` — add "Send test WhatsApp" button + inline error surfacing.
- `src/components/campaigns/CreateCampaignDialog.tsx` — add template selector for WhatsApp channel.

**New table** (migration)
- `whatsapp_templates(id, workspace_id, name, language, status, components_schema jsonb, created_at, updated_at)` with RLS scoped to workspace members.

**Edge functions to deploy after changes**
- `whatsapp-send`, `execute-campaign`, `execute-automation`, `process-scheduled-jobs`.

**Behavior change to call out to users**
- Existing campaigns that rely on free-form text outside the 24h window will start surfacing "window closed" errors instead of silently sending `hello_world`. This is the correct behavior — the previous behavior was misleading.

Approve and I'll switch to default mode and implement steps 1, 3, 4, and 5 in one pass. Step 2 (template marketplace UI) is larger — I can do it in a follow-up if you'd like to ship the critical fixes first.