/**
 * Shared email layout utilities for NexusFlo24.
 * Converts editor content into structured, branded HTML emails.
 */

const LOGO_URL =
  "https://stuaikfyuwcjmchcvfie.supabase.co/storage/v1/object/public/email-assets/nexusflo24-logo-profile.png";

/**
 * Converts raw editor content (plain text, \n, bullets, inline HTML) into
 * structured HTML with proper paragraph spacing, lists, and dividers.
 */
export function formatEmailBody(raw: string): string {
  if (!raw) return "";

  // If content is already a full HTML document, return as-is
  if (raw.trim().startsWith("<!DOCTYPE") || raw.trim().startsWith("<html")) {
    return raw;
  }

  // Split into lines (handle both \n and actual newlines)
  const lines = raw.replace(/\\n/g, "\n").split("\n");
  const blocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Empty line — skip (creates paragraph break)
    if (!line) {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^-{3,}$/.test(line)) {
      blocks.push(
        '<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />'
      );
      i++;
      continue;
    }

    // Unordered list (• or - prefix)
    if (/^[•\-]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[•\-]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[•\-]\s+/, ""));
        i++;
      }
      blocks.push(
        `<ul style="margin:0 0 16px;padding-left:24px;color:#0B1F3B;">${items
          .map(
            (it) =>
              `<li style="margin-bottom:6px;line-height:1.6;font-size:15px;">${it}</li>`
          )
          .join("")}</ul>`
      );
      continue;
    }

    // Ordered list (1. 2. etc.)
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        `<ol style="margin:0 0 16px;padding-left:24px;color:#0B1F3B;">${items
          .map(
            (it) =>
              `<li style="margin-bottom:6px;line-height:1.6;font-size:15px;">${it}</li>`
          )
          .join("")}</ol>`
      );
      continue;
    }

    // Heading detection (# ## ###)
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const sizes: Record<number, string> = { 1: "24px", 2: "20px", 3: "17px" };
      blocks.push(
        `<h${level} style="margin:0 0 12px;font-size:${sizes[level]};font-weight:bold;color:#0B1F3B;">${headingMatch[2]}</h${level}>`
      );
      i++;
      continue;
    }

    // Regular paragraph — collect consecutive non-empty, non-special lines
    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^[•\-]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^-{3,}$/.test(lines[i].trim()) &&
      !/^#{1,3}\s+/.test(lines[i].trim())
    ) {
      paragraphLines.push(lines[i].trim());
      i++;
    }

    if (paragraphLines.length) {
      blocks.push(
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#0B1F3B;">${paragraphLines.join("<br />")}</p>`
      );
    }
  }

  return blocks.join("");
}

/**
 * Wraps formatted email body in a responsive, branded HTML email template.
 */
export function wrapEmailTemplate(
  body: string,
  options?: { preheader?: string }
): string {
  const preheader = options?.preheader
    ? `<span style="display:none;font-size:1px;color:#f4f5f7;max-height:0;overflow:hidden;">${options.preheader}</span>`
    : "";

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>NexusFlo24</title>
<style>
  body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  body { margin: 0; padding: 0; width: 100% !important; }
  img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
  a { color: #0B1F3B; text-decoration: underline; }
  @media only screen and (max-width: 640px) {
    .email-container { padding: 16px !important; }
    .email-body { padding: 24px 16px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:'Inter',Arial,'Helvetica Neue',Helvetica,sans-serif;">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;">
  <tr>
    <td align="center" class="email-container" style="padding:32px 24px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Logo -->
        <tr>
          <td align="center" style="padding:0 0 24px;">
            <img src="${LOGO_URL}" width="56" height="56" alt="NexusFlo24" style="border-radius:10px;display:block;" />
          </td>
        </tr>
        <!-- Body Card -->
        <tr>
          <td class="email-body" style="background-color:#ffffff;border-radius:16px;padding:32px 32px 24px;box-shadow:0 2px 12px rgba(0,0,0,0.05);">
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td align="center" style="padding:24px 0 0;">
            <p style="margin:0;font-size:12px;color:#C9A227;">© NexusFlo24 · AI-Powered Marketing Automation</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
