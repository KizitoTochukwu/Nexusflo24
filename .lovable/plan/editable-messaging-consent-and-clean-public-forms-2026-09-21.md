# Editable messaging consent and clean public forms

## What will change

1. **Add an editable messaging-consent setting**
   - Add a “Messaging consent text” field to each form’s settings.
   - Use the existing compliant NexusFlo24 wording as the default for current and new forms.
   - Keep the required STOP/HELP, consent-not-required, Privacy Policy, and Terms wording protected so an edit cannot accidentally make the form non-compliant.

2. **Display and save the exact consent shown**
   - Show the configured wording beside the messaging checkbox on the live form and in the form preview.
   - Continue rendering Privacy Policy and Terms as working links.
   - Save the exact displayed consent wording, timestamp, and form source with each opted-in lead as consent evidence.

3. **Remove Nexus AI from form pages**
   - Do not render the Nexus AI launcher, preview, or chat window on hosted form pages or embedded forms.
   - Leave Nexus AI unchanged everywhere else.

4. **Verify the complete flow**
   - Confirm existing forms retain the current consent wording until edited.
   - Confirm edited wording survives saving and appears on the public form.
   - Confirm opted-in submissions store the displayed wording.
   - Confirm hosted and embedded forms no longer show Nexus AI on desktop or mobile.

## Technical details

- Extend the existing form settings object; no new database table or duplicate consent system is needed.
- Pass the form-specific consent text through the existing checkbox and lead-capture request.
- Make the widget’s route exclusion apply to rendering, not only automatic opening.
- Add focused regression coverage for the consent fallback and route exclusion.
