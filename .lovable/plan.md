# Fix the CRM navigation bar overlay and margins

## What's wrong

The CRM section bar (Contacts / Companies / Leads / Deals / Tasks / Pipelines / More) currently escapes its container:

- It is pinned to the very top of the viewport (`sticky top-0`) with a very high stacking value, so on scroll it paints **over the dashboard top bar and over the left sidebar** instead of sitting inside the CRM content area — exactly what the screenshot shows.
- It uses negative horizontal margins, so it bleeds past the page padding and its left edge runs under the sidebar.

## What it should be

- The bar lives inside the CRM content column, aligned with the page padding and with the page heading below it — never over the sidebar or the workspace top bar.
- It stays sticky for convenience, but it sticks **below** the dashboard top bar, and it sits behind the sidebar, drawers and dialogs in stacking order.
- Bar keeps its current premium pill styling: rounded segmented control, subtle gradient, gold active icon accent, divider before "More", horizontally scrollable tabs so it never overflows on narrow widths.
- Breadcrumb keeps its place above the bar with consistent spacing to the page title.

## Technical changes

Only `src/components/crm/CrmWorkspaceLayout.tsx`:

- Remove `-mx-1 px-1` negative-margin bleed; let the bar respect the dashboard's `p-4 sm:p-6 lg:p-8` content padding and use `w-full` inside it.
- Change the sticky wrapper offset from `top-0` to the dashboard header height (`top-14`, i.e. 3.5rem) so it parks under the top bar rather than covering it.
- Drop the stacking value from `z-[61]` to a low in-content level (`z-20`), below the sidebar, Nexus AI panel, drawers and dialogs.
- Keep the frosted background/blur and bottom hairline so content scrolls cleanly underneath.
- Tighten vertical rhythm: breadcrumb, then bar, then a consistent gap before the page content.

No routing, data or business-logic changes.
