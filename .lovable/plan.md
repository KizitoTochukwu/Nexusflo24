# Instagram & Facebook Comment/DM Lead Capture

## What you're asking for

A creator workflow:
1. You post on IG/FB and tell people **"Comment START"** (or DM a keyword).
2. The moment they do, NexusFlo24 instantly **DMs them** a personalized reply with your lead-capture link / offer / landing page.
3. Their name + IG handle gets saved as a **lead** in your CRM, tagged by post/keyword, and dropped into a follow-up automation (email/WhatsApp drip).

This is the same pattern as ManyChat / MobileMonkey. NexusFlo24 doesn't have it yet — today the platform only handles WhatsApp inbound replies, not IG/FB. We need to add it.

## What's already in place (good news)

- WhatsApp Cloud API webhook already receives inbound messages, auto-creates leads, and fires triggered campaigns. We can mirror that exact pattern for Instagram/Facebook.
- Automation triggers, campaigns, lead dedup, AI auto-reply, and tag-based routing already exist — IG/FB just becomes a new **channel** feeding into them.
- Meta WhatsApp credentials are already encrypted and stored per workspace, so we have the encryption pattern to reuse.

## What needs to be built

### 1. Meta (Instagram + Facebook) channel settings
A new **"Instagram & Facebook"** tab in Settings → Channels where you connect:
- A Facebook Page (required — IG business accounts must be linked to a Page)
- The connected Instagram Business/Creator account
- Page Access Token + IG Business Account ID (encrypted, like WhatsApp)
- Webhook verify token

You'll do a one-time Meta login (Facebook Login for Business) and pick which Page/IG account to connect.

### 2. New edge functions
- `meta-webhook` — receives IG/FB events from Meta (comments on posts, DMs to your Page/IG inbox). Verifies the signature, looks up workspace by Page ID, creates/updates the lead, logs the message.
- `meta-send` — sends a DM via the Instagram Graph API or Messenger Send API. Used for instant auto-replies and for any campaign step targeting the IG/FB channel.
- `meta-save-settings` — encrypts and stores Page tokens per workspace (mirrors `whatsapp-save-settings`).

### 3. New automation triggers
Add to the trigger library:
- **Instagram comment with keyword** — fires when someone comments on a specified post (or any post) containing a keyword like `START`. Config: post ID (or "any post"), keyword(s), match mode (exact / contains).
- **Instagram DM received (keyword)** — fires when someone DMs your IG account with a keyword.
- **Facebook comment with keyword** and **Facebook Messenger DM (keyword)** — same for FB Pages.

These plug straight into the existing automation engine — same UI, same step builder.

### 4. New automation actions
- **Send Instagram DM** / **Send Messenger DM** — delivers a templated message (with the lead's first name, your link, etc.) via `meta-send`. Available as a step in the automation/campaign builder alongside Email / WhatsApp / SMS.

### 5. Lead creation rules
When a comment/DM matches a keyword:
- Look up the lead by IG/FB user ID (stored in a new `social_handle` field on `leads`, or in `lead_meta`).
- If new → create lead with `source = "instagram_comment"` (or similar), `full_name` from their profile, tag with the post/campaign name.
- Log the inbound message to a new `social_messages` table (parallel to `whatsapp_messages`).
- Fire the matching triggered automation immediately.

### 6. Dashboard UI
- **Settings → Channels → Instagram/Facebook**: connect button, status, test send, list of connected pages.
- **Automations → Create**: new trigger options "Instagram comment", "IG DM", "FB comment", "Messenger DM" with keyword config and post picker.
- **Inbox**: extend the unified inbox to show IG/FB threads alongside WhatsApp/SMS/email (uses the same threaded UI).
- **Lead drawer**: show IG handle and link to the conversation.

## How you'd set it up (end-user flow, once built)

1. Settings → Channels → **Connect Instagram & Facebook** → log in with Facebook → pick your Page + IG account → done.
2. Automations → **+ New Automation** → trigger: **"Instagram comment with keyword"** → pick post (or "any post") → keyword: `START`.
3. Add steps:
   - **Send IG DM**: "Hey {{first_name}}! Here's the link you asked for: {{link}}"
   - **Wait 1 hour** → **Send Email**: full nurture sequence
   - **Tag lead**: `ig-launch-oct`
4. Activate. Post your IG content telling viewers to comment `START`. Leads start flowing into CRM automatically.

## Technical details

**Meta API basics**
- Instagram Graph API requires an IG Business/Creator account linked to a Facebook Page.
- Webhook subscriptions needed: `feed` (page comments), `mention`, `messages`, `messaging_postbacks`, `instagram` (comments + DMs).
- Permissions: `pages_manage_metadata`, `pages_read_engagement`, `pages_messaging`, `instagram_basic`, `instagram_manage_comments`, `instagram_manage_messages`, `business_management`.
- IG DMs: only allowed within a 24h window after user-initiated contact (a comment on your post counts as initiation for the auto-DM use case under Meta's "private replies" API — `POST /{ig-user-id}/messages` with `recipient: { comment_id }`).
- Comment private replies are sent **once per comment** (Meta restriction) — handled by deduping on `comment_id`.

**Required user input (after approval)**
You will need a **Meta Developer App** (free) with Instagram + Messenger products enabled, and the App ID/Secret. I'll guide you through creating it — takes ~10 min.

**Schema additions**
- `meta_settings` (workspace_id, page_id, ig_user_id, page_token_encrypted, verify_token_encrypted, is_active)
- `social_messages` (workspace_id, lead_id, platform, direction, external_id, body, status, comment_id?)
- `leads.social_handles` jsonb (e.g. `{ instagram: "@jane", facebook_user_id: "..." }`)
- New trigger types in automations: `instagram_comment`, `instagram_dm`, `facebook_comment`, `facebook_dm`.

**Reused infrastructure**
- Encryption pattern: same AES-GCM helper used by `whatsapp-webhook`.
- Lead dedup, scoring, hot-lead alerts, AI Sales Closer auto-reply: all kick in automatically since IG becomes a normal inbound channel.
- 550ms throttle on outbound DMs (project standard).

## Suggested rollout (2 phases)

**Phase 1 — MVP (this build)**
- Meta channel settings UI + encrypted token storage
- `meta-webhook` + `meta-send` edge functions
- Two triggers: **Instagram comment with keyword**, **Instagram DM with keyword**
- One action: **Send Instagram DM**
- Auto-create lead + tag + fire automation
- Settings test button ("Send test DM to my own IG")

**Phase 2 — extension (later, if you want)**
- Facebook Page comments + Messenger DMs (same plumbing, different endpoints)
- Unified inbox tab for IG/FB threads
- Story mention triggers, IG ads lead-form ingestion (Meta Lead Ads webhook)
- Public app review submission to Meta so any NexusFlo24 user can connect their own IG without dev-mode limits

## What I need from you to proceed

After you approve, I'll ask for:
1. Confirmation to build **Phase 1 (Instagram first)** or **Phase 1 + 2 (IG + FB together)**.
2. Your **Meta App ID + App Secret** (I'll walk you through creating the app on developers.facebook.com — 10 min).
3. The IG account / FB Page you want to connect for testing.

Once those are in, I'll wire it up end-to-end and you'll be able to run your first "Comment START" campaign.
