## Fix the broken `email_opened` condition

The Value Delivery automation is mis-firing because the YES arm never triggers — every lead is treated as "didn't open" and gets `cold-lead`.

### Root cause

`execute-automation` and `execute-workflow` both check `email_logs.status='opened'`, but no code path writes that row. Pixel hits live in `lead_activities` (`type='email_open'`). Other conditions like `link_clicked` already query `lead_activities` correctly — `email_opened` was the outlier.

### Changes

**1. `supabase/functions/execute-automation/index.ts` (lines 645–651)**
Swap the broken `email_logs` query for the existing `countActivities` helper:
```ts
} else if (conditionType === "email_opened") {
  const c = await countActivities((q) => q.eq("type", "email_open"));
  passed = evalHappened(c);
}
```
This automatically respects `time_window_days` and the `not_happened` operator.

**2. `supabase/functions/execute-workflow/index.ts` (lines 35–43)**
Same swap in both `if_email_opened` and `if_email_not_opened`:
```ts
case "if_email_opened": {
  const { count } = await supabase.from("lead_activities").select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId).eq("lead_id", leadId).eq("type", "email_open");
  return (count ?? 0) > 0;
}
case "if_email_not_opened": {
  const { count } = await supabase.from("lead_activities").select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId).eq("lead_id", leadId).eq("type", "email_open");
  return (count ?? 0) === 0;
}
```

**3. Deploy**
Redeploy `execute-automation` and `execute-workflow` so the fix takes effect.

### Why not write `email_logs.status='opened'` from `track-open` instead?

`email_logs` is the dashboard's append-only send log — adding open rows would inflate "sent" counts and break analytics. `lead_activities` is the canonical event store and matches every other condition's pattern.

### After this ships

Value Delivery fires accurately end-to-end:
- Opened → "How NexusFlo24 works" + tag `engaged` + score +10
- Not opened → resend with new subject + tag `cold-lead`
