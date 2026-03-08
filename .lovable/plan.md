

## Plan: Replace plain textarea with rich text editor in Campaign Compose step

The campaign message composer (Step 3 in `CreateCampaignDialog.tsx`) currently uses a basic `<Textarea>` for the message body. The image shows the user wants the same rich editor features available in the automation builder: **Insert menu, Conditional blocks, Preview toggle, and Formatting toolbar** (Bold, Italic, Underline, Lists, Links, Button, Image, Divider, Emoji).

### Changes

**File: `src/components/campaigns/CreateCampaignDialog.tsx`**

1. **Import** `AutomationEmailEditor` instead of using the plain `<Textarea>` for the message body.
2. **Replace lines 374-381** (the Subject input + Textarea) with the `AutomationEmailEditor` component, passing:
   - `isEmail` = `true` when channel is `"email"`, `false` otherwise
   - `subject` / `onSubjectChange` wired to existing `subject` state
   - `message` / `onMessageChange` wired to existing `body` state
3. **Remove** the now-unused `Textarea` import.

This gives the campaign composer the full toolbar (Insert variables, Conditional blocks, Preview with desktop/mobile toggle, formatting toolbar with Bold/Italic/Underline/Lists/Link/Button/Image/Divider/Emoji, email presets, and template settings) — matching the screenshot exactly.

