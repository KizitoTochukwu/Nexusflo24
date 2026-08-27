# Remove the Automation Health panel

Permanently remove the "Automation health" findings card from the Automations page.

## Changes

- Delete `src/components/automations/AutomationHealthPanel.tsx`.
- In `src/pages/dashboard/DashboardAutomations.tsx`: remove the import (line 26) and the `<AutomationHealthPanel ... />` usage (around line 164), plus any props/handlers that exist only to serve it.

No database, automation logic, or other UI is affected — this is a display-only card.
