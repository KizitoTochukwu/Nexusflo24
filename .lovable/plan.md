# Convert Business Inputs to Guided 8-Step Wizard

Replace the single-form Business Inputs card on `/tools/roi-savings-calculator` with a one-question-at-a-time wizard. Everything else on the page (hero, results card layout, lead-capture gate, recommendations, CTA, FAQ, formulas, edge function, CRM/automation dispatch) stays exactly as it is.

## Scope

Only two files change:

1. **New:** `src/components/roi/RoiCalculatorWizard.tsx` — the guided wizard card.
2. **Edit:** `src/pages/tools/RoiSavingsCalculator.tsx` — swap the existing inline form for `<RoiCalculatorWizard />`, and gate the right-side results panel behind a "calculated" flag so it shows a placeholder until Step 8 is submitted.

No changes to: calculator formulas (`src/lib/roi/calculator.ts`), settings hook, edge function, DB, automations, lead-capture dialog, or any other section.

## Wizard behaviour

- 8 steps, in the exact order and copy from the spec:
  1. Currency (cards: GBP/USD/EUR/NGN, default GBP)
  2. Leads/month (number + quick chips 25/50/100/250/500)
  3. Average customer value (currency, symbol from step 1)
  4. Conversion rate % (number + chips 5/10/15/20/25)
  5. Missed follow-up % (number + chips 10/20/30/40/50)
  6. Manual follow-up hours (number + chips 10/20/40/80/100)
  7. Staff cost/hour (currency)
  8. Monthly software cost (currency, optional, "Skip this question" link)
- Header: "Question X of 8" + shadcn `Progress` bar (value = step/8 × 100).
- Card body: short heading, supporting text, one large input, inline validation.
- Footer: Previous (outline, hidden on step 1) + Next (gold primary). Step 8 shows **Calculate My Savings** instead of Next. Skip link on step 8 sets `monthly_software_cost = 0` and submits.
- Validation: no negatives; percentages 0–100; numbers accept decimals; block Next until valid; Enter key = Next (or Calculate on step 8); Enter never submits earlier steps.
- Preserve all answers when moving back/forward. Persist the in-progress answers + current step to `sessionStorage` under `nf24:roi-wizard` (cleared after calculation). No `localStorage`, no sensitive data.
- Subtle transition between questions (Tailwind `transition-opacity` + short fade — no heavy motion library).
- Accessibility: `<label htmlFor>` on every input, `aria-invalid` + `aria-describedby` for errors, `role="status" aria-live="polite"` on error text, focus moves to the question heading after Next/Previous (`ref` + `.focus()` with `tabIndex={-1}`), progress announced via `aria-label` on the bar.

## Results panel gating

In `RoiSavingsCalculator.tsx`:

- Add `const [calculated, setCalculated] = useState(false)` (already effectively there via the existing `hasResults` / gate — reuse if present, otherwise add).
- Wizard's Calculate button calls the existing `calculate(...)` + state setters, then `setCalculated(true)`, then on mobile `resultsRef.current?.scrollIntoView({ behavior: "smooth" })`.
- While `!calculated`: render the existing dark results card shell but replace the numeric tiles with a centred placeholder:
  > "Complete the questions to see your estimated monthly and annual opportunity."
  with the existing calculator icon.
- After calculated: render the current results exactly as today (unchanged tiles, breakdown bar, disclaimer). Lead-capture gate and recommendations continue to work off the same state.

## Layout

- Desktop: keep existing two-column grid (wizard left, results right).
- Mobile: wizard first, results below; buttons full-width via `w-full sm:w-auto`; question + input never overflow horizontally.

## State wiring

Wizard is a controlled child. Parent owns `inputs: CalculatorInputs` and `results` (as today). Wizard receives `{ inputs, setInputs, onCalculate }`. `onCalculate` runs the existing pure `calculate()` and flips `calculated`. Previous/Next never touch results state, so no duplicate submissions and no premature edge-function calls. Lead is only submitted through the existing lead-capture dialog after Calculate — unchanged.

## Not changing

- `src/lib/roi/calculator.ts`
- `supabase/functions/roi-calculator-submit/*`
- `src/hooks/useRoiCalculatorSettings.ts`
- Lead capture dialog, recommendations block, feature cards, CTA, FAQ, hero, header/footer
- DB schema, automations trigger registry, merge variables
