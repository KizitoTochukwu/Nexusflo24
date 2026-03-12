/**
 * Client-side mirror of the edge function email-layout.ts
 * Used to render a realistic email preview in the automation builder.
 */

import type { TemplateSettings } from "./EmailTemplateSettings";
import { DEFAULT_TEMPLATE_SETTINGS } from "./EmailTemplateSettings";

export function formatEmailBody(raw: string): string {
  if (!raw) return "";

  if (raw.trim().startsWith("<!DOCTYPE") || raw.trim().startsWith("<html")) {
    return raw;
  }

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

export function buildPreviewHtml(
  rawBody: string,
  subject: string,
  previewValues: Record<string, string>,
  templateSettings?: Partial<TemplateSettings>
): string {
  const ts = {
    logo: { ...DEFAULT_TEMPLATE_SETTINGS.logo, ...templateSettings?.logo },
    unsubscribe: { ...DEFAULT_TEMPLATE_SETTINGS.unsubscribe, ...templateSettings?.unsubscribe },
    footer: { ...DEFAULT_TEMPLATE_SETTINGS.footer, ...templateSettings?.footer },
  };

  // Backward compat: migrate old `size` to width/height
  const logoWidth = ts.logo.width ?? (ts.logo as any).size ?? 120;
  const logoAutoHeight = ts.logo.autoHeight ?? true;
  const logoHeight = ts.logo.height ?? (ts.logo as any).size ?? 56;

  // Interpolate variables with preview values
  let content = rawBody;
  for (const [key, val] of Object.entries(previewValues)) {
    content = content.split(key).join(val);
  }
  content = content.replace(/\{\{(\w+)\}\}/g, "[$1]");

  const formattedBody = formatEmailBody(content);

  // Build unsubscribe footer
  const unsubFooter = ts.unsubscribe.enabled
    ? `<div style="text-align:center;padding:24px 0 8px;border-top:1px solid #e5e7eb;margin-top:32px;"><span style="font-size:12px;color:#999999;">${ts.unsubscribe.text} <a href="#" style="color:#0B1F3B;text-decoration:underline;">Unsubscribe</a></span></div>`
    : "";

  // Build logo block
  const logoBlock = ts.logo.visible && ts.logo.url
    ? `<tr><td align="${ts.logo.alignment}" style="padding:0 0 24px;"><img src="${ts.logo.url}" width="${ts.logo.size}" height="${ts.logo.size}" alt="Logo" style="border-radius:10px;display:block;" /></td></tr>`
    : "";

  // Build footer
  const footerBlock = ts.footer.text
    ? `<tr><td align="${ts.footer.alignment}" style="padding:24px 0 0;"><p style="margin:0;font-size:12px;color:${ts.footer.color};">${ts.footer.text}</p></td></tr>`
    : "";

  let interpolatedSubject = subject;
  for (const [key, val] of Object.entries(previewValues)) {
    interpolatedSubject = interpolatedSubject.split(key).join(val);
  }

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${interpolatedSubject || "Email Preview"}</title>
<style>
  body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  body { margin: 0; padding: 0; width: 100% !important; }
  img { border: 0; outline: none; text-decoration: none; }
  a { color: #0B1F3B; text-decoration: underline; }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:'Inter',Arial,'Helvetica Neue',Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <!-- Subject bar -->
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr>
          <td style="padding:0 0 12px;">
            <div style="background:#0B1F3B;border-radius:12px 12px 0 0;padding:14px 20px;color:#ffffff;font-size:14px;font-weight:600;">
              Subject: ${interpolatedSubject || "(no subject)"}
            </div>
          </td>
        </tr>
      </table>
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;margin-top:-12px;">
        ${logoBlock}
        <!-- Body Card -->
        <tr>
          <td style="background-color:#ffffff;border-radius:16px;padding:32px 32px 24px;box-shadow:0 2px 12px rgba(0,0,0,0.05);">
            ${formattedBody}
            ${unsubFooter}
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
