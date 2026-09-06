import { useMemo } from "react";
import DOMPurify from "dompurify";
import { blocksToHtml, parseBlocksFromMessage } from "@/components/automations/email-editor/email-blocks/emailBlockSerializer";
import { interpolateText, previewVars } from "@/lib/messaging/interpolate";

export type PreviewRecipient = {
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
} | null;

type Props = {
  content: unknown;
  recipient?: PreviewRecipient;
  channel?: string;
  className?: string;
};

const SANITIZE_OPTIONS = {
  ALLOWED_TAGS: [
    "a", "b", "blockquote", "br", "div", "em", "h1", "h2", "h3", "h4", "h5", "h6",
    "hr", "i", "img", "li", "ol", "p", "span", "strong", "table", "tbody", "td",
    "tr", "u", "ul",
  ],
  ALLOWED_ATTR: ["href", "src", "alt", "style", "target", "width", "role", "colspan"],
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|data:image\/(?:png|jpe?g|gif|webp);base64,)/i,
};

function looksLikeHtml(s: string): boolean {
  return /<\/?(?:a|b|br|div|em|h[1-6]|hr|img|li|ol|p|span|strong|table|u|ul)\b[^>]*>/i.test(s);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Extract the raw body string from whatever shape the campaign stores. */
export function extractBody(content: unknown): { subject?: string; body: string } {
  if (content == null) return { body: "" };
  if (typeof content === "string") return { body: content };
  if (typeof content === "object") {
    const c = content as Record<string, unknown>;
    const body = c.body ?? c.message ?? c.text ?? "";
    return {
      subject: typeof c.subject === "string" ? c.subject : undefined,
      body: typeof body === "string" ? body : JSON.stringify(body),
    };
  }
  return { body: String(content) };
}

function buildVars(recipient: PreviewRecipient): Record<string, string> | null {
  if (!recipient) return null;
  const first = recipient.first_name || (recipient.name || "").split(" ")[0] || "";
  const last = recipient.last_name || (recipient.name || "").split(" ").slice(1).join(" ") || "";
  const full = recipient.name || [first, last].filter(Boolean).join(" ");
  const overrides: Record<string, string> = {};
  if (first) overrides.first_name = first;
  if (last) overrides.last_name = last;
  if (full) { overrides.full_name = full; overrides.name = full; }
  if (recipient.email) overrides.email = recipient.email;
  if (recipient.phone) overrides.phone = recipient.phone;
  if (recipient.company) overrides.company = recipient.company;
  return previewVars(overrides);
}

/**
 * Renders a stored campaign message body safely:
 * editor block JSON → formatted blocks, HTML → sanitised HTML,
 * plain text → line-break preserved text. Never shows raw JSON.
 */
export function renderMessageHtml(
  content: unknown,
  recipient?: PreviewRecipient,
): { html: string | null; plain: string | null; failed: boolean } {
  const { body } = extractBody(content);
  const raw = String(body ?? "").trim();
  if (!raw) return { html: null, plain: null, failed: false };

  const vars = buildVars(recipient ?? null);
  const interp = (s: string) => (vars ? interpolateText(s, vars) : s);

  // 1. Editor block JSON
  if (raw.startsWith("[") || raw.startsWith("{")) {
    try {
      const blocks = parseBlocksFromMessage(raw);
      if (blocks) {
        const html = blocksToHtml(blocks);
        return { html: DOMPurify.sanitize(interp(html), SANITIZE_OPTIONS), plain: null, failed: false };
      }
      // Valid JSON but not blocks we understand
      JSON.parse(raw);
      return { html: null, plain: null, failed: true };
    } catch {
      return { html: null, plain: null, failed: true };
    }
  }

  // 2. HTML
  if (looksLikeHtml(raw)) {
    return { html: DOMPurify.sanitize(interp(raw), SANITIZE_OPTIONS), plain: null, failed: false };
  }

  // 3. Plain text — preserve line breaks
  const text = interp(raw).replace(/\\n/g, "\n");
  const html = escapeHtml(text).replace(/\n/g, "<br />");
  return { html: DOMPurify.sanitize(html, SANITIZE_OPTIONS), plain: text, failed: false };
}

export default function MessageContentPreview({ content, recipient, channel, className }: Props) {
  const { subject } = useMemo(() => extractBody(content), [content]);
  const result = useMemo(() => renderMessageHtml(content, recipient), [content, recipient]);

  return (
    <div className={className}>
      {subject && channel !== "sms" && channel !== "whatsapp" && (
        <p className="mb-2 break-words text-sm font-medium text-foreground [overflow-wrap:anywhere]">{subject}</p>
      )}
      {result.failed ? (
        <p className="text-sm text-muted-foreground">Message preview unavailable</p>
      ) : result.html ? (
        <div
          className="prose-preview max-w-full text-sm text-foreground [overflow-wrap:anywhere] [word-break:break-word] [&_a]:text-primary [&_a]:underline [&_img]:h-auto [&_img]:max-w-full [&_table]:w-full [&_table]:table-fixed"
          dangerouslySetInnerHTML={{ __html: result.html }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">No content</p>
      )}
    </div>
  );
}
