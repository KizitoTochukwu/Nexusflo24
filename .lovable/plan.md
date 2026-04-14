

# Auto-Post Blog to Social Media

## What This Does
When you publish a blog post, it will automatically share to Facebook, Twitter/X, and LinkedIn. You'll also get a manual "Share to Social" button on each post in the admin table to re-share anytime.

## How It Works

Each platform requires API credentials from their developer portals. The system will use a backend function to post on your behalf.

```text
Blog Manager (Admin)
    │
    ├── On Publish → Edge Function "share-to-social"
    │                    ├── Facebook Graph API → Post to Page
    │                    ├── Twitter/X API → Create Tweet
    │                    └── LinkedIn API → Create Share
    │
    └── Manual "Share" button → Same edge function
```

## Setup Requirements (One-Time)

You'll need to create developer apps on each platform and provide API credentials:

1. **Facebook Page** — Create a Meta App at developers.facebook.com, get a Page Access Token with `pages_manage_posts` permission
2. **Twitter/X** — Create an app at developer.x.com, get API Key, API Secret, Access Token, and Access Token Secret (with Read+Write)
3. **LinkedIn** — Create an app at linkedin.com/developers, get an Access Token with `w_member_social` or `w_organization_social` scope

## Implementation Steps

### Step 1: Add API secrets
Store 7 new secrets:
- `FACEBOOK_PAGE_ID`, `FACEBOOK_PAGE_ACCESS_TOKEN`
- `TWITTER_CONSUMER_KEY`, `TWITTER_CONSUMER_SECRET`, `TWITTER_ACCESS_TOKEN`, `TWITTER_ACCESS_TOKEN_SECRET`
- `LINKEDIN_ACCESS_TOKEN`

### Step 2: Create `share-to-social` Edge Function
A single backend function that accepts `{ title, excerpt, url, image_url, platforms }` and posts to each selected platform:
- **Facebook**: POST to Graph API `/{page-id}/feed`
- **Twitter/X**: POST to `https://api.x.com/2/tweets` (OAuth 1.0a signing)
- **LinkedIn**: POST to LinkedIn UGC API
- Returns success/failure per platform

### Step 3: Create `social_share_log` table
Track what was shared and when:
- `id`, `blog_post_id`, `platform`, `status`, `external_id`, `error`, `created_at`

### Step 4: Update Blog Manager UI
- **Auto-share on publish**: When save mutation fires with `status: "published"`, automatically call the edge function
- **Manual re-share button**: Add a share icon button per row in the posts table with a dropdown to pick platforms
- **Share status indicators**: Show small platform icons (checkmarks) on posts that have been shared

### Step 5: Update BlogArticle public page
- Keep existing share buttons (those are for readers)
- No changes needed on the public side

## Technical Details
- OAuth 1.0a signing for Twitter will be implemented in the edge function using HMAC-SHA1
- Facebook and LinkedIn use simple Bearer token auth
- The edge function will attempt all selected platforms and return partial success if one fails
- Share log prevents accidental double-posting by checking recent entries

