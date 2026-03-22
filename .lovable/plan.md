

## Plan: Scrolling Logo Marquee for Integrations Bar

### What changes

**1. Expand the integrations list** (`Index.tsx`)
Add more relevant company/tool names: Google Sheets, Zapier, Make.com, Meta Ads, Stripe, PayPal, HubSpot, Slack, Mailchimp, Shopify, WordPress, Salesforce, Calendly, Notion, Typeform, Twilio.

**2. Add a marquee keyframe animation** (`tailwind.config.ts`)
Add a `marquee` keyframe that translates content from `0%` to `-50%` on the X axis, creating a seamless infinite scroll effect.

**3. Replace the static grid with a scrolling marquee** (`Index.tsx`)
- Use `overflow-hidden` on the container
- Render the integrations list **twice** side-by-side inside a flex container with `animate-marquee`
- This duplication creates the illusion of an infinite loop
- Keep the GDPR Ready and 99.9% Uptime badges static below the marquee
- Pause animation on hover using `hover:[animation-play-state:paused]`

### Technical detail

```
┌─────────────────────────────────────────┐
│  overflow-hidden container              │
│ ┌─────────────────────────────────────┐ │
│ │ [logos...] [logos...] ← animate-marquee│
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
         ← scrolls left continuously
```

Tailwind keyframe:
```js
marquee: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } }
```
Animation: `marquee 30s linear infinite`

