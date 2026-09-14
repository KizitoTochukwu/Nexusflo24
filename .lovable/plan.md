# Form image upload: broken, and how to fix it

## What I found

Image upload on the form builder is **not working**. Picking an image shows an "Upload failed" message and nothing is saved.

Cause: uploads are filed under the person's user ID, but since a security change on 26 May the image store only accepts files filed under the workspace ID. Every upload since then has been rejected. The store shows the last successful upload was 27 April.

Displaying works fine — once an image URL is set (pasted manually), it renders in the builder and on the live form.

The same bug affects the **funnel page builder** image upload, which uses the identical wrong path. The Settings → Branding logo upload is correct (already workspace-based).

## The fix

1. Form builder image/logo field: upload to the workspace folder instead of the user folder, so the store accepts it.
2. Funnel builder image upload: same correction.
3. Add a size/type guard on the form upload (images only, max 5MB) and show the real reason when an upload is refused instead of a generic failure.
4. Keep the manual "Image URL" box as-is so existing forms and pasted links keep working.

## Technical notes

- `src/components/forms/builder/FieldPropertiesPanel.tsx`: change the upload path from `${user.id}/...` to `${workspaceId}/forms/...`; the panel needs `workspaceId` passed down from the form builder (already available on the builder page and on `FormSettingsPanel`).
- `src/components/funnels/builder/PropertiesPanel.tsx`: same path change to `${workspaceId}/funnels/...`.
- Storage policy on `funnel-assets` stays unchanged: INSERT/DELETE require `is_workspace_member(auth.uid(), foldername(name)[1]::uuid)`; the bucket is public so `getPublicUrl` continues to work for public forms.
- No migration and no data change; previously uploaded assets keep their URLs.

## Verification

Upload an image into a form field in the live preview, confirm it appears in the builder, save, then open the public form link and confirm the image renders.
