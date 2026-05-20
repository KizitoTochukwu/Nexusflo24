## Redesign /contact as premium "Split editorial" lead capture page

Rebuild `src/pages/Contact.tsx` to match the approved "Split editorial elevation" direction while preserving all existing logic (lead capture, validation, subject prefill, success state).

### Layout
Single full-width bento card (navy primary background, rounded-3xl, deep shadow) on a light surface. Inside, a 2-column grid:

- **Left pane (editorial):** pill badge ("Get in touch" with pulsing gold dot) → display H1 with gold gradient on "build something" → lead copy → 2×2 channel cards (Email, WhatsApp, Response time, Trusted) on translucent white/5 backgrounds with gold icon chips → divider → in-hero trust strip (Secure, GDPR, UK team, 24/7).
- **Right pane (form):** floating white card with gold top accent bar, deep shadow lifting it off the navy. Same fields: Name + Email (2-col), Company, Message, primary CTA. Tiny uppercase tracked labels above inputs. Focus state = gold border + soft gold ring. Success state preserved (gold check, message).

Below the card: subtle grayscale trust strip with the same 4 badges, fades to full opacity on hover.

### Design system compliance
Use semantic tokens (`bg-primary`, `text-primary-foreground`, `text-accent`, `bg-accent`, `bg-card`, `bg-surface`, `bg-gradient-gold`) — no hardcoded hex. Tokens already map to brand Navy/Gold per memory.

### Preserved behavior
- `useCaptureLead()` hook usage, subject querystring prefill, toast feedback, zod-like manual validation, maxLengths
- `<Seo>` title/description
- Wrapped in `<Layout>` (Header/Footer)
- Success view layout

### File
- Edit: `src/pages/Contact.tsx` (full rewrite)

No new components, no routing changes, no backend changes.
