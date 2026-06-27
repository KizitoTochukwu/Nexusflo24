# Enable WhatsApp Auto-Reply — Step-by-Step

Your WhatsApp channel is connected (WABA `2185231005596249`, phone `+44 7724 710175`), the webhook function is deployed, and a verify token is already stored encrypted in your Channels settings. We just need to (1) subscribe the webhook in Meta with that token, (2) pick an approved template, and (3) live-test.

Because verify tokens are stored encrypted and cannot be decrypted to the UI, the cleanest path is to **set a fresh verify token now** in Channels settings, paste that same value into Meta, then subscribe `messages`.

---

## Step 1 — Set a fresh Verify Token in NexusFlo24

1. Open **Dashboard → Settings → Channels → WhatsApp**.
2. In the **Verify Token** field, paste a strong random string (any value you'll remember for the next 2 minutes), e.g. `nflo24-wa-verify-9X7p2QmK`.
3. Click **Save**. (This re-encrypts it server-side; the value is what Meta must echo back.)

Keep this value on your clipboard for Step 2.

---

## Step 2 — Subscribe the Webhook in Meta

1. Go to **Meta Business → WhatsApp → Configuration → Webhook**.
2. Click **Edit** on the Callback URL row.
3. Paste:
   - **Callback URL:** `https://stuaikfyuwcjmchcvfie.supabase.co/functions/v1/whatsapp-webhook`
   - **Verify Token:** the exact string from Step 1.
4. Click **Verify and Save**. Meta will `GET` the URL with `hub.challenge`; our function decrypts every active workspace token and echoes the challenge back when it matches. You should see a green tick.
5. Under **Webhook fields**, click **Manage** and **Subscribe** to:
   - `messages` (required — inbound text + statuses)
   - Optional: `message_template_status_update`
6. Confirm the WABA `2185231005596249` shows the webhook as **Subscribed**.

---

## Step 3 — Sync templates and choose a default re-engagement template

Currently `default_reengagement_template_id` is empty, so re-engagement outside the 24h window will fail.

1. **Settings → Channels → WhatsApp → Sync templates from Meta** (runs `whatsapp-sync-templates`).
2. Once loaded, open the **Templates** tab.
3. Pick one with `status = APPROVED` (Meta-approved) and click **Set as default re-engagement template**.

If you have none approved yet, submit a UTILITY template like:
> "Hi {{1}}, thanks for messaging NexusFlo24. A team member will reply shortly."

---

## Step 4 — Live test

1. From a **different** phone, send any message (e.g. "hello") to **+44 7724 710175**.
2. Within ~5 seconds the AI Sales Closer should reply.

After your test, tell me you've sent the message and I'll inspect:
- `whatsapp-webhook` logs → confirm POST + HMAC verified
- `social_messages` / `sales_conversations` → inbound stored, thread created
- `whatsapp-send` logs → confirm outbound auto-reply dispatched
- Any failure surface (template not approved, 24h window, credit gating)

---

## Technical notes (for your reference)

- The webhook handler validates Meta's `X-Hub-Signature-256` HMAC using `META_APP_SECRET` — already set, no action needed.
- Verify-token matching iterates every active `whatsapp_settings` row and compares the decrypted value, so multi-workspace setups work without per-row config in Meta.
- Auto-reply is fired by the **AI Sales Closer** intent classifier on inbound `messages`. It only fires when the workspace has an active WhatsApp connection (✅ you do) and either the chat is inside Meta's 24h window OR a default re-engagement template is set (Step 3).

Ready to proceed? Confirm once you've completed Step 1 and I'll stand by for your live test.
