# CRM layout fix: keep the sidebar visible and tame the page width

Two issues in the CRM workspace shell:

1. The CRM section bar is sticky at the very top of the window (`top-0`) with a full-width frosted background. When you scroll, it rides over the dashboard top bar and visually swallows the surrounding chrome, which is why the sidebar/header area looks like it disappears.
2. CRM pages stretch edge-to-edge on wide screens, so tables and filter rows feel uncomfortably wide.

## Changes

**`src/components/crm/CrmWorkspaceLayout.tsx`**
- Stick the breadcrumb + section bar just below the dashboard header instead of at the window top (`top-14` with a matching offset), so it never overlays the header or sidebar rail.
- Keep the stacking level low (`z-10`) so the fixed sidebar (`z-40`) and mobile drawer always paint above it.
- Wrap breadcrumbs, nav, and the page `Outlet` in one centred container with a comfortable max width (around 1400px, `mx-auto`), so content stays readable on large monitors while still filling narrower screens.
- Keep existing premium styling: pill segmented control, gold active icon, More dropdown, mobile select.

**Verification**
- Load a CRM page at wide (1600px+) and standard (1280px) widths with the sidebar both expanded and collapsed; confirm the sidebar stays visible, the section bar sticks under the header on scroll, and content is centred with even margins.

No data, routing, or business logic changes — presentation only.
