
I checked the editor code, and the Undo button is wired, but I cannot confirm it is reliably functional in its current state.

What I found:
- In `src/components/funnels/builder/StepPageBuilder.tsx`, the button is connected correctly: `onClick={undo}`.
- It is disabled whenever `historyIndex === 0`.
- The real issue is that the editor keeps resetting its history back to zero when saved data comes back from the parent/page, so Undo becomes inactive again.

Why it is happening:
- `StepPageBuilder` resets `blocks`, `history`, and `historyIndex` whenever `initialBlocks` appears to change.
- `FunnelDetailPage.tsx` re-fetches the step after save and rebuilds `initialBlocks`.
- The current change detection uses `JSON.stringify(initialBlocks)`, which is too fragile for saved JSON content. Backend-normalized JSON can come back with different key ordering or minor shape differences even when the content is effectively the same.
- Result: after auto-save/manual save, the builder thinks “new data arrived”, resets history to `[initialBlocks]`, and Undo goes inactive again.

Implementation plan:
1. Fix history reset logic in `src/components/funnels/builder/StepPageBuilder.tsx`
   - Replace the current raw `JSON.stringify` signature comparison with a stable deep-compare/normalized serializer.
   - Only reset the editor when the user actually switches to a different step or truly different content is loaded.
   - Do not reset undo history just because a save echo came back from the backend.

2. Separate editor history from saved baseline
   - Track a “last saved snapshot” ref separately from the undo stack.
   - Keep undo history for user edits only.
   - Treat auto-save/manual-save responses as persistence acknowledgements, not as fresh editor state that should wipe history.

3. Make Undo stay active after edits and saves
   - Ensure every real edit pushes a new snapshot.
   - Prevent duplicate/no-op snapshots from polluting history.
   - Keep Undo enabled after auto-save and after manual Save until the user truly returns to the original baseline or changes step.

4. Stabilize parent-to-builder props in `src/pages/dashboard/FunnelDetailPage.tsx`
   - Memoize the normalized block data for the active step.
   - Memoize the save callback so the builder is not needlessly re-driven by new function/object identities.
   - This reduces accidental editor state churn during query invalidation and refresh.

5. Keep current UX protections intact
   - Preserve selected block during auto-save.
   - Preserve the properties panel while editing.
   - Keep the crash boundary in place.

Technical details:
- Files to update:
  - `src/components/funnels/builder/StepPageBuilder.tsx`
  - `src/pages/dashboard/FunnelDetailPage.tsx`
- Likely no backend/database changes are needed.
- Expected end result:
  - Undo becomes active immediately after a real edit
  - Undo still works after auto-save
  - Undo still works after clicking Save
  - Saving no longer silently clears editor history or selection
