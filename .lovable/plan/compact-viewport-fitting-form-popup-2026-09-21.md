# Compact, viewport-fitting form popup

## Goal
Keep the NexusFlo24 form on one compact page so visitors can see the full form, consent, and submit button without scrolling on typical desktop and tablet screens.

## Changes
- Make the popup use the available screen height instead of a fixed 78% iframe height.
- Remove the hosted form’s full-screen centering and excess outer spacing when it is displayed inside the popup.
- Tighten the form header, field spacing, input height, consent text, and action area while preserving readability and accessibility.
- Keep the close button visible and ensure the submit button is included within the visible popup.
- Add a safe fallback for unusually short screens so content remains usable rather than being clipped.
- Preserve the existing form fields, validation, consent wording, submission behavior, styling choices, and standalone hosted-form experience.

## Verification
- Check the webinar popup at desktop, tablet, and mobile viewport sizes.
- Confirm the entire compact form fits without an inner scrollbar on standard screens.
- Confirm all fields, consent links, close control, and submit action still work.
- Run the existing form tests and confirm the preview builds cleanly.

## Technical details
The current popup caps its panel at `90vh` but fixes the embedded page to `78vh`; the embedded hosted page also applies full-viewport height, centering, and outer padding. The implementation will introduce popup-aware rendering and coordinate the iframe height with the popup panel rather than globally shrinking every form.
