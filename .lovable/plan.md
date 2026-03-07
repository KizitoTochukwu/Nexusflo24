

## Diagnosis: Automation Not Triggering for New Leads

### What's Working
- Form capture is fully functional -- leads are being created, `form_submit` activities logged, notifications sent.
- The `capture-lead` function IS calling `execute-automation` for new leads.
- The automation (42d1c97f) IS active with `trigger_type: new_lead`.

### Root Cause: Config Key Mismatch
The automation steps store the action type as `config.action` (e.g., `{ "action": "send_email", "subject": "...", "message": "..." }`), but the `execute-automation` function reads `config.action_type || config.channel` on line 120:

```
const actionType = config.action_type || config.channel;
```

This evaluates to `undefined`, causing every action step to hit the `else` branch: `"Unknown action type: undefined"` → status `skipped`.

Additionally, delay steps are logged as `skipped` because live delay execution isn't implemented, which means all subsequent steps after the first email would also need delay queue support -- but the immediate problem is that **not even the first email is sent**.

### Fix

**File: `supabase/functions/execute-automation/index.ts`** (line 120)

Change:
```typescript
const actionType = config.action_type || config.channel;
```
To:
```typescript
const actionType = config.action || config.action_type || config.channel;
```

This single-line fix will resolve the entire issue -- the first email in the sequence will be sent immediately upon lead capture, and subsequent action steps will also execute (though delay steps will still be skipped/logged as unsupported).

### Scope
- 1 file changed, 1 line modified
- No database changes needed

