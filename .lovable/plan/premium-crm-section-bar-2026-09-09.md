# Premium CRM Section Bar

Upgrade the CRM navigation strip (Leads, Contacts, Companies, Deals, Pipelines, Tasks, More) so it looks like a polished, high-end product bar instead of a plain row of buttons.

## What changes visually

- Navy-to-deep-navy gradient rail with a soft gold hairline edge, refined inner highlight and a deeper ambient shadow, replacing the flat card background.
- Active tab gets a solid navy pill with a subtle gold underglow and a small gold dot indicator, so the current section reads instantly.
- Smooth sliding highlight when moving between tabs, plus a gentle lift and icon tint on hover.
- Icons get a slightly larger, better-aligned treatment with consistent optical spacing; labels use tighter tracking and a small-caps-like weight for a premium feel.
- The "More" control is visually separated by a refined divider and matches the same pill language.
- Breadcrumb line above gets lighter, more elegant spacing and a muted gold CRM mark.
- Mobile keeps the dropdown, restyled to match (rounded, bordered, gradient trigger with the active section icon).

## Behaviour

No routing, data, or ordering changes. Same six primary tabs in the current order, same More menu items, same active-section resolution. Keyboard focus rings and `aria-current` are preserved and made more visible.

## Technical notes

- Edit only `src/components/crm/CrmWorkspaceLayout.tsx` for structure and classes.
- Add any new gradient/shadow values as semantic tokens in `src/index.css` (e.g. `--gradient-crm-rail`, `--shadow-crm-rail`) and reference them through Tailwind arbitrary values; no hardcoded hex or `text-white` style utilities in the component.
- Sliding highlight implemented with CSS transitions on the active pill (no extra library).
- Verify in the browser at `/dashboard/:workspaceId/crm/pipelines` at desktop and mobile widths, and confirm no horizontal overflow.
