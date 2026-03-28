

## Plan: Make Human Handoff Alert Message More Obvious

### What Changes
Update the WhatsApp/SMS alert message in `supabase/functions/nexus-ai-chat/index.ts` to be more urgent, eye-catching, and actionable.

### New Message Format
```
🚨🚨 URGENT: Human Agent Needed! 🚨🚨

A website visitor wants to speak with your team RIGHT NOW.

👤 Visitor: {Name}
📧 Email: {email}

⚡ Respond quickly — don't lose this lead!

👉 Continue the conversation here:
https://nexusflo24.lovable.app/dashboard/messages
```

### File Changed
- `supabase/functions/nexus-ai-chat/index.ts` — Update `alertMsg` string (line ~140) with the new urgent format

