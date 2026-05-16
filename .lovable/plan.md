# Premium Contact Page Redesign

Elevate `/contact` to a high-end SaaS feel using the existing Navy + Gold tokens — no new dependencies, no business-logic changes. Form submission, lead capture, and SEO stay intact.

## Visual direction

- **Hero**: Replace flat navy band with a layered `bg-hero` gradient + soft gold radial glow, subtle grid/noise overlay, and an animated fade-up headline. Tighten the eyebrow chip, enlarge the headline, add a one-line trust strip ("Trusted by creators • Replies < 24h • GDPR-ready").
- **Two-column layout**: Asymmetric split — form (7/12) as an elevated glass-style card with gold top border accent; contact info (5/12) as stacked premium info cards instead of plain rows.
- **Form card**:
  - Rounded-2xl, `shadow-card` → hover `shadow-card-hover`, subtle gradient border (navy → gold).
  - Floating section title "Send us a message" + helper subtitle.
  - Inputs: larger height (h-12), refined focus ring in gold, icon prefixes (User, Mail, Building, MessageSquare).
  - CTA button: full-width, gold gradient (`bg-gradient-gold`), `shadow-gold`, arrow icon, micro-interaction on hover (translate-x).
  - Success state: keep logic, restyle with gold check badge + gradient background.
- **Contact info cards**:
  - Each channel (Email, WhatsApp, Office) as its own rounded card with gradient icon tile, hover lift, and a small "Open" / "Chat" / "Get directions" ghost link.
  - Add a 4th compact card: "Response time" with a live "Typically replies in under 2 hours" badge (static copy).
- **Trust band** (new, below the grid): thin strip with 4 reassurance items (Secure • GDPR • 24/7 monitoring • UK-based) using Lucide icons, muted styling, no new section heading.
- **Background**: Section uses `bg-surface` with a faint top-to-bottom gradient to separate from hero.

## Motion

- `animate-fade-up` on hero headline + subtitle (staggered via existing `animation-delay-*` utilities).
- Cards: `transition-all duration-300 hover:-translate-y-1` for premium feel.

## Technical notes

- Single file change: `src/pages/Contact.tsx`.
- Use only existing semantic tokens (`primary`, `accent`, `muted-foreground`, `gold`, `navy-light`, `surface`, `gradient-hero`, `gradient-gold`, `shadow-card`, `shadow-gold`). No new colors, no index.css edits needed.
- Keep `Seo`, `useCaptureLead`, form state, validation, and success branch unchanged.
- Keep all current copy and contact details; only restructure presentation and add the trust strip + response-time card copy.
- Responsive: stack to single column < lg; info cards become 2-up on md, 1-up on sm.

## Out of scope

- No new routes, no backend changes, no new packages, no map embed, no live chat widget.
