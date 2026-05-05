// Color contrast utilities for ensuring readable text on any background.
// Uses WCAG relative luminance to pick the best foreground color.

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace("#", "").trim();
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    return { r, g, b };
  }
  if (cleaned.length === 6) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    if ([r, g, b].some(Number.isNaN)) return null;
    return { r, g, b };
  }
  return null;
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const toLinear = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function contrastRatio(fgHex: string, bgHex: string): number {
  const fg = hexToRgb(fgHex);
  const bg = hexToRgb(bgHex);
  if (!fg || !bg) return 1;
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Return the foreground color (from a candidate list) with the best contrast
 * against the given background. Defaults to checking white vs navy.
 */
export function readableForeground(
  bgHex: string,
  candidates: string[] = ["#FFFFFF", "#0B1F3B"],
): string {
  let best = candidates[0];
  let bestRatio = 0;
  for (const c of candidates) {
    const r = contrastRatio(c, bgHex);
    if (r > bestRatio) {
      bestRatio = r;
      best = c;
    }
  }
  return best;
}

/**
 * Pick a safe accent color for a card background. If the configured accent
 * doesn't meet the minimum contrast against the background, fall back.
 */
export function safeAccent(
  accentHex: string,
  bgHex: string = "#FFFFFF",
  fallback: string = "#C9A227",
  minRatio: number = 3,
): string {
  return contrastRatio(accentHex, bgHex) >= minRatio ? accentHex : fallback;
}
