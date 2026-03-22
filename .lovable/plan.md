

## Plan: Fix broken integration logos

The Clearbit Logo API (`logo.clearbit.com`) is no longer reliably available, causing all logos to fail loading.

### Fix

Replace all Clearbit URLs with logos from a working source. Use **SVG logos from `cdn.simpleicons.org`** (Simple Icons CDN) which provides free, reliable brand logos.

**File: `src/pages/Index.tsx`**

Update the `integrations` array to use Simple Icons CDN URLs:

```ts
{ name: "Google", logo: "https://cdn.simpleicons.org/google" },
{ name: "Zapier", logo: "https://cdn.simpleicons.org/zapier" },
{ name: "Make", logo: "https://cdn.simpleicons.org/make" },
{ name: "Meta", logo: "https://cdn.simpleicons.org/meta" },
{ name: "Stripe", logo: "https://cdn.simpleicons.org/stripe" },
{ name: "PayPal", logo: "https://cdn.simpleicons.org/paypal" },
{ name: "HubSpot", logo: "https://cdn.simpleicons.org/hubspot" },
{ name: "Slack", logo: "https://cdn.simpleicons.org/slack" },
{ name: "Mailchimp", logo: "https://cdn.simpleicons.org/mailchimp" },
{ name: "Shopify", logo: "https://cdn.simpleicons.org/shopify" },
{ name: "WordPress", logo: "https://cdn.simpleicons.org/wordpress" },
{ name: "Salesforce", logo: "https://cdn.simpleicons.org/salesforce" },
{ name: "Calendly", logo: "https://cdn.simpleicons.org/calendly" },
{ name: "Notion", logo: "https://cdn.simpleicons.org/notion" },
{ name: "Typeform", logo: "https://cdn.simpleicons.org/typeform" },
{ name: "Twilio", logo: "https://cdn.simpleicons.org/twilio" },
```

Also remove the `grayscale` filter since Simple Icons serves single-color SVGs (grayscale on a monochrome icon has no visual effect). Keep the opacity transition for the hover effect.

### Files modified
- `src/pages/Index.tsx`

