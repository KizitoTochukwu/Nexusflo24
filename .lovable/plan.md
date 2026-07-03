## Changes in `src/pages/tools/RoiSavingsCalculator.tsx`

1. **Remove Personalised recommendations card** (lines 608–624): delete the entire `{submitted && recommendations.length > 0 && (...)}` block.

2. **Fix empty vertical space under "Your inputs are locked" card**: the two blank lines (383–384) plus the two-column grid layout make the locked card stretch tall while the right column is much taller. Change the locked `Card` to `self-start` so it no longer stretches to fill the grid row, and remove the extra blank lines.

Keep everything else (recommendations still built + sent in the submission payload via `recommendationText`, wizard, results panel, CTA copy) untouched.