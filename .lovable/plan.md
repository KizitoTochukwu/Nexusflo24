

## Expand Suggested Actions into a Rich Mapping

### What changes
Each condition's "Suggested action" becomes a **menu of curated next-steps** instead of a single button. When you pick a condition, you see 2–4 ready-made "smart actions" tailored to that behaviour. Click one and it's inserted as the next step, fully pre-filled (subject lines, tag names, status, even a starter message body).

Examples of the new mappings:

| Condition | Suggested actions (one click each) |
|---|---|
| **Email is known** | Send Email · Add tag "email-verified" |
| **Phone is known** | Send WhatsApp · Send SMS |
| **Source equals** | Add tag (= source) · Update status → Engaged |
| **Tag contains** | Send Email · Notify Sales |
| **Lead score >** | Mark Hot · Notify Sales · Send VIP email |
| **Email opened** | Follow up on WhatsApp · Add tag "engaged" · Send SMS nudge |
| **Link clicked** | Notify Sales · Send follow-up email · Mark Warm |
| **Form submitted** | **Add to nurture flow** (tag `nurture`) · Send welcome email · Notify Sales |
| **Checkout visited** | **Send discount email** (subject "Your 10% off inside") · Send WhatsApp reminder · Add tag `cart-abandoner` |
| **Pricing visited** | Notify Sales · Send pricing follow-up email · Mark Hot |
| **WhatsApp replied** | Mark Engaged · Notify Sales · Send follow-up WhatsApp |
| **Appointment booked** | Send confirmation email · Send WhatsApp reminder · Mark Qualified |
| **Purchase happened** | Add tag `customer` · Send thank-you email · Mark Won · Remove tag `cart-abandoner` |

### UI behaviour
- Replace the single "Suggested: …" button with a small **"Smart actions"** row showing up to 4 chip-buttons (Sparkles icon + label).
- Each chip inserts a new action step right after the condition with all fields pre-populated (action type, tag, status, subject, starter message).
- Layout stays compact; chips wrap on narrow widths.
- No backend changes needed — the executor already reads `action` + config; we're just seeding richer defaults at insert time.

### Files to edit
- `src/hooks/useAutomations.ts` — change `suggestedAction` (single) → `suggestedActions` (array) on every option in `CONDITION_GROUPS`. Each entry: `{ action, label, defaults? }`.
- `src/components/automations/AutomationStepEditor.tsx` — replace the single "Suggested" button with a `.map()` over `selectedOpt.suggestedActions` rendering chip buttons; keep the existing insert logic (spread `defaults` into the new step's config).

### QA
1. Open Add Condition → pick "Checkout visited" → see three chips (Send discount email, Send WhatsApp reminder, Add tag cart-abandoner).
2. Click "Send discount email" → a Send Email action step is inserted below with subject "Your 10% off inside" prefilled.
3. Pick "Form submitted" → click "Add to nurture flow" → an Add Tag step appears with `tag: nurture`.
4. Pick "Purchase happened" → all four chips render and each inserts the correct pre-filled step.

