

# Increase Favicon Size

Favicons are fixed-size icons determined by the image file itself, not by HTML attributes. The browser renders them at standard sizes (16x16, 32x32, etc.) in the tab bar regardless of the source image dimensions.

## What I'll do

1. **Copy the uploaded image** (`user-uploads://ChatGPT_Image_Apr_15_2026_10_52_00_PM-2.png`) to `public/favicon.png`, replacing the current one
2. **Generate properly sized favicon variants** using ImageMagick to create a multi-size `.ico` file (16x16, 32x32, 48x48) and a 180x180 Apple touch icon — this ensures the favicon renders crisply at every size the browser requests
3. **Update `index.html`** to reference both the `.ico` for standard browsers and a separate 180x180 PNG for Apple touch icon:
   ```html
   <link rel="icon" href="/favicon.ico" type="image/x-icon">
   <link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32">
   <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">
   ```

This gives you the largest, sharpest favicon possible across all browsers and devices.

