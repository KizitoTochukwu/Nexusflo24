

## Add Insert Variables to Email Block Editor Properties Panel

The `InsertDropdown` currently only appears for SMS/WhatsApp actions. For the email block editor, variables need to be insertable into text content, button labels/URLs, and column text via the properties panel.

### Changes

**File: `src/components/automations/email-editor/email-blocks/EmailBlockProperties.tsx`**

1. Import `InsertDropdown` from `../InsertDropdown`
2. Add the Insert Variables dropdown to `TextProps` — place it next to the "Content" label, so clicking a variable appends it to the textarea content
3. Add it to `ButtonProps` — for inserting variables into button label or URL fields
4. Add it to `ColumnsProps` — for inserting variables into column text fields

The dropdown will append the selected variable at the end of the relevant text field (content, label, or column text). This matches the existing pattern used for SMS/WhatsApp.

**No other files need changes.**

