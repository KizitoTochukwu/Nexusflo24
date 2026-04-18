
The user is asking a research question about how the platform notifies sales teams and what happens in that flow. This is informational — no plan/implementation needed. I'll answer directly based on my knowledge of the codebase.

Key notification surfaces I know exist:
1. **In-app notifications** (`notifications` table, NotificationBell component)
2. **Browser push** (`usePushNotifications` hook)
3. **Email notification** to workspace owner via Resend (in `capture-lead`)
4. **Hot Lead alert** (DB trigger `update_lead_score_on_activity` → notification when score ≥81)
5. **AI Sales Closer human handoff** ([HUMAN_HANDOFF] tag → SMS/WA agent alerts per memory)
6. **Automation triggers** firing email/SMS/WhatsApp follow-ups
7. **Campaign triggers** for `new_lead` triggered campaigns

I should give a concise, structured answer covering each channel and what action it kicks off. No code changes, no plan tags needed for pure Q&A.
