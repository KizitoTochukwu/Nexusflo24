

# Post to LinkedIn Company Page Instead of Personal Profile

## Problem
The current edge function posts to your personal LinkedIn profile using `urn:li:person:...`. To post to your **NexusFlo24 Company Page**, we need to use an organization URN instead.

## What needs to change

### 1. Update the `LINKEDIN_PERSON_URN` secret
Replace the current value with your Company Page organization URN in the format:
```
urn:li:organization:YOUR_PAGE_ID
```

**How to find your Page ID:**
1. Go to your NexusFlo24 LinkedIn Company Page as an admin
2. Click **Admin Tools** → **Page Info** (or look at the URL — it may show the numeric ID)
3. Alternatively, go to: `https://www.linkedin.com/company/nexusflo24/` → click Admin view → the numeric ID appears in the URL or in Page settings

### 2. Ensure your LinkedIn App has the right permissions
Your LinkedIn Developer App needs the **`w_organization_social`** scope (not just `w_member_social`) to post on behalf of a Company Page. You may need to:
- Go to your LinkedIn Developer App → **Products** tab → request **"Share on LinkedIn"** or **"Marketing Developer Platform"** for organization posting
- Generate a new access token that includes `w_organization_social`

### 3. Update the Edge Function code
- Rename the env var reference from `LINKEDIN_PERSON_URN` to a more generic name (or keep it — just store the org URN)
- The API payload structure stays the same — LinkedIn's UGC API accepts both person and organization URNs as the `author` field

### Steps
1. Use `add_secret` to update `LINKEDIN_PERSON_URN` with `urn:li:organization:YOUR_PAGE_ID`
2. Use `add_secret` to update `LINKEDIN_ACCESS_TOKEN` with a new token that has `w_organization_social` scope
3. No code changes needed — the edge function already uses the URN directly as the `author`

## Important
You **must** generate a new access token with the `w_organization_social` scope, otherwise LinkedIn will reject the request. The current token likely only has `w_member_social`.

