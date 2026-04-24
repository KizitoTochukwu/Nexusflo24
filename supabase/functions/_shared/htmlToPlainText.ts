/**
 * Converts HTML (typically from a contentEditable rich-text editor) to a
 * plain-text representation suitable for WhatsApp / SMS message bodies.
 *
 * - Decodes the most common HTML entities (&nbsp;, &amp;, &lt;, &gt;,
 *   &quot;, &#39;, numeric entities).
 * - Converts block-level closing tags (</div>, </p>, </li>, <br>, etc.)
 *   into newlines so multi-line messages survive the strip.
 * - Converts <a href="URL">label</a> into "label (URL)" — or just URL when
 *   the link label IS the URL (avoids the "https://x https://x" duplication
 *   we currently see in WhatsApp).
 * - Strips all remaining tags and collapses excessive blank lines.
 *
 * If the input does not contain any HTML tags or named entities, it is
 * returned unchanged. This keeps the function safe to apply unconditionally
 * to every outbound WhatsApp / SMS message.
 */
export function htmlToPlainText(input: unknown): string {
  if (input == null) return "";
  const raw = String(input);
  if (!raw) return "";

  // Fast path: no tags AND no entities — nothing to do.
  if (!/[<&]/.test(raw)) return raw;

  let s = raw;

  // 1. Anchors → "label (url)" or just "url" if label == url
  s = s.replace(
    /<a\b[^>]*?href\s*=\s*(["'])([\s\S]*?)\1[^>]*>([\s\S]*?)<\/a\s*>/gi,
    (_m, _q, href, label) => {
      const cleanLabel = stripTagsOnly(label).trim();
      const cleanHref = String(href).trim();
      if (!cleanLabel || cleanLabel === cleanHref) return cleanHref;
      return `${cleanLabel} (${cleanHref})`;
    },
  );

  // 2. Block-level boundaries → newline
  s = s
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/\s*(div|p|li|h[1-6]|tr|blockquote|section|article|header|footer|pre)\s*>/gi, "\n")
    .replace(/<\s*li\b[^>]*>/gi, "\n• ")
    .replace(/<\s*hr\s*\/?\s*>/gi, "\n———\n");

  // 3. Strip everything else
  s = stripTagsOnly(s);

  // 4. Decode entities
  s = decodeEntities(s);

  // 5. Normalise whitespace: collapse 3+ newlines to 2, trim spaces on each
  //    line, drop leading/trailing whitespace.
  s = s
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return s;
}

function stripTagsOnly(s: string): string {
  return s.replace(/<\/?[^>]+>/g, "");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&hellip;/g, "…")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&#(\d+);/g, (_m, n) => {
      const code = parseInt(n, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_m, h) => {
      const code = parseInt(h, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    });
}
