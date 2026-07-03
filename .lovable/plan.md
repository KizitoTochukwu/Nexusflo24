## Plan: Fix ROI Calculator Lead Sync + Automation Triggering

### Goal
Ensure every valid ROI savings calculator submission creates or updates the correct CRM lead, links the submission to that lead, and triggers the ROI calculator automation/workflow enrollment.

### What I’ll change
1. **Harden CRM lead matching**
   - Update `roi-calculator-submit` so it searches for an existing lead by:
     1. email, case-insensitive, within the workspace
     2. phone, within the same workspace, if no email match is found
   - This matches the project rule: deduplicate leads by email first, then phone.

2. **Handle duplicate insert conflicts safely**
   - If inserting a new CRM lead fails because email or phone already exists, the function will re-query by email/phone and update that existing lead instead of leaving `contact_id` empty.
   - Add clear backend logging for failed lead insert/update paths.

3. **Keep submissions linked to CRM leads**
   - The ROI submission row will only be saved with `contact_id = null` when no lead can genuinely be resolved.
   - For the known orphaned ROI submission, link it to the existing phone-matched lead and merge the ROI calculator tags.

4. **Restore automation firing**
   - Once `leadId` is reliably resolved, the existing `roi_calculator_submitted` automation and workflow dispatch code will run as intended.
   - No changes to automation rules, UI, or sender settings.

### Data repair
Backfill the known orphaned submission:
- submission: `fc88fec2-289d-4411-81ee-c9bde1fbe69a`
- matching existing lead: `f771b2e5-c900-4a26-93f6-da2fdf1f12df`

The repair will:
- set the submission `contact_id`
- update the lead’s tags/notes/activity timestamp with ROI calculator context
- leave existing CRM data intact where possible

### Technical details
- File to update: `supabase/functions/roi-calculator-submit/index.ts`
- No schema changes
- No frontend/UI changes
- No RLS changes
- No changes to email, WhatsApp, SMS, or sender approval settings

### Validation
After implementation, I’ll verify that:
- the function no longer silently loses leads when phone duplicates exist
- the known orphaned submission is linked
- future ROI submissions return a `lead_id`, allowing automations to trigger