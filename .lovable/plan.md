Plan: Strengthen the result headline in the ROI savings calculator

The selected element is the `<h3>` headline inside the result/preview card on `/tools/roi-savings-calculator` (`src/pages/tools/RoiSavingsCalculator.tsx`, lines 393-401).

Current headline text
````text
"You may be leaving approximately {amount} per month on the table."
````

Proposed change
Replace the hedging "may be leaving" message with a direct, benefit-driven statement that better matches the "PREVIEW RESULT" visual in the reference screenshot.

New copy
````text
"You're missing out on about {amount} every month."
````

Implementation details
1. Edit only the `CardTitle` block in the result card (right column).
2. Keep the currency-formatted amount rendered via `{fmt(results.estimated_monthly_opportunity)}` inside the existing accent `<span>`.
3. Keep the small uppercase eyebrow label above it as-is: "Preview result" / "Your full report" / "Live estimate".
4. Preserve all existing styling, conditional logic (`step >= 2`), and accessibility.
5. No changes to wizard, calculations, submission flow, DB, or edge functions.

Files changed
- `src/pages/tools/RoiSavingsCalculator.tsx` (one text string only)