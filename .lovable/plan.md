

# Campaign Feature Audit — Findings & Plan

## Current State

After thorough investigation, the Campaign feature has these gaps:

### What Works
- **CRUD operations**: Create, read, update, delete campaigns — fully wired to the `campaigns` table
- **AI copy generation**: The `generate-campaign-copy` edge function is deployed and functional
- **Campaign details drawer**: Shows stats, sequence timeline, delivery log
- **Analytics tab**: Charts and metrics from campaign data
- **Triggered campaign config**: UI captures trigger type, value, and actions

### What's Missing (Not Firing)

1. **No campaign execution engine**: There is no edge function (e.g., `execute-campaign` or `send-campaign`) that actually sends messages to leads when a campaign is activated. Setting a campaign to "active" only updates the DB status — nothing dispatches emails, WhatsApp, or SMS.

2. **No audience resolution**: The `audience_filter` field is saved as `{}` but there's no logic to query matching leads and iterate over them to send messages.

3. **No `campaign_messages` insertion**: No code anywhere inserts rows into `campaign_messages`. The delivery log and sequence timeline will always be empty.

4. **No triggered campaign listener**: While `capture-lead` fires automations for `new_lead` triggers, it does NOT check or fire triggered campaigns. The campaign trigger config (tag_added, score_threshold, etc.) is stored but never evaluated.

5. **No scheduled campaign processor**: Campaigns with `scheduled_at` are saved but nothing picks them up at the scheduled time.

## Plan

### 1. Create `execute-campaign` edge function
- Accept `campaign_id` and optional `lead_ids` override
- Load campaign config (channel, message_content, audience_filter, fallback_settings)
- Resolve audience: query leads matching filters (or all workspace leads if no filter)
- For each lead, call the existing `email-send`, `whatsapp-send`, or `sms-send` functions
- Insert a `campaign_messages` row per lead with delivery status
- Update campaign `sent_count`, `open_rate` stats
- Handle fallback logic: schedule fallback sends using `scheduled_jobs` table

### 2. Add "Send Now" / "Launch" button to UI
- In `CampaignDetailsDrawer` and/or the campaign table, add a "Send Campaign" action for broadcast campaigns in `draft` or `active` status
- Show confirmation dialog before sending
- Call `execute-campaign` edge function
- Show progress/toast feedback

### 3. Wire triggered campaigns into `capture-lead`
- In `capture-lead` function, after inserting automations, also query `campaigns` with `campaign_mode = 'triggered'` and matching `trigger_config.type`
- Invoke `execute-campaign` with the single new lead

### 4. Add scheduled campaign support to `process-scheduled-jobs`
- Query campaigns with `status = 'scheduled'` and `scheduled_at <= now()`
- Invoke `execute-campaign` for each
- Update status to `active` → `completed`

### 5. Add audience filter UI (basic)
- In step 1 or a new step of CreateCampaignDialog, allow filtering by lead status, tags, or score range
- Save to `audience_filter` JSON field

### Technical Details

- The `execute-campaign` function will use the service role key to read leads and insert campaign_messages
- It will reuse existing `email-send`/`whatsapp-send`/`sms-send` functions for actual delivery
- Fallback sends will be scheduled via the existing `scheduled_jobs` + `process-scheduled-jobs` infrastructure
- Config: `verify_jwt = false` with internal auth validation

