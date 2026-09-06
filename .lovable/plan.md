# Fix WhatsApp template error 132012 (image-header templates)

## What's actually wrong

Your approved template `nexusflo24__sales_missed_call_follow_up` starts with an **image header** (checked against the live definition stored from Meta: HEADER = IMAGE, BODY with `{{1}}` and `{{2}}`, one fixed-link button).

When we send it, we only fill in the body text values. We never send the header image, and WhatsApp rejects the whole message with error 132012 ("parameter format does not match the created template"). That's why every retry fails no matter what you type in the boxes — the missing piece isn't the text, it's the picture at the top.

## The fix

1. **Send the header image with the template.**
   In the WhatsApp sending function, the part that builds the message is extended to handle image, video and document headers, not just text headers. It uses, in order:
   - a header image link chosen for that template, if one is saved;
   - otherwise the sample image Meta already holds for the approved template;
   - and it clearly reports the problem if neither is available, instead of failing with a raw Meta code.

2. **Let you choose the header image.**
   In the template picker (used in Automations, Campaigns and the test send), when the selected template has an image/video/document header, a new "Header image" field appears with the template's sample image pre-filled and editable. The chosen link is saved with the step so every send uses it.

3. **Remember it per template.**
   A new optional field on the stored template holds the default header media link, so once set it applies everywhere that template is used.

4. **Clearer error text.**
   If Meta still rejects a template send, the message shown will name the likely cause (missing or wrong header media, or wrong number of text values) rather than only the numeric code.

## Verification

- Re-run "Send test" on the same automation step to 07517327597 and confirm the message arrives with the image header and your two values filled in.
- Check the delivery record moves to submitted/sent rather than failed.
- Confirm a plain text-header template still sends unchanged.

## Technical notes

- `supabase/functions/whatsapp-send/index.ts` → `reconcileTemplateComponents()`: add a media-header branch emitting `{ type: "header", parameters: [{ type: "image", image: { link } }] }` (and `video`/`document` equivalents), sourced from the supplied component, the template's `header_media_url`, or `components[0].example.header_handle[0]`.
- Migration: add nullable `header_media_url text` to `whatsapp_templates`; no grant/RLS changes needed (existing policies cover it).
- `src/components/settings/WhatsAppTemplatePicker.tsx`: show the header-media input when the live components declare a non-TEXT header; persist the value into the step's template payload.
- Redeploy `whatsapp-send`; no other functions change since they all route through it.
