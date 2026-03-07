

## Plan: Dynamic Content Insertions in Funnel Page Builder

### Overview
Add variable insertion, autocomplete, CTA buttons, smart links, conditional content, and preview mode to the funnel builder's text/heading blocks -- reusing the existing automation email editor components where possible.

### Changes

#### 1. New Component: `src/components/funnels/builder/FunnelTextEditor.tsx`
A rich text editor component for funnel text/heading blocks, similar to `AutomationEmailEditor` but tailored for the funnel context. Features:
- **Insert dropdown** reusing `InsertDropdown` from the email editor (same variables, links, CRM data)
- **Formatting toolbar** reusing `FormattingToolbar`
- **CTA Button dialog** reusing `ButtonInsertDialog`
- **Variable autocomplete** reusing `VariableAutocomplete` (triggered by `{{`)
- **Preview toggle** rendering example data via `PREVIEW_VALUES`
- **Conditional content helper**: Simple UI to wrap selected text in `{{#if lead_score > 50}}...{{/if}}` syntax
- Textarea with `min-h-[200px]`, `text-base`, `leading-relaxed`, resizable

#### 2. Update `PropertiesPanel.tsx`
- Replace the plain `<Textarea>` in `TextProps` (line 309) and the `<Input>` in `HeadingProps` (line 273) with the new `FunnelTextEditor` component
- The editor takes the current text value and passes changes back via `update("text", ...)`

#### 3. Update `PublicBlockRenderer.tsx`
- For `text` and `heading` blocks, replace plain text rendering with a function that interpolates `{{variable}}` placeholders from URL query params or a lead context prop
- Add `dangerouslySetInnerHTML` support so HTML formatting (bold, links, buttons) renders correctly on public pages
- Add conditional content parsing: strip `{{#if ...}}...{{/if}}` blocks based on lead data
- Accept an optional `leadData` prop for variable interpolation

#### 4. Update `PublicFunnel.tsx`
- Pass lead query params (or future lead context) as `leadData` to `PublicBlockRenderer`

#### 5. New Constants: `src/components/funnels/builder/funnelEditorConstants.ts`
- Funnel-specific smart links: Booking Page, Next Step, Offer Page, Checkout, External URL
- Conditional content templates
- Reexport `VARIABLE_OPTIONS`, `PREVIEW_VALUES` from the email editor constants

### Scope
- 1 new component (`FunnelTextEditor`)
- 1 new constants file
- 2 modified files (`PropertiesPanel.tsx`, `PublicBlockRenderer.tsx`)
- 1 minor update (`PublicFunnel.tsx`)
- No database changes needed
- Reuses 4 existing email editor sub-components

