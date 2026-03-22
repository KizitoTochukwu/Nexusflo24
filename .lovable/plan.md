

## Plan: Navy Cards with AI-Generated Images for "How It Works"

### Overview
Add hyper-realistic AI-generated images to each of the three "How It Works" cards (Capture, Nurture, Convert) and change the card backgrounds from white to branded navy blue.

### Changes

**1. Generate three images using Lovable AI (google/gemini-3-pro-image-preview)**

Create three hyper-realistic images via an edge function or inline AI call:
- **Capture**: A sleek digital form/chatbot interface capturing leads — glowing UI elements, professional lighting
- **Nurture**: Multi-channel marketing flow with email/WhatsApp/SMS visual — connected nodes, warm tones
- **Convert**: Sales dashboard with rising metrics and lead scoring — success/growth imagery

Save images to `src/assets/` as `step-capture.png`, `step-nurture.png`, `step-convert.png`.

**2. Update the `steps` array** to include an `image` property pointing to each generated asset.

**3. Restyle the cards in the "How It Works" section**:
- Background: `bg-[#0B1F3A]` (branded navy) instead of `bg-card`
- Text colors: `text-white`, `text-white/70` for descriptions
- Add the image at the top of each card in a rounded container with `overflow-hidden`
- Accent elements (number, icon circle, link) adjusted for contrast on dark background
- Border: `border-navy-light` or subtle lighter border for definition

### Card structure (per card)
```text
┌──────────────────────┐
│   [hyper-realistic   │
│      image]          │  ← rounded-t-xl, h-40, object-cover
├──────────────────────┤
│  01                  │
│  [icon]              │  ← navy bg, white/gold text
│  Capture             │
│  Description text    │
│  Learn more →        │
└──────────────────────┘
```

### Files modified
- `src/pages/Index.tsx` — card styling + image rendering
- `src/assets/step-capture.png` (new, AI-generated)
- `src/assets/step-nurture.png` (new, AI-generated)
- `src/assets/step-convert.png` (new, AI-generated)

