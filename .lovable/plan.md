## Trust Section Refresh

Replace the current `integrations` logo marquee on the homepage with the 9 user-uploaded brand logos and elevate the section visually.

### Logos to use (uploaded)
1. Monday.com (purple bars)
2. Zapier
3. HubSpot
4. Mailchimp
5. Calendly
6. Stripe
7. Meta
8. Shopify
9. Gmail

### Implementation

1. **Save uploaded images as Lovable Assets** (CDN-backed JSON pointers, not binaries in repo):
   - `src/assets/logos/monday.png.asset.json`
   - `src/assets/logos/zapier.png.asset.json`
   - `src/assets/logos/hubspot.png.asset.json`
   - `src/assets/logos/mailchimp.png.asset.json`
   - `src/assets/logos/calendly.png.asset.json`
   - `src/assets/logos/stripe.png.asset.json`
   - `src/assets/logos/meta.png.asset.json`
   - `src/assets/logos/shopify.png.asset.json`
   - `src/assets/logos/gmail.png.asset.json`
   Created via `lovable-assets create --file /mnt/user-uploads/image-XXX.png`.

2. **Update `src/pages/Index.tsx`** — replace the `integrations` array to import the 9 asset JSONs and reference `.url`. Remove the `simpleicons.org` URLs.

3. **Visually improve the trust section** (keep Navy/Gold brand, keep marquee motion):
   - Soft gradient band background (white → faint navy/5 → white) instead of flat `bg-surface`.
   - Bigger heading treatment: small gold uppercase eyebrow ("Trusted Integrations") above the existing label, slightly larger tracked text.
   - Logo tiles: larger (w-36 h-20), white card, rounded-xl, subtle hairline border, soft shadow, gentle hover lift (-translate-y-0.5) with gold border tint on hover.
   - Logos render at full color (`opacity-80` → `opacity-100` on hover), `object-contain`, taller (h-10) for legibility — no greyscale filter so brand colors read clearly.
   - Add left/right fade masks on the marquee edges so logos fade in/out cleanly.
   - Increase gap and vertical padding for breathing room.

### Out of scope
- No changes to other sections, animations, or marquee keyframes.
- No new dependencies.
