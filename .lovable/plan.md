# Why your user never gets "assigned owner" notifications

## What "Assign Owner" does today

Three places set `leads.assigned_owner_id`, and **all three are silent** to the new owner:

### 1. `execute-automation` → `assign_owner` action (lines 770–818)
- Picks a user (specific or `assign_next_round_robin` RPC)
- `UPDATE leads SET assigned_owner_id = ...`
- Inserts a `lead_activities` row of type `owner_assigned`
- **Stops there.** No `notifications` insert, no email, no SMS, no WhatsApp, no push.

### 2. `execute-workflow` → `assign_owner` node (lines 235–243)
- Same update, **without** even the `lead_activities` audit row
- No notification of any kind

### 3. `capture-lead` round-robin on lead intake (line 248)
- Sets `assigned_owner_id` at lead creation
- Same story — silent

There is **no DB trigger** on `leads.assigned_owner_id` change, and no out-of-app channel anywhere.

## So why the user "never gets" them

1. **Action was never wired to notify anyone** — by design today, it's a pure DB write.
2. Even the bell/in-app notification drawer is empty for owner assignment, because no row is inserted into `notifications`.
3. If they built the rule in the **Workflow** editor, there's not even an activity log entry — fully invisible.
4. Manual reassignment from the UI (if added later) would also need to honour the same rule.

## Proposed fix — Assign Owner v2 (mirrors the Notify Sales v2 we just shipped)

Make assignment a **first-class notification event** to the **newly assigned owner**, with sensible defaults and channel toggles in the step config.

### Defaults (no config required, backwards compatible)
- Recipient: **the newly assigned owner** (always)
- Channels: **In-app + Email** ON by default; **SMS / WhatsApp** OFF
- Title: `New lead assigned to you`
- Message: `{{lead.name}} ({{lead.email}}) was just assigned to you.` with deep link to the lead in CRM

### New step config (optional overrides on the chip)
- `notify_new_owner`: boolean (default `true`) — lets power users disable notifications for silent re-routing
- `channels`: multi-select `["inapp","email","sms","whatsapp"]`
- `also_notify`: optional list of `["creator","previous_owner","all_admins"]` for handover scenarios
- `title` / `message` with `{{lead.*}}` and `{{owner.*}}` interpolation

### Runtime behaviour (`execute-automation` + `execute-workflow`)
```text
assign_owner
 ├─ Resolve assignedUserId (specific | round_robin)
 ├─ UPDATE leads.assigned_owner_id
 ├─ INSERT lead_activities (owner_assigned)   ← also added to workflow path
 ├─ If notify_new_owner != false:
 │    ├─ Resolve recipients (new owner + optional also_notify set)
 │    ├─ For each recipient:
 │    │    ├─ INSERT notifications (in-app + bell + browser push)
 │    │    ├─ if email channel + profile.email → email-send
 │    │    ├─ if sms channel   + profile.phone → sms-send
 │    │    └─ if wa channel    + profile.phone → whatsapp-send (24h fallback rule)
 │    └─ Step status = "completed" if at least the assignment succeeded; delivery failures are non-fatal (chain continues)
 └─ Skip all delivery if assignedUserId == previous owner (no-op reassignment)
```

The fan-out helper is the same one we built for `notify_sales` — extract it into `_shared/notify-recipients.ts` so both actions share one well-tested code path.

### Bonus: cover the silent capture path

In `capture-lead`, after the round-robin assignment writes `assigned_owner_id`, fire the same notification helper so reps get pinged for inbound leads too. Gate behind a workspace setting `notify_owner_on_capture` (default ON) so workspaces with very high lead volume can opt out.

### Bonus: DB trigger as a safety net (optional, recommended)

Add a `BEFORE UPDATE` trigger on `public.leads` that, when `assigned_owner_id` actually changes, inserts a `notifications` row for the new owner. This guarantees **manual reassignments** from any UI surface also notify the owner — without us having to remember to wire it everywhere. Out-of-app channels (email/SMS/WA) stay in the edge function path so we don't blast `pg_net` from triggers.

## UI changes

`src/components/automations/AutomationStepEditor.tsx` — when action = `assign_owner`, extend the existing config block with:
- Toggle: **"Notify the new owner"** (default ON)
- Channel pills: In-app / Email / SMS / WhatsApp
- Optional **"Also notify"** chips: Creator / Previous owner / Admins
- Title + Message inputs with the existing `{{token}}` helper
- Hint: "Email/SMS/WhatsApp require the recipient's profile contact info — missing contacts are skipped."

`src/lib/automations/smartActionValidation.ts` — extend `assignOwnerDefaults` with the new optional fields (all `.optional()` so existing chips stay valid).

## Backwards compatibility
- Existing `assign_owner` chips get defaults applied at runtime: `notify_new_owner = true`, `channels = ["inapp","email"]`, `also_notify = []`.
- No DB migration needed for the action config (JSONB).
- Optional trigger is additive and safe to add later.

## Quick diagnostic for the complaining user (no code change)

```sql
-- Was the lead actually reassigned to that rep?
select id, assigned_owner_id, updated_at from leads where id = '<lead_id>';

-- Was the activity logged?
select * from lead_activities where lead_id = '<lead_id>' and type = 'owner_assigned' order by created_at desc;

-- Was any notification ever created for them?
select count(*) from notifications where user_id = '<rep_user_id>' and created_at > now() - interval '7 days';
```
If the first two return rows but the third returns `0`, you've confirmed the gap — exactly what this plan closes.

## Out of scope (call out, don't build now)
- Quiet hours / Do-Not-Disturb windows
- Acknowledge / accept-or-reassign workflow
- Slack / Teams webhooks for assignment
- Escalation if owner doesn't act within N hours
