## Goal

Make the **Consent** checkbox in the public form renderer look premium — a polished, branded card-style block instead of a bare checkbox + label.

## Design

Render the consent field as a subtle bordered card that uses the form's accent color, with:

- A soft tinted background (accent color at very low opacity) and a 1px border in the accent color at low opacity
- Rounded corners matching the form's `border_radius`
- A larger, more refined custom checkbox styled with the accent color (checked state filled with accent, white check)
- A small **shield icon** (lucide `ShieldCheck`) in the accent color sitting next to the label to signal trust/privacy
- Slightly improved typography: label in `text-sm leading-relaxed`, with the required asterisk in accent
- Smooth hover state (border deepens slightly)
- Focus-visible ring in the accent color for accessibility
- Entire card is clickable to toggle (label wraps the checkbox area)

```text
┌────────────────────────────────────────────┐
│  ☑  🛡  I agree to receive marketing       │
│        emails. *                           │
└────────────────────────────────────────────┘
```

## Technical changes

**File:** `src/components/forms/PublicFormRenderer.tsx`

1. Update only the `case "consent"` branch (keep `case "checkbox"` as the existing minimal style — that's a generic checkbox field, not a consent block).
2. Replace the markup with a card wrapper:
   - `border` + `rounded-[var(--radius)]` using `theme.border_radius`
   - Background: accent at ~6% opacity (use inline style with `${accent}10` hex alpha)
   - Border: accent at ~25% opacity
   - Padding `p-3 sm:p-4`, `flex items-start gap-3`
   - Hover: border opacity bump via class + inline style transition
3. Style the `Checkbox` to use the accent color when checked (pass `style={{ borderColor: accent }}` and a `data-[state=checked]:bg-[accent]` via inline style, or wrap with a span using accent).
4. Add `ShieldCheck` icon (16–18px) in accent color before the label text.
5. Label uses `text-sm leading-relaxed cursor-pointer`, required asterisk keeps existing accent styling.
6. Add `transition-colors` for hover/focus polish.

No schema changes, no new dependencies, no other files touched. The change is purely presentational and scoped to the consent field render path.

## Out of scope

- The plain `checkbox` field type stays as-is (used for generic yes/no inputs).
- The field library tile (left sidebar in builder) is unchanged.
- No new properties added to `FieldPropertiesPanel` — the consent label/required toggle already cover what's needed.