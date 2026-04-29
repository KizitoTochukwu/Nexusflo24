## CRM Mapping audit — what's wired vs. what's broken

I traced every CRM Mapping field from the Form Builder UI → saved form record → public form submission → `capture-lead` edge function → `leads` / `lead_folder_leads` / pipeline, and verified against your live data.

### ✅ Working correctly

| Field | Status | Verified by |
|---|---|---|
| **Lead source** | ✅ Wired | Recent submission `d.faseesin@gmail.com` saved with `source=Webinar` |
| **Tags** | ✅ Wired & merged with existing tags | Same lead has tag `Webinar – AI Sales System Masterclass` |
| **Initial pipeline stage** | ✅ Wired (new leads only — existing leads keep their stage, which is the right behavior) | Lead saved with `pipeline_stage=new_lead` |

### ❌ One bug — Folder name

The "Folder name" field is sent to the edge function, but if a folder with that name **doesn't already exist in the workspace**, the lead silently falls into **"Uncategorized"** instead.

**Evidence from your DB:** Your webinar form is configured with folder `Webinar – AI Sales System Masterclass`. The most recent submission (`d.faseesin@gmail.com`, 29 Apr) ended up in folder `Uncategorized` because no folder with that exact name exists in workspace `95bc7e99…`. (Only `Webinar – AI Sales Blueprint` exists.)

**Root cause:** In `supabase/functions/capture-lead/index.ts` (~line 337-363), the `destFolderName` lookup uses `.ilike()` on `lead_folders` and only inserts the lead-to-folder link if a match is found. There's no auto-create.

---

### Fix — auto-create the configured folder if missing

Update `capture-lead/index.ts` so that when `lead_destination.folder_name` is provided but no matching folder exists, the function creates the folder, then links the lead to it (instead of falling through to "Uncategorized").

```text
if (destFolderName) {
  let folder = <lookup by ilike name in workspace>
  if (!folder) {
    folder = <insert lead_folders { workspace_id, user_id: ownerId,
                                    name: destFolderName, color: '#0B1F3B' }>
  }
  <link lead → folder, fire folder automations>
  routedToAnyFolder = true
}
```

This makes the Form Builder's "Folder name" field truly self-serve: typing any name into the field guarantees the lead lands there, regardless of whether the user has pre-created the folder in CRM.

### Optional UX polish (not blocking)

The form builder field is a freeform text input. To prevent typos that create near-duplicate folders (e.g. `Webinar – AI Sales System Masterclass` vs. `Webinar - AI Sales System Masterclass` with a hyphen), I'd recommend a future enhancement to convert it to a combobox that lists existing folders + allows creating new ones. Not part of this fix unless you want it.

### Verification after fix

1. Re-submit the webinar form with a fresh test email.
2. Confirm the new lead appears in folder `Webinar – AI Sales System Masterclass` (auto-created) and not in `Uncategorized`.
3. Confirm any folder-trigger automations on that folder fire.

### Files touched
- `supabase/functions/capture-lead/index.ts` — add auto-create branch in the `destFolderName` block
