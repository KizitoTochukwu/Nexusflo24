

## Fix: Update Lead Status Action Key Mismatch

**Problem**: The UI saves the chosen pipeline stage as `config.new_status`, but the edge function reads `config.status` — so the lead is never actually updated.

### Change

**File**: `supabase/functions/execute-automation/index.ts` — line 265

Change:
```typescript
const newStatus = config.status;
```
To:
```typescript
const newStatus = config.new_status || config.status;
```

This reads the correct UI key (`new_status`) while keeping backward compatibility with any legacy data that used `status`.

**Redeploy**: `execute-automation` edge function.

### Technical Detail

- `AutomationStepEditor.tsx` line ~176: `updateStep(i, { new_status: v })` — writes `new_status`
- `execute-automation/index.ts` line 265: reads `config.status` — never matches

One-line fix, one redeploy.

