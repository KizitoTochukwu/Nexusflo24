# Campaign Details drawer: Edit button, remove Source tab, remove Delivery Log

## Changes to the Campaign Details drawer

### 1. Add an Edit button that reopens the campaign in the editor
- A new "Edit Campaign" button appears at the top of the Campaign Details drawer, next to the existing "Send Campaign Now" area (for campaigns that are editable: draft, scheduled, active, paused).
- Clicking it closes the drawer and opens the same 5-step campaign editor used by "Create Campaign", with the campaign's current settings pre-filled: name, channel, objective, mode, trigger settings, subject, message content (including editor blocks), WhatsApp template selection, fallback settings, sender profiles, and audience/folder selection.
- Saving from this mode updates the existing campaign (no duplicate is created). The button label changes from "Create Campaign" to "Save Changes".
- The row action menu on the Campaigns table also gains an "Edit" item using the same flow.

### 2. Remove the Source tab
- The "Preview | Source" tabs under Message Content are removed. The formatted, sanitised Preview becomes the only view of the message, shown directly (keeping its scroll container).

### 3. Remove the Delivery Log
- The "Delivery Log (n)" section at the bottom of the drawer is removed entirely. Delivery status remains visible in the Sequence Timeline and the stat cards, which use the same data.

## Technical notes
- `CreateCampaignDialog` gains an optional `editCampaign?: Campaign` prop (or a controlled `editingId`): when set, it opens pre-filled from the campaign record and calls `useUpdateCampaign` instead of `useCreateCampaign`.
- `DashboardCampaigns.tsx` holds an `editingCampaign` state; it passes an `onEdit` callback into `CampaignDetailsDrawer` and renders the dialog in edit mode.
- `CampaignDetailsDrawer.tsx`: Edit button + `onEdit` prop; remove Tabs/TabsContent for Source; remove Delivery Log block (keep the `useCampaignMessages` query since metrics and timeline still use it).
- No database changes; no campaign data modified; nothing is sent.
- Verify with a build and a quick check that editing a draft prefills and saves without creating a new row.
