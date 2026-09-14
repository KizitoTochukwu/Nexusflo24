# Repair onboarding end to end

## Confirmed problems

- **Progress cannot save.** The onboarding save uses `user_id, workspace_id` as its conflict key, but the live database only has a unique expression index using `COALESCE(workspace_id, ...)`. The database therefore rejects every save with the screenshot’s “no unique or exclusion constraint” error. The workspace currently has no saved onboarding record.
- **Skipped steps can be lost.** The wizard updates the skipped-step state and saves immediately, so the save can receive the previous value.
- **Pipeline setup can report success when it failed.** Pipeline errors are silently ignored, any existing pipeline causes an early exit even if it has no stages, and finishing always records the pipeline as configured.
- **The final review can show stale answers.** Contacts, email, calendar, and team status are displayed from manual answers rather than the live checks already used elsewhere.
- **Failures are too easy to miss.** Pipeline and checklist checks often turn errors into `false` or continue silently, making a broken action look unfinished rather than explaining what failed.

## Changes

1. **Fix onboarding persistence**
   - Replace the incompatible expression index with a database constraint that supports the existing `user_id, workspace_id` upsert, including safe handling of a null workspace.
   - Preserve the current ownership rules and access privileges.
   - Keep one onboarding record per user and workspace.

2. **Make wizard navigation reliable**
   - Save the exact next step and exact updated skipped-step list instead of relying on state that has not updated yet.
   - Prevent repeated clicks while a save or finish is running.
   - Keep the user on the current step when saving fails and show a clear actionable message.

3. **Make pipeline creation truthful and complete**
   - Check whether a pipeline actually has stages.
   - If a pipeline exists without stages, add the selected stages instead of returning early.
   - Only mark pipeline setup complete after both the pipeline and stages succeed.
   - Surface failures and stop completion rather than silently claiming success.
   - Refresh pipeline and Getting Started data immediately after success.

4. **Align the final review with real workspace status**
   - Show live imported-contact, email, calendar, team, and pipeline status on the final review, with saved answers only as fallback.
   - Keep the completed Getting Started prompt hidden on the dashboard; in Settings, present completed status without a button that appears to reopen a hidden completed checklist.

5. **Verify the complete journey**
   - Test saving, moving forward/back, skipping, saving for later, finishing, pipeline/stage creation, dashboard navigation, product-tour launch, and checklist refresh.
   - Confirm refresh persistence and verify that no database, runtime, or console errors remain.

## Technical notes

- Database: repair the unique constraint on `public.user_onboarding`; no user data is removed.
- Main code: `useOnboarding`, `OnboardingWizard`, and the Settings onboarding panel.
- Add focused regression coverage for the save payload, skipped-step persistence, completion failure handling, and live final-review status.
