## Problem

When inserting an image in the automation Email Editor, Supabase Storage upload fails with:

> invalid input syntax for type uuid: "images"

## Root cause

The `email-assets` bucket RLS policy is:

```
bucket_id = 'email-assets' AND is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
```

It requires the **first folder segment** of the object name to be the current **workspace UUID**. `src/components/automations/email-editor/ImageInsertDialog.tsx` uploads with path `images/${Date.now()}.${ext}`, so Postgres tries to cast `"images"` to `uuid` and rejects the insert.

## Fix

Update `ImageInsertDialog.tsx`:

1. Pull the active workspace id from `useWorkspace()` (same hook other email-editor components use).
2. Change the upload path from `images/${ts}.${ext}` to `${workspaceId}/images/${ts}.${ext}`.
3. If `workspaceId` is missing, show a toast and abort the upload instead of letting it 400.

No schema or policy changes — the policy is correct and is shared by other workspace assets.

## Verification

- Open an automation step → Send Email → Insert → Image → Upload.
- Pick a PNG/JPEG.
- Expect: success toast, image inserted, public URL like `…/email-assets/<workspaceId>/images/<ts>.png`.
- Repeat with a second workspace to confirm scoping.
