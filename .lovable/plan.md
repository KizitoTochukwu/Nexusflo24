

## Plan: Typewriter Animation on Hero Heading

Add a typewriter effect to the hero `<h1>` that types out the text character by character, similar to the reference image.

### Approach

Create a reusable `TypewriterText` component using React state and `useEffect` to reveal characters one at a time with a blinking cursor.

### Changes

**1. New file: `src/components/TypewriterText.tsx`**
- Accept an array of text segments (each with text, optional className, and whether it's a line break)
- Use `useState` + `useEffect` with `setInterval` to increment a character counter
- Render characters up to the current count, preserving spans and styling
- Show a blinking cursor (`|`) at the end while typing

**2. Edit: `src/pages/Index.tsx`**
- Import and use `TypewriterText` in the hero `<h1>` instead of static text
- Pass segments: `"Automate Your "`, `"Sales & Marketing"` (accent), line break, `"With "`, `"AI-Powered"` (accent), `" Precision"`
- Remove `animate-fade-up` from h1 (typewriter replaces it)

**3. Edit: `src/index.css`**
- Add a `@keyframes blink` animation for the cursor

### Files modified
- `src/components/TypewriterText.tsx` (new)
- `src/pages/Index.tsx`
- `src/index.css`

