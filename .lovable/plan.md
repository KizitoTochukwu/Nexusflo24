## Goal

In the **Create Campaign → Step 5: Review & Launch** dialog, let the user pick a **Lead Folder (Group)** as the campaign audience — alongside the existing "Filter by Criteria" and "Pick Specific Leads" options.

## What changes for the user

The audience toggle becomes a **3-way picker**:

```text
[ Filter by Criteria ]   [ Pick Folder/Group ]   [ Pick Specific Leads ]
```

Selecting **Pick Folder/Group** shows a dropdown of all the workspace's lead folders (with lead counts), e.g.:

- Newsletter Subscribers (124)
- Webinar Attendees (656)
- VIP Clients (32)

Only leads in the chosen folder will receive the campaign. The Campaign Summary card will show: `Audience: Folder "Webinar Attendees" (656 leads)`.

Triggered campaigns are unaffected (folders only apply to broadcast mode, same as the current Lead Picker).

## Implementation

### 1. `src/components/campaigns/CreateCampaignDialog.tsx`

- Replace the boolean `useLeadPicker` with an `audienceMode: "filter" | "folder" | "picker"` state.
- Add state: `selectedFolderId: string | null`.
- Render a 3-button toggle row instead of the current 2-button row.
- When mode is `"folder"`:
  - Use the existing `useLeadFolders(workspaceId)` hook to fetch folders.
  - Use the existing `useFolderLeadIds(folderId, workspaceId)` hook to resolve member lead IDs the moment a folder is picked.
  - Show a `Select` listing folders with their `lead_count` badge.
- In `handleCreate`, when mode is `"folder"`, write `audience_filter: { folder_id, lead_ids: [...resolvedFolderLeadIds] }` so the existing edge function picks them up via its current `audienceFilter.lead_ids` branch — **no edge-function change needed**.
- Update the Campaign Summary block to show the chosen folder name + member count.
- Update `reset()` to clear `audienceMode` and `selectedFolderId`.

### 2. New small component (optional, kept inline if short): `FolderAudiencePicker`

A compact `Select` + folder count chip, sourced from `useLeadFolders`. Living inside the dialog file is fine — matches the inline style of the existing audience filter UI.

### 3. No DB migration, no edge function change

Because we resolve folder → `lead_ids` on the client at submit time, `execute-campaign` already handles it (it reads `audience_filter.lead_ids` first). We also store `folder_id` in `audience_filter` for future analytics/reference.

## Edge cases handled

- Folder with 0 leads → disable the Launch button with helper text `"This folder has no leads."`
- Channel-eligibility (email needs `email`, sms/wa need `phone`) — filter resolved IDs the same way `LeadPicker` already does, so a folder of 656 leads sending an SMS only targets those with phone numbers.
- Folder list loading state → show a small skeleton inside the Select trigger.

## Files touched

- `src/components/campaigns/CreateCampaignDialog.tsx` — add 3-way toggle, folder picker UI, resolution logic in `handleCreate`, summary line.

That's the full scope. Ready to implement on approval.