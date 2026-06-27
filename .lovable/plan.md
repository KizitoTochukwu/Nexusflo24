## Goal
Replace the three "How It Works" card images on the homepage with hyper-realistic, context-matched photography.

## Changes

Generate 3 hyper-realistic images (already previewed) and swap the imports in `src/pages/Index.tsx`:

1. **Capture** → `src/assets/step-capture.jpg` — laptop on a dark navy desk showing an AI-powered lead capture form with gold accents.
2. **Nurture** → `src/assets/step-nurture.jpg` — hand holding phone with glowing Email / WhatsApp / SMS notifications connected by gold light streams.
3. **Convert** → `src/assets/step-convert.jpg` — business analyst presenting a sales conversion & lead-scoring dashboard with rising gold/green charts.

Single-file edit in `src/pages/Index.tsx` (lines 19–21): swap the three `step-*.png` imports for the new `.jpg` files. The `steps` array already wires `image: stepCapture | stepNurture | stepConvert` into the card markup, so no further changes are needed.

## Out of scope
- No layout, typography, or copy changes to the cards.
- No edits to other sections.
