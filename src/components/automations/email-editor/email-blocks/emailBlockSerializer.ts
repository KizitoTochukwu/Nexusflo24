import {
  EmailBlock, TextBlockProps, ImageBlockProps, ButtonBlockProps,
  DividerBlockProps, SpacerBlockProps, SocialBlockProps, ColumnsBlockProps,
} from "./emailBlockTypes";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderText(p: TextBlockProps): string {
  // Allow basic HTML in content (bold, italic, links etc.)
  const content = p.content.replace(/\n/g, "<br />");
  return `<div style="font-size:${p.fontSize}px;color:${p.color};text-align:${p.alignment};font-weight:${p.fontWeight};line-height:${p.lineHeight};margin:0 0 16px;">${content}</div>`;
}

function renderImage(p: ImageBlockProps): string {
  if (!p.src) return "";
  const img = `<img src="${escapeHtml(p.src)}" alt="${escapeHtml(p.alt)}" width="${p.width}%" style="max-width:100%;display:block;border-radius:${p.borderRadius}px;${p.alignment === "center" ? "margin:0 auto;" : ""}" />`;
  const wrapped = p.linkUrl ? `<a href="${escapeHtml(p.linkUrl)}" target="_blank">${img}</a>` : img;
  return `<div style="text-align:${p.alignment};margin:0 0 16px;">${wrapped}</div>`;
}

function renderButton(p: ButtonBlockProps): string {
  const widthStyle = p.fullWidth ? "display:block;width:100%;box-sizing:border-box;" : "display:inline-block;";
  return `<div style="text-align:${p.alignment};margin:0 0 16px;">
<a href="${escapeHtml(p.url)}" target="_blank" style="${widthStyle}background-color:${p.bgColor};color:${p.textColor};font-weight:600;padding:12px 28px;border-radius:${p.borderRadius}px;text-decoration:none;font-size:${p.fontSize}px;text-align:center;">${escapeHtml(p.label)}</a>
</div>`;
}

function renderDivider(p: DividerBlockProps): string {
  return `<hr style="border:none;border-top:${p.thickness}px ${p.style} ${p.color};margin:${p.margin}px 0;" />`;
}

function renderSpacer(p: SpacerBlockProps): string {
  return `<div style="height:${p.height}px;line-height:${p.height}px;font-size:1px;">&nbsp;</div>`;
}

function renderSocial(p: SocialBlockProps): string {
  const socials = [
    { key: "facebook", label: "Facebook", color: "#1877F2", initial: "f" },
    { key: "twitter", label: "X", color: "#000000", initial: "𝕏" },
    { key: "linkedin", label: "LinkedIn", color: "#0A66C2", initial: "in" },
    { key: "instagram", label: "Instagram", color: "#E4405F", initial: "📷" },
  ] as const;

  const icons = socials
    .filter((s) => p.links[s.key])
    .map((s) => {
      return `<a href="${escapeHtml(p.links[s.key])}" target="_blank" style="display:inline-block;width:${p.iconSize}px;height:${p.iconSize}px;background-color:${s.color};color:#ffffff;border-radius:50%;text-align:center;line-height:${p.iconSize}px;font-size:${Math.round(p.iconSize * 0.4)}px;font-weight:bold;text-decoration:none;margin:0 4px;">${s.initial}</a>`;
    })
    .join("");

  if (!icons) return "";
  return `<div style="text-align:${p.alignment};margin:0 0 16px;">${icons}</div>`;
}

function renderColumns(p: ColumnsBlockProps): string {
  const colWidth = Math.floor(100 / p.columnCount);
  const cells = p.columns
    .slice(0, p.columnCount)
    .map((col) => `<td style="width:${colWidth}%;padding:0 ${p.gap / 2}px;vertical-align:top;font-size:15px;line-height:1.6;color:#0B1F3B;">${col.replace(/\n/g, "<br />")}</td>`)
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;"><tr>${cells}</tr></table>`;
}

export function blocksToHtml(blocks: EmailBlock[]): string {
  return blocks.map((block) => {
    switch (block.type) {
      case "text": return renderText(block.props as TextBlockProps);
      case "image": return renderImage(block.props as ImageBlockProps);
      case "button": return renderButton(block.props as ButtonBlockProps);
      case "divider": return renderDivider(block.props as DividerBlockProps);
      case "spacer": return renderSpacer(block.props as SpacerBlockProps);
      case "social": return renderSocial(block.props as SocialBlockProps);
      case "columns": return renderColumns(block.props as ColumnsBlockProps);
      default: return "";
    }
  }).join("\n");
}

/**
 * Try to parse a message string as a block JSON array.
 * Returns null if it's legacy plain text / HTML.
 */
export function parseBlocksFromMessage(message: string): EmailBlock[] | null {
  if (!message) return null;
  const trimmed = message.trim();
  if (!trimmed.startsWith("[")) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].type && parsed[0].id) {
      return parsed as EmailBlock[];
    }
  } catch {
    // not JSON
  }
  return null;
}
