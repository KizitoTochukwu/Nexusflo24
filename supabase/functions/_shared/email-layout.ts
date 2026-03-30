/**
 * Shared email layout utilities for NexusFlo24.
 * Converts editor content into structured, branded HTML emails.
 */

const DEFAULT_LOGO_URL =
  "https://stuaikfyuwcjmchcvfie.supabase.co/storage/v1/object/public/email-assets/nexusflo24-logo-profile.png";

export interface TemplateOptions {
  preheader?: string;
  logo?: { url?: string; alignment?: string; size?: number; width?: number; height?: number; autoHeight?: boolean; visible?: boolean };
  header?: { color?: string };
  unsubscribe?: { enabled?: boolean; text?: string };
  footer?: { text?: string; color?: string; alignment?: string };
  unsubUrl?: string;
}

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

    if (!line) { i++; continue; }

    if (/^-{3,}$/.test(line)) {
      blocks.push('<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />');
      i++; continue;
    }

    if (/^[•\-]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[•\-]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[•\-]\s+/, ""));
        i++;
      }
      blocks.push(
        `<ul style="margin:0 0 16px;padding-left:24px;color:#0B1F3B;">${items
          .map((it) => `<li style="margin-bottom:6px;line-height:1.6;font-size:15px;">${it}</li>`)
          .join("")}</ul>`
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        `<ol style="margin:0 0 16px;padding-left:24px;color:#0B1F3B;">${items
          .map((it) => `<li style="margin-bottom:6px;line-height:1.6;font-size:15px;">${it}</li>`)
          .join("")}</ol>`
      );
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const sizes: Record<number, string> = { 1: "24px", 2: "20px", 3: "17px" };
      blocks.push(
        `<h${level} style="margin:0 0 12px;font-size:${sizes[level]};font-weight:bold;color:#0B1F3B;">${headingMatch[2]}</h${level}>`
      );
      i++; continue;
    }

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
  options?: TemplateOptions
): string {
  const logo = {
    url: DEFAULT_LOGO_URL,
    alignment: "center",
    size: 56,
    visible: true,
    ...options?.logo,
  };
  const unsub = {
    enabled: true,
    text: "You received this email because you subscribed to NexusFlo24.",
    ...options?.unsubscribe,
  };
  const footer = {
    text: "© NexusFlo24 · AI-Powered Marketing Automation",
    color: "#C9A227",
    alignment: "center",
    ...options?.footer,
  };

  const preheader = options?.preheader
    ? `<span style="display:none;font-size:1px;color:#f4f5f7;max-height:0;overflow:hidden;">${options.preheader}</span>`
    : "";

  const logoBlock = logo.visible && logo.url
    ? `<tr><td align="${logo.alignment}" style="padding:0 0 24px;"><img src="${logo.url}" width="${logo.size}" height="${logo.size}" alt="NexusFlo24" style="border-radius:10px;display:block;" /></td></tr>`
    : "";

  // Unsubscribe footer inside the body card
  let unsubBlock = "";
  if (unsub.enabled) {
    const unsubLink = options?.unsubUrl
      ? `<a href="${options.unsubUrl}" style="color:#0B1F3B;text-decoration:underline;">Unsubscribe</a>`
      : `<a href="#" style="color:#0B1F3B;text-decoration:underline;">Unsubscribe</a>`;
    unsubBlock = `<div style="text-align:center;padding:24px 0 8px;border-top:1px solid #e5e7eb;margin-top:32px;"><span style="font-size:12px;color:#999999;">${unsub.text} ${unsubLink}</span></div>`;
  }

  const footerBlock = footer.text
    ? `<tr><td align="${footer.alignment}" style="padding:24px 0 0;"><p style="margin:0;font-size:12px;color:${footer.color};">${footer.text}</p></td></tr>`
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
        ${logoBlock}
        <!-- Body Card -->
        <tr>
          <td class="email-body" style="background-color:#ffffff;border-radius:16px;padding:32px 32px 24px;box-shadow:0 2px 12px rgba(0,0,0,0.05);">
            ${body}
            ${unsubBlock}
          </td>
        </tr>
        ${footerBlock}
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
