## Fix duplicate `lead_activities` insert in `capture-lead`

**Problem**: `supabase/functions/capture-lead/index.ts` inserts the same `form_submit` activity row twice (lines ~243–259), creating duplicate entries in every lead's activity timeline and double-counting score deltas (the score trigger adds +10 per insert, so each form submit currently adds +20).

**Fix**: Remove the second (duplicate) `lead_activities` insert block. Keep only one insert with the same payload.

### Change

In `supabase/functions/capture-lead/index.ts`, delete the second of the two identical blocks:

```ts
// Log activity
await supabase.from("lead_activities").insert({
  lead_id: leadId,
  user_id: ownerId,
  workspace_id: workspaceId,
  type: "form_submit",
  meta: meta,
});
```

Result: one activity row per submission, correct +10 score delta, accurate timeline.

### Deploy

Redeploy the `capture-lead` edge function so the fix goes live immediately.

### Out of scope

- No DB migration (existing duplicate rows in history are left as-is unless you want a cleanup script).
- No changes to the form renderer, routing, notifications, or automations.
