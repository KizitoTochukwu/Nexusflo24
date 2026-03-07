

## Plan: Improve Email Action Editor in Automation Step Editor

### What Changes
A single file edit to `src/components/automations/AutomationStepEditor.tsx`, targeting the `send_email` / `send_whatsapp` / `send_sms` action block (lines ~148-161).

### Changes

**Replace the cramped Input + inline variables** with:

1. A full-width container with a subject line Input (for email) and a large `<Textarea>` for the message body
2. Textarea specs: `min-h-[240px]`, `text-base`, `leading-relaxed`, padding, soft border (`border-muted`), rounded, scrollable
3. Move the `{{first_name}}` etc. variables into a separate helper row of clickable `<Badge>` elements below the textarea — clicking inserts the variable at cursor position
4. The action card layout switches from `flex-wrap` to a vertical `space-y-3 w-full` layout when a messaging action is selected, so the editor takes full card width
5. Add a subtle label ("Message Template" / "Email Body") above the textarea for clarity

### Scope
- Only `AutomationStepEditor.tsx` is modified
- No new components or dependencies
- Import `Textarea` from `@/components/ui/textarea`

