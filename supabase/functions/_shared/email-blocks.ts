/**
 * Server-side renderer for visual email-editor blocks.
 * Mirrors src/components/automations/email-editor/email-blocks/emailBlockSerializer.ts
 * but is Deno-safe (no React / lucide imports).
 *
 * When an automation/workflow/campaign body is stored as a JSON array of blocks
 * (created by the visual email editor), edge functions must convert that JSON
 * to email-client-safe HTML BEFORE wrapping with the brand template.
 * Otherwise the recipient sees the raw JSON in their inbox.
 */

export type EmailBlockType =
  | "text" | "image" | "button" | "divider" | "spacer" | "social" | "columns";

export interface TextBlockProps {
  content: string;
  fontSize: number;
  color: string;
  alignment: "left" | "center" | "right" | "justify";
  fontWeight: "normal" | "bold";
  lineHeight: number;
}
export interface ImageBlockProps {
  src: string; alt: string; width: number;
  alignment: "left" | "center" | "right";
  linkUrl: string; borderRadius: number;
}
export interface ButtonBlockProps {
  label: string; url: string; bgColor: string; textColor: string;
  borderRadius: number; alignment: "left" | "center" | "right";
  fullWidth: boolean; fontSize: number;
}
export interface DividerBlockProps {
  color: string; thickness: number;
  style: "solid" | "dashed" | "dotted"; margin: number;
}
export interface SpacerBlockProps { height: number; }
export interface SocialBlockProps {
  alignment: "left" | "center" | "right"; iconSize: number;
  links: { facebook: string; twitter: string; linkedin: string; instagram: string };
}
export interface ColumnsBlockProps {
  columnCount: 2 | 3; columns: string[]; gap: number;
}

export interface EmailBlock {
  id: string;
  type: EmailBlockType;
  props: any;
}

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderText(p: TextBlockProps): string {
  const content = String(p.content ?? "").replace(/\n/g, "<br />");
  return `<div style="font-size:${p.fontSize ?? 15}px;color:${p.color ?? "#0B1F3B"};text-align:${p.alignment ?? "left"};font-weight:${p.fontWeight ?? "normal"};line-height:${p.lineHeight ?? 1.6};margin:0 0 16px;">${content}</div>`;
}

function renderImage(p: ImageBlockProps): string {
  if (!p?.src) return "";
  const img = `<img src="${escapeHtml(p.src)}" alt="${escapeHtml(p.alt || "")}" width="${p.width ?? 100}%" style="max-width:100%;display:block;border-radius:${p.borderRadius ?? 0}px;${p.alignment === "center" ? "margin:0 auto;" : ""}" />`;
  const wrapped = p.linkUrl ? `<a href="${escapeHtml(p.linkUrl)}" target="_blank">${img}</a>` : img;
  return `<div style="text-align:${p.alignment ?? "center"};margin:0 0 16px;">${wrapped}</div>`;
}

function renderButton(p: ButtonBlockProps): string {
  const widthStyle = p.fullWidth ? "display:block;width:100%;box-sizing:border-box;" : "display:inline-block;";
  return `<div style="text-align:${p.alignment ?? "center"};margin:0 0 16px;">
<a href="${escapeHtml(p.url || "#")}" target="_blank" style="${widthStyle}background-color:${p.bgColor ?? "#0B1F3B"};color:${p.textColor ?? "#FFFFFF"};font-weight:600;padding:12px 28px;border-radius:${p.borderRadius ?? 8}px;text-decoration:none;font-size:${p.fontSize ?? 16}px;text-align:center;">${escapeHtml(p.label || "Click Here")}</a>
</div>`;
}

function renderDivider(p: DividerBlockProps): string {
  return `<hr style="border:none;border-top:${p.thickness ?? 1}px ${p.style ?? "solid"} ${p.color ?? "#e5e7eb"};margin:${p.margin ?? 16}px 0;" />`;
}

function renderSpacer(p: SpacerBlockProps): string {
  const h = p.height ?? 16;
  return `<div style="height:${h}px;line-height:${h}px;font-size:1px;">&nbsp;</div>`;
}

function renderSocial(p: SocialBlockProps): string {
  const socials = [
    { key: "facebook", color: "#1877F2", initial: "f" },
    { key: "twitter", color: "#000000", initial: "𝕏" },
    { key: "linkedin", color: "#0A66C2", initial: "in" },
    { key: "instagram", color: "#E4405F", initial: "📷" },
  ] as const;
  const size = p.iconSize ?? 32;
  const icons = socials
    .filter((s) => p.links?.[s.key as keyof typeof p.links])
    .map((s) => `<a href="${escapeHtml(p.links[s.key as keyof typeof p.links])}" target="_blank" style="display:inline-block;width:${size}px;height:${size}px;background-color:${s.color};color:#ffffff;border-radius:50%;text-align:center;line-height:${size}px;font-size:${Math.round(size * 0.4)}px;font-weight:bold;text-decoration:none;margin:0 4px;">${s.initial}</a>`)
    .join("");
  if (!icons) return "";
  return `<div style="text-align:${p.alignment ?? "center"};margin:0 0 16px;">${icons}</div>`;
}

