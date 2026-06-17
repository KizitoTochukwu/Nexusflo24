## Error

> insert into "objects" (...) — invalid input syntax for type uuid: "images"

## Cause

The `email-assets` storage bucket has an RLS policy that requires the first folder segment of the upload path to be a workspace UUID:

```
is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
```

`ImageInsertDialog.tsx` was uploading to `images/<timestamp>.<ext>` — Postgres tries to cast `"images"` to `uuid` and rejects the insert.

## Fix (already applied last turn)

`src/components/automations/email-editor/ImageInsertDialog.tsx`:
- Imported `useWorkspaceId`
- Changed upload path from `images/${ts}.${ext}` → `${workspaceId}/images/${ts}.${ext}`

## What's still needed

Confirm the same workspace-prefixed path pattern is used wherever else `email-assets` is uploaded to, so other editors don't hit the same error. Targets to audit and patch identically if affected:

- `src/components/automations/email-editor/EmailTemplateSettings.tsx` (logo / header image upload)
- `src/components/settings/BrandingTab.tsx` (workspace logo, if it writes to `email-assets`)
- Any other `.from("email-assets").upload(...)` call in the repo

For each occurrence using a non-UUID first segment (e.g. `logos/...`, `headers/...`), prefix with `${workspaceId}/`.

## Verification

In the automation Send Email step → Image → Upload a PNG. Expect success toast and inserted image. Repeat for any other editor that uploads to `email-assets`.
