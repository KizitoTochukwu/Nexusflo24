

# Fix: Sidebar Overlapping Automation Details Drawer

## Problem
The automation details drawer (`fixed inset-0 z-50`) opens as a full-page overlay, but the dashboard sidebar (`fixed left-0 z-40`) still visually overlaps the content. Despite the z-index being correct (50 > 40), the sidebar's fixed positioning and the drawer's content layout cause the automation workflow to be partially hidden behind the sidebar on all screen sizes.

## Solution
Increase the drawer's z-index above the sidebar and ensure the drawer's background fully covers the sidebar. The drawer already has `z-50` and the sidebar `z-40`, so the z-index is correct. The real issue is that the sidebar is rendering **after** or **outside** the drawer's stacking context.

The fix: bump the drawer's z-index higher (e.g., `z-[60]`) to guarantee it renders above everything, including the sidebar. This is a single-line CSS class change.

## File Changes

| Action | File | Change |
|--------|------|--------|
| Modify | `src/components/automations/AutomationDetailsDrawer.tsx` | Change outer div from `z-50` to `z-[60]`, and the sticky header from `z-10` to `z-[61]` to ensure the drawer and its header sit above the sidebar |