function renderColumns(p: ColumnsBlockProps): string {
  const count = p.columnCount ?? 2;
  const gap = p.gap ?? 16;
  const colWidth = Math.floor(100 / count);
  const cells = (p.columns || [])
    .slice(0, count)
    .map((col) => `<td style="width:${colWidth}%;padding:0 ${gap / 2}px;vertical-align:top;font-size:15px;line-height:1.6;color:#0B1F3B;">${String(col ?? "").replace(/\n/g, "<br />")}</td>`)
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;"><tr>${cells}</tr></table>`;
}

export function blocksToHtml(blocks: EmailBlock[]): string {
  if (!Array.isArray(blocks)) return "";
  return blocks.map((b) => {
    switch (b?.type) {
      case "text":    return renderText(b.props);
      case "image":   return renderImage(b.props);
      case "button":  return renderButton(b.props);
      case "divider": return renderDivider(b.props);
      case "spacer":  return renderSpacer(b.props);
      case "social":  return renderSocial(b.props);
      case "columns": return renderColumns(b.props);
      default: return "";
    }
  }).join("\n");
}

/**
 * Render blocks to plain text suitable for WhatsApp / SMS bodies.
 * Strips styling, keeps content + links.
 */
export function blocksToText(blocks: EmailBlock[]): string {
  if (!Array.isArray(blocks)) return "";
  const stripHtml = (s: string) =>
    String(s ?? "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim();
  const parts: string[] = [];
  for (const b of blocks) {
    switch (b?.type) {
      case "text": {
        const c = stripHtml(b.props?.content || "");
        if (c) parts.push(c);
        break;
      }
      case "button": {
        const label = String(b.props?.label || "").trim();
        const url = String(b.props?.url || "").trim();
        if (label && url) parts.push(`${label}: ${url}`);
        else if (url) parts.push(url);
        else if (label) parts.push(label);
        break;
      }
      case "image": {
        const url = String(b.props?.linkUrl || b.props?.src || "").trim();
        const alt = String(b.props?.alt || "").trim();
        if (url) parts.push(alt ? `${alt}: ${url}` : url);
        break;
      }
      case "columns": {
        const cols = Array.isArray(b.props?.columns) ? b.props.columns : [];
        for (const c of cols) {
          const t = stripHtml(String(c || ""));
          if (t) parts.push(t);
        }
        break;
      }
      case "divider":
      case "spacer":
      case "social":
      default:
        break;
    }
  }
  return parts.join("\n\n").trim();
}

/**
 * Detect whether a body string is a JSON array of email-editor blocks.
 * Returns the parsed array, or null if it's plain text / HTML / invalid.
 */
export function parseBlocksFromMessage(message: string): EmailBlock[] | null {
  if (!message) return null;
  const trimmed = String(message).trim();
  if (!trimmed.startsWith("[")) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.type && parsed[0]?.id) {
      return parsed as EmailBlock[];
    }
  } catch {
    // not JSON — treat as plain text/html
  }
  return null;
}

/**
 * Walk every text-bearing field in each block and run the provided
 * interpolator (e.g. for {{first_name}} merge tags) over its value.
 * Returns a new array — does not mutate the input.
 */
export function interpolateBlocks(
  blocks: EmailBlock[],
  interp: (s: string) => string,
): EmailBlock[] {
  return blocks.map((b) => {
    const props = { ...(b.props || {}) };
    switch (b.type) {
      case "text":
        if (typeof props.content === "string") props.content = interp(props.content);
        break;
      case "button":
        if (typeof props.label === "string") props.label = interp(props.label);
        if (typeof props.url === "string") props.url = interp(props.url);
        break;
      case "image":
        if (typeof props.alt === "string") props.alt = interp(props.alt);
        if (typeof props.linkUrl === "string") props.linkUrl = interp(props.linkUrl);
        if (typeof props.src === "string") props.src = interp(props.src);
        break;
      case "columns":
        if (Array.isArray(props.columns)) {
          props.columns = props.columns.map((c: string) =>
            typeof c === "string" ? interp(c) : c,
          );
        }
        break;
      case "social":
        if (props.links && typeof props.links === "object") {
          const newLinks: Record<string, string> = {};
          for (const k of Object.keys(props.links)) {
            const v = props.links[k];
            newLinks[k] = typeof v === "string" ? interp(v) : v;
          }
          props.links = newLinks;
        }
        break;
    }
    return { ...b, props };
  });
}
