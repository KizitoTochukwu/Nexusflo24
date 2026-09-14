# Make the AI funnel builder visible on the Funnels page

An AI funnel generator already exists in this app, but it is hidden: you only find it after clicking "Create Funnel" and then picking "Generate with AI". This plan surfaces it directly on the Funnels page and improves the generated result, matching how the Forms page works.

## What changes for you

- A "Generate with AI" button sits next to "Create Funnel" at the top of the Funnels page.
- Clicking it opens the AI builder straight away — no extra step.
- Starter ideas (one tap): lead magnet funnel, webinar registration, coaching application, product launch, free consultation booking.
- You describe your offer and audience; optional fields for offer name and target audience sharpen the copy.
- You see a preview of the proposed pages and their blocks before anything is created.
- The funnel is created as a draft and opens in the funnel editor so you can adjust it.
- Clear messages if the AI is busy or workspace AI credits run out.

## Technical notes

- `src/pages/dashboard/DashboardFunnels.tsx`: add a Sparkles "Generate with AI" outline button beside the existing create button, controlling a new `aiOpen` state.
- `src/components/funnels/CreateFunnelDialog.tsx`: accept optional `open` / `onOpenChange` / `initialMode` props so it can be opened directly in `ai` mode while the existing internal-trigger behaviour stays unchanged.
- Add starter-idea chips and optional offer/audience inputs to the AI panel; they are appended to the prompt sent to the function.
- `supabase/functions/generate-funnel/index.ts`: switch the model to `openai/gpt-6-astra` with `reasoning_effort: "low"` and keep JSON-object output, fence stripping and structure validation; align the 403 case with the existing 429/402 handling. Redeploy the function.
- Generated steps keep flowing through the existing `normalizeBlocks` layer in `FunnelDetailPage.tsx`, so block schema stays valid.
- Verify with a real generation call and a browser check of the Funnels page.
