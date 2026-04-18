
The user wants to replace the hero background image with the uploaded business team meeting photo.

Current setup (src/pages/Index.tsx line 144):
- Uses `heroTeam` imported from `@/assets/hero-team.jpg`
- Rendered as a full-cover background `<img>` with a navy gradient overlay

Plan:
1. Copy `user-uploads://Screenshot_18-4-2026_22513_chatgpt.com.jpeg` to `src/assets/hero-team.jpg`, replacing the existing file.
2. No code changes needed — the import path stays the same, so the new image will automatically be used in the hero section.

The navy gradient overlay (`from-navy/70 via-navy/50 to-navy/80`) will continue to ensure the white text remains readable over the bright meeting room photo.
