# Swap Wizard for Lead-Capture Modal After Calculate

Change what happens on `/tools/roi-savings-calculator` immediately after the user clicks **Calculate My Savings** on the wizard's final step.

## Behaviour today
- Wizard sits on the left, results on the right.
- On Calculate → wizard stays visible, results fill in, and a "Unlock your full report" card appears **under** the results on the right column.

## New behaviour
- On Calculate → results fill in on the right, the wizard on the left is **replaced** by a compact summary card ("Your inputs are locked — thanks!" + a small "Edit answers" link that reopens the wizard), and the lead-capture form opens automatically as a **centred modal dialog**.
- The inline "Unlock your full report" card in the right column is removed.
- Closing the modal without submitting keeps the results visible and shows a persistent "Unlock full report" gold button (in place of the old inline card) that reopens the same dialog.
- On successful submit → modal closes, existing success banner + personalised recommendations render exactly as today (right column, unchanged).

## Scope

Only `src/pages/tools/RoiSavingsCalculator.tsx` changes. No changes to the wizard component, calculator logic, edge function, DB, CRM, automations, or any other page section.

## Implementation notes

- Use existing shadcn `Dialog` (already used across the app) — `DialogContent` max-w-lg, scrollable, keeps the current form fields, validation, consent checkbox and submit handler verbatim.
- New state: `leadDialogOpen: boolean`. Set true inside `handleCalculate` after `setStep(2)`. Set false on successful submit and on user close.
- Replace the current `{step >= 2 && !submitted && <Card>…</Card>}` block with the `<Dialog>` mount + a small "Unlock full report" button shown in the right column when `step >= 2 && !submitted && !leadDialogOpen`.
- Replace the wizard render with a conditional: `step < 2` shows `<RoiCalculatorWizard>`; `step >= 2` shows a compact "Inputs locked" card with an **Edit answers** button that resets `step` back to 1 and clears `submitted` state so the wizard reappears (results stay because they're derived from `inputs`).
- Mobile: dialog is already responsive via shadcn defaults; results still scroll into view after Calculate as today.
- Accessibility: `Dialog` handles focus trap, ESC, aria-labelledby via `DialogTitle`.

## Not changing
- Wizard component and its sessionStorage.
- Calculation formulas, results card, placeholder state, recommendations, feature cards, CTA, FAQ, hero.
- Lead submission edge function, CRM/automation dispatch, analytics events.
