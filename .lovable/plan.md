

## Plan: Company Logos Marquee with Real Logos

### Changes

**1. Remove badges** (`Index.tsx`)
Delete the GDPR Ready / 99.9% Uptime badge row (lines 150-154).

**2. Replace text names with real logos** (`Index.tsx`)
Update the `integrations` array from plain strings to objects with `name` and `logo` URL. Use Clearbit's logo API (`https://logo.clearbit.com/{domain}`) for high-quality company logos. Each entry renders as an `<img>` tag (height ~24-28px, grayscale filter, color on hover) instead of a `<span>`.

Example entries:
```ts
{ name: "Google Sheets", logo: "https://logo.clearbit.com/google.com" },
{ name: "Zapier", logo: "https://logo.clearbit.com/zapier.com" },
{ name: "Stripe", logo: "https://logo.clearbit.com/stripe.com" },
// ... etc
```

**3. Styling**
- `grayscale opacity-60 hover:grayscale-0 hover:opacity-100` for subtle-to-vivid effect
- Fixed height (`h-7`) with `object-contain` for consistent sizing
- Keep the existing marquee animation and hover-to-pause behavior

### Files modified
- `src/pages/Index.tsx`

