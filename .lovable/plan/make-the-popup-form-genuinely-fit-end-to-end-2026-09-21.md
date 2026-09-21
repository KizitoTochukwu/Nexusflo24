# Make the popup form genuinely fit end-to-end

## Goal
Show the complete form—including both consent choices and the submit button—without vertical scrolling or clipped content at the reported 904 × 879 viewport.

## Changes
- Replace the single-column compact layout with a wider, two-column popup layout on desktop and tablet, while keeping long consent text and the submit action full width.
- Reduce only unnecessary popup spacing and control height; keep every field, description, consent statement, link, and validation rule intact.
- Remove the fixed 760px sizing conflict. Coordinate the available viewport height between the popup and embedded form so the parent sizes from the form’s real rendered height.
- Keep the close control visible above the form and prevent hidden overflow from cutting off the bottom.
- On narrow phones, use two short form steps rather than shrinking text below readable sizes or requiring a long vertical scroll.
- Leave the standalone hosted form unchanged; these adjustments apply only when the form is opened as a popup.

## Verification
- Reproduce the exact 904 × 879 view shown in the screenshot and confirm the full consent area and submit button are visible.
- Check desktop, tablet, and mobile sizes; verify the popup itself and embedded page have no vertical scrollbar at standard viewport heights.
- Complete the form at each size and confirm required-field validation, consent controls, links, close control, and submission still work.
- Add a browser-level fit check that compares rendered content height with the available popup height, then run the existing tests and confirm a clean preview build.

## Technical details
The current popup limits its panel to 760px, keeps all fields stacked vertically, and uses hidden overflow. When the rendered form is taller than that cap, the resize message cannot enlarge the panel and the consent/submit area is clipped. The correction will use responsive field grouping plus an explicit parent/iframe viewport-size handshake, with a mobile step layout when a readable one-page form cannot physically fit.
