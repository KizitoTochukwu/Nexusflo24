

## Wire Up Condition Step Evaluation in execute-automation

**Problem**: The UI saves condition steps as `{ condition: "score_gt" | "has_tag" | "source_equals", value: "..." }`, but the edge function reads `config.field` and `config.operator` — fields that are never set. Every condition silently fails (no operator matches → `passed = false` → workflow stops).

### Change

**File: `supabase/functions/execute-automation/index.ts`** — Replace the `case "condition"` block (lines 287–305) to read `config.condition` and `config.value` instead of `config.field`/`config.operator`:

```typescript
case "condition": {
  const conditionType = config.condition;
  const value = config.value;
  let passed = false;

  if (conditionType === "score_gt") {
    passed = Number(lead.score || 0) > Number(value);
  } else if (conditionType === "has_tag") {
    passed = (lead.tags || []).includes(String(value));
  } else if (conditionType === "source_equals") {
    passed = String(lead.source || "").toLowerCase() === String(value || "").toLowerCase();
  }
  // Fallback: legacy field/operator format
  else if (config.field && config.operator) {
    const leadValue = (lead as any)[config.field];
    if (config.operator === "equals") passed = String(leadValue) === String(value);
    else if (config.operator === "not_equals") passed = String(leadValue) !== String(value);
    else if (config.operator === "contains") passed = String(leadValue || "").includes(String(value));
    else if (config.operator === "greater_than") passed = Number(leadValue) > Number(value);
    else if (config.operator === "less_than") passed = Number(leadValue) < Number(value);
    else if (config.operator === "has_tag") passed = (lead.tags || []).includes(value);
    else if (config.operator === "not_has_tag") passed = !(lead.tags || []).includes(value);
  }

  if (!passed) skipRemaining = true;
  details = { conditionType: conditionType || config.field, value, passed };
  status = passed ? "success" : "condition_failed";
  break;
}
```

This maps the three UI conditions directly:
- **score_gt** → compares `lead.score` against the threshold value
- **has_tag** → checks if the tag exists in `lead.tags` array
- **source_equals** → case-insensitive match on `lead.source`

Legacy `field`/`operator` format is preserved as a fallback.

**Redeploy**: `execute-automation` edge function.

