Remove the max-width cap on the automation details content container so the workflow/logs area spans the full available width like the Automations list page.

**Change**
- File: `src/components/automations/AutomationDetailsDrawer.tsx` (line 153)
- Replace `max-w-6xl mx-auto px-[24px] py-[24px]` with `w-full px-[24px] py-[24px]`