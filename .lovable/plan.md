

# Replace NexusFlo24 Logo Across the App

## Summary
Replace the existing logo files (`nexusflo24-logo-full.png` and `nexusflo24-logo.png`) with the new uploaded logo image. The new image will serve as the full logo. A cropped/icon version will also be created for the sidebar icon and footer.

## Steps

1. **Copy the new logo** into `src/assets/nexusflo24-logo-full.png` (replacing the existing full logo)
2. **Create an icon version** — crop/resize the uploaded image to extract just the circular icon portion and save as `src/assets/nexusflo24-logo.png`
3. **Upload to storage** — upload the new logo to the `email-assets` bucket as `nexusflo24-logo-profile.png` so email templates also use the updated branding

## Files affected (no code changes needed)
The following files already import from the same asset paths, so replacing the files in-place updates everything automatically:
- `src/components/brand/SidebarLogo.tsx` — sidebar logo
- `src/components/layout/Header.tsx` — public header
- `src/components/layout/Footer.tsx` — footer icon
- `src/components/auth/AuthLayout.tsx` — auth panel branding
- `src/pages/Login.tsx`, `src/pages/Register.tsx` — login/register pages

## Question
Since the uploaded image contains both the icon (circular mark) and the wordmark, I need to know: should I use the full image (icon + wordmark) as the full logo and crop just the circular part for the icon? Or do you have a separate icon-only file to upload?

## Technical note
The email templates reference a hosted URL in storage. I'll upload the new logo there as well to keep email branding consistent.

