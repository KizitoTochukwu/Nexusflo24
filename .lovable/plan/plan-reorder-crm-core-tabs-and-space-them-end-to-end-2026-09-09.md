# Plan: Reorder CRM core tabs and space them end-to-end

## Goal
Show the six core CRM tabs in this order — **Leads, Contacts, Companies, Deals, Pipelines, Tasks** — and stretch them so they fill the nav bar from end to end.

## Change 1 — Reorder the tabs (`src/lib/crm/nav.ts`)
Reorder the `CRM_PRIMARY_NAV` array from the current `Contacts, Companies, Leads, Deals, Tasks, Pipelines` to:

1. Leads
2. Contacts
3. Companies
4. Deals
5. Pipelines
6. Tasks

No other fields change (keys, labels, paths, icons stay the same; only the array order moves).

## Change 2 — Stretch the tabs to fill the nav (`src/components/crm/CrmWorkspaceLayout.tsx`)
In the desktop primary-nav container (the `<nav>` + inner `<div>` at lines 85–108):

- Add `justify-between` to the inner flex row so the six tabs distribute across the full width.
- Give each `NavLink` `flex-1 justify-center` (instead of `shrink-0`) so each tab grows equally and the row fills edge to edge, keeping text centered and not wrapping.
- Keep the "More" dropdown pinned to the end as it is today.

Mobile (the `<Select>` dropdown) is unaffected — it lists the same items and will pick up the new order automatically.

## Verification
- Build passes (tsgo typecheck + Vite build).
- Browser check: desktop CRM nav shows the six tabs in the new order, filling the bar end to end; active state still highlights correctly; "More" still opens secondary items.

No data, routes, or labels change — only tab order and spacing.
