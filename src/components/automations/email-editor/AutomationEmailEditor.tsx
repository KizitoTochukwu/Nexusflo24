import { useState, useRef, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Eye, EyeOff, Monitor, Smartphone, LayoutTemplate,
  Bold, Italic, Strikethrough, Code, Link2, Smile, Send, Loader2,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import InsertDropdown from "./InsertDropdown";
import EmailTemplateSettings, { DEFAULT_TEMPLATE_SETTINGS, type TemplateSettings } from "./EmailTemplateSettings";
import { VARIABLE_OPTIONS, PREVIEW_VALUES } from "./editorConstants";
import { buildPreviewHtml } from "./emailPreviewRenderer";
import { EMAIL_PRESETS } from "./emailPresets";
import EmailBlockEditor from "./email-blocks/EmailBlockEditor";
import { parseBlocksFromMessage, blocksToHtml } from "./email-blocks/emailBlockSerializer";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { interpolateText, previewVars } from "@/lib/messaging/interpolate";
import { toast } from "sonner";

interface AutomationEmailEditorProps {
  isEmail: boolean;
  /** Optional explicit channel — defaults to "email" when isEmail, else "sms". */
  channel?: "email" | "sms" | "whatsapp";
  subject: string;
  message: string;
  onSubjectChange: (v: string) => void;
  onMessageChange: (v: string) => void;
  templateSettings?: TemplateSettings;
  onTemplateSettingsChange?: (settings: TemplateSettings) => void;
}

function ToolbarBtn({ icon: Icon, label, onClick }: {
  icon: React.ElementType; label: string; onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onClick}>
          <Icon className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Strip HTML tags and decode common entities — used once on mount to migrate
 * legacy SMS/WhatsApp messages that were saved as contentEditable innerHTML
 * back into plain text. This keeps existing automations editable without
 * losing their content, and ensures the next save persists clean plain text.
 */
function legacyHtmlToPlain(input: string): string {
  if (!input) return "";
  if (!/[<&]/.test(input)) return input;
  let s = input
    .replace(/<a\b[^>]*?href\s*=\s*(["'])([\s\S]*?)\1[^>]*>([\s\S]*?)<\/a\s*>/gi,
      (_m, _q, href, label) => {
        const text = String(label).replace(/<\/?[^>]+>/g, "").trim();
        const url = String(href).trim();
        return !text || text === url ? url : `${text} (${url})`;
      })
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/\s*(div|p|li|h[1-6]|tr|blockquote)\s*>/gi, "\n")
    .replace(/<\s*li\b[^>]*>/gi, "\n• ")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  return s.replace(/\n{3,}/g, "\n\n").trim();
}

/** Render WhatsApp-style markdown for the in-editor preview. */
function renderWhatsAppPreview(text: string): string {
  // Escape HTML first so user input can't inject markup.
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  let html = escaped
    .replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>")
    .replace(/_([^_\n]+)_/g, "<em>$1</em>")
    .replace(/~([^~\n]+)~/g, "<s>$1</s>")
    .replace(/```([^`]+)```/g, '<code class="font-mono bg-muted px-1 rounded">$1</code>')
    .replace(/`([^`\n]+)`/g, '<code class="font-mono bg-muted px-1 rounded">$1</code>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a class="text-primary underline">$1</a>')
    .replace(/\n/g, "<br />");

  // Substitute variable previews.
  for (const [key, val] of Object.entries(PREVIEW_VALUES)) {
    html = html.split(key).join(`<span class="font-semibold">${val}</span>`);
  }
  // Unknown {{variables}} get a muted placeholder.
  html = html.replace(/\{\{(\w+)\}\}/g, '<span class="text-muted-foreground">[$1]</span>');

  return html;
}

export default function AutomationEmailEditor({
  isEmail,
  channel,
  subject,
  message,
  onSubjectChange,
  onMessageChange,
  templateSettings,
  onTemplateSettingsChange,
}: AutomationEmailEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const { user } = useAuth();
  const workspaceId = useWorkspaceId();
  const resolvedChannel: "email" | "sms" | "whatsapp" = channel ?? (isEmail ? "email" : "sms");
  const [testRecipient, setTestRecipient] = useState<string>("");
  const [testSending, setTestSending] = useState(false);
  const [testOpen, setTestOpen] = useState(false);

  // Pre-fill test recipient with the logged-in user's email when the popover
  // opens for an email step. SMS/WhatsApp default to empty so the user pastes
  // their own E.164 number.
  useEffect(() => {
    if (testOpen && resolvedChannel === "email" && !testRecipient && user?.email) {
      setTestRecipient(user.email);
    }
  }, [testOpen, testRecipient, user?.email, resolvedChannel]);

  const sendTest = useCallback(async () => {
    if (!message?.trim()) {
      toast.error("Add a message before sending a test.");
      return;
    }
    if (resolvedChannel === "email" && !subject?.trim()) {
      toast.error("Add a subject before sending a test email.");
      return;
    }
    if (!workspaceId) {
      toast.error("Workspace not ready — try again in a moment.");
      return;
    }

    if (resolvedChannel === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testRecipient)) {
        toast.error("Enter a valid email address.");
        return;
      }
    } else {
      const cleaned = testRecipient.replace(/[\s\-()]/g, "");
      if (!/^\+?\d{8,15}$/.test(cleaned)) {
        toast.error("Enter a valid phone number in international format (e.g. +447517327597).");
        return;
      }
    }

    setTestSending(true);
    try {
      // Test sends use sample values for {{first_name}}, {{email}}, etc.
      // so the recipient sees rendered values, not literal placeholders.
      const sample = previewVars(user?.email ? { email: user.email } : {});
      const renderedSubject = interpolateText(subject, sample);
      const renderedMessage = interpolateText(message, sample);

      // Unwraps Supabase FunctionsHttpError so we can show the backend's real
      // error body instead of a generic "Edge Function returned a non-2xx…".
      const readInvokeError = async (err: unknown): Promise<string> => {
        if (err instanceof FunctionsHttpError) {
          try {
            const raw = await err.context.text();
            try {
              const body = JSON.parse(raw);
              return String(body?.error || body?.message || raw || err.message);
            } catch {
              return raw || err.message;
            }
          } catch {
            return err.message;
          }
        }
        return String((err as any)?.message || err || "Unknown error");
      };

      if (resolvedChannel === "email") {
        const { error } = await supabase.functions.invoke("email-send", {
          body: {
            workspaceId,
            to: testRecipient,
            subject: renderedSubject,
            html: renderedMessage,
            templateSettings: { ...(templateSettings ?? {}), preview: true },
          },
        });
        if (error) throw new Error(await readInvokeError(error));
      } else if (resolvedChannel === "sms") {
        const { data, error } = await supabase.functions.invoke("sms-send", {
          body: { workspaceId, to: testRecipient, message: renderedMessage, preview: true },
        });
        if (error) throw new Error(await readInvokeError(error));
        if (data && (data as any).success === false) throw new Error((data as any).error || "SMS test failed");
      } else {
        const { data, error } = await supabase.functions.invoke("whatsapp-send", {
          body: { workspaceId, to: testRecipient, body: renderedMessage, preview: true },
        });
        if (error) throw new Error(await readInvokeError(error));
        if (data && (data as any).success === false) {
          const reason = (data as any).reason;
          if (reason === "template_unavailable") {
            throw new Error("WhatsApp template no longer exists on Meta. Sync templates in Settings → Channels → WhatsApp and pick a new default.");
          }
          if (reason === "window_closed") {
            throw new Error((data as any).error || "WhatsApp 24h window closed — recipient must message you first, or send an approved template.");
          }
          throw new Error((data as any).error || "WhatsApp test failed");
        }
        if ((data as any)?.testMode === "hello_world") {
          toast.success("Test sent via Meta's hello_world template (credentials verified). Your real message content will send in live automations.");
          setTestOpen(false);
          return;
        }
      }

      const channelLabel = resolvedChannel === "email" ? "email" : resolvedChannel === "sms" ? "SMS" : "WhatsApp message";
      toast.success(`Test ${channelLabel} sent to ${testRecipient}.`);
      setTestOpen(false);
    } catch (e: any) {
      const raw = String(e?.message || "");
      const friendly = /template no longer exists/i.test(raw)
        ? raw
        : /132001/.test(raw)
          ? "WhatsApp template language mismatch — we tried alternate tags automatically. Please re-sync templates in Settings → Channels → WhatsApp."
          : raw || `Failed to send test ${resolvedChannel}.`;
      toast.error(friendly);
    } finally {
      setTestSending(false);
    }
  }, [resolvedChannel, subject, message, testRecipient, workspaceId, templateSettings, user?.email]);

  const currentSettings = templateSettings ?? DEFAULT_TEMPLATE_SETTINGS;

  // For email, determine the HTML to preview (blocks → HTML or legacy)
  const getEmailHtml = useCallback(() => {
    const blocks = parseBlocksFromMessage(message);
    if (blocks) return blocksToHtml(blocks);
    return message;
  }, [message]);

  // One-time migration: if a legacy SMS/WhatsApp step was saved as HTML
  // (from the old contentEditable editor), convert it back to plain text the
  // first time we see HTML content so the user can edit it cleanly and the
  // next save persists the plain version. We watch `message` because the
  // parent often hydrates it asynchronously after mount — gating only on
  // mount would miss the real value.
  const didMigrateRef = useRef(false);
  useEffect(() => {
    if (isEmail || didMigrateRef.current) return;
    if (!message) return; // wait for the parent to hydrate the value
    if (!/<\/?[a-zA-Z][^>]*>/.test(message) && !/&[a-z#0-9]+;/i.test(message)) {
      // No HTML markup or entities — already plain text. Mark done.
      didMigrateRef.current = true;
      return;
    }
    const plain = legacyHtmlToPlain(message);
    didMigrateRef.current = true;
    if (plain && plain !== message) onMessageChange(plain);
  }, [isEmail, message, onMessageChange]);

  // Insert text at the current cursor position in the textarea.
  const insertAtCursor = useCallback((text: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      onMessageChange((message || "") + text);
      return;
    }
    const start = ta.selectionStart ?? message.length;
    const end = ta.selectionEnd ?? message.length;
    const next = message.slice(0, start) + text + message.slice(end);
    onMessageChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + text.length;
      ta.setSelectionRange(pos, pos);
    });
  }, [message, onMessageChange]);

  // Wrap the current selection with markers (or insert markers if no
  // selection). Used for WhatsApp-style *bold*, _italic_, ~strike~, `code`.
  const wrapSelection = useCallback((open: string, close: string = open, placeholder = "text") => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const sel = message.slice(start, end) || placeholder;
    const next = message.slice(0, start) + open + sel + close + message.slice(end);
    onMessageChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const selStart = start + open.length;
      ta.setSelectionRange(selStart, selStart + sel.length);
    });
  }, [message, onMessageChange]);

  const insertLink = useCallback(() => {
    const url = prompt("Enter URL (https://...):");
    if (!url) return;
    insertAtCursor(url);
  }, [insertAtCursor]);

  // Write preview HTML to iframe (email only)
  useEffect(() => {
    if (preview && iframeRef.current && isEmail) {
      const htmlBody = getEmailHtml();
      const html = buildPreviewHtml(htmlBody, subject, PREVIEW_VALUES, currentSettings);
      const doc = iframeRef.current.contentDocument;
      if (doc) { doc.open(); doc.write(html); doc.close(); }
    }
  }, [preview, message, subject, previewDevice, currentSettings, isEmail, getEmailHtml]);

  const charCount = message.length;
  const smsSegments = Math.max(1, Math.ceil(charCount / 160));

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-3 w-full">
        {/* Subject */}
        {isEmail && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Subject Line</label>
            <Input
              placeholder="Email subject line"
              className="w-full bg-background"
              value={subject}
              onChange={(e) => onSubjectChange(e.target.value)}
            />
          </div>
        )}

        {/* Toolbar row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            {!isEmail && <InsertDropdown onInsert={(text) => insertAtCursor(text)} />}
            {isEmail && !preview && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                    <LayoutTemplate className="h-3.5 w-3.5" />
                    Presets
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  {EMAIL_PRESETS.map((preset) => (
                    <DropdownMenuItem
                      key={preset.id}
                      onClick={() => { onSubjectChange(preset.subject); onMessageChange(preset.body); }}
                      className="flex flex-col items-start gap-0.5 py-2"
                    >
                      <span className="font-medium text-sm">{preset.emoji} {preset.label}</span>
                      <span className="text-xs text-muted-foreground">{preset.description}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <div className="flex items-center gap-1">
            {preview && isEmail && (
              <div className="flex items-center border border-border rounded-md mr-1">
                <Button type="button" variant={previewDevice === "desktop" ? "secondary" : "ghost"} size="sm" className="h-7 w-7 p-0 rounded-r-none" onClick={() => setPreviewDevice("desktop")}>
                  <Monitor className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant={previewDevice === "mobile" ? "secondary" : "ghost"} size="sm" className="h-7 w-7 p-0 rounded-l-none" onClick={() => setPreviewDevice("mobile")}>
                  <Smartphone className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            <Popover open={testOpen} onOpenChange={setTestOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8 text-xs"
                  disabled={
                    !message?.trim() ||
                    (resolvedChannel === "email" && !subject?.trim())
                  }
                >
                  <Send className="h-3.5 w-3.5" />
                  Send test
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-3 space-y-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {resolvedChannel === "email" && "Send a test email"}
                    {resolvedChannel === "sms" && "Send a test SMS"}
                    {resolvedChannel === "whatsapp" && "Send a test WhatsApp"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {resolvedChannel === "email"
                      ? "We'll send the current draft to this address using the same provider as live automations. No credits used. Subject is prefixed with [TEST]."
                      : resolvedChannel === "sms"
                        ? "We'll send the current draft via Twilio to this number. No credits used. Body is prefixed with [TEST]."
                        : "We'll send the current draft via the WhatsApp Cloud API to this number. No credits used. Body is prefixed with [TEST]. If the 24h conversation window is closed, Meta will deliver it as the hello_world template."}
                  </p>
                </div>
                <Input
                  type={resolvedChannel === "email" ? "email" : "tel"}
                  placeholder={resolvedChannel === "email" ? "you@example.com" : "+447517327597"}
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  disabled={testSending}
                  className="h-8 text-sm"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={() => setTestOpen(false)}
                    disabled={testSending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={sendTest}
                    disabled={testSending}
                  >
                    {testSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {testSending ? "Sending…" : "Send test"}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              variant={preview ? "default" : "ghost"}
              size="sm"
              className="gap-1.5 h-8 text-xs"
              onClick={() => setPreview(!preview)}
            >
              {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {preview ? "Edit" : "Preview"}
            </Button>
          </div>
        </div>

        {/* Editor area */}
        {preview ? (
          isEmail ? (
            <div className="flex justify-center bg-muted/30 p-4 border border-border rounded-lg">
              <div
                className="transition-all duration-300 overflow-hidden rounded-lg border border-border shadow-sm"
                style={{ width: previewDevice === "mobile" ? "375px" : "100%", maxWidth: "100%" }}
              >
                <iframe
                  ref={iframeRef}
                  title="Email Preview"
                  className="w-full border-0"
                  style={{ minHeight: "480px", height: "auto" }}
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          ) : (
            // WhatsApp / SMS plain-text preview rendered with WhatsApp-style
            // formatting so users see *bold*, _italic_, ~strike~, links, etc.
            <div className="p-4 min-h-[300px] bg-muted/30 border border-border rounded-lg">
              <div className="bg-background rounded-lg border border-border p-4 max-w-md mx-auto">
                <p className="text-xs text-muted-foreground mb-2 font-medium">
                  {charCount > 0 ? `${charCount} characters` : "Empty message"}
                </p>
                <div
                  className="text-sm leading-relaxed whitespace-pre-wrap break-words"
                  dangerouslySetInnerHTML={{ __html: renderWhatsAppPreview(message) }}
                />
              </div>
            </div>
          )
        ) : isEmail ? (
          /* Block editor for email */
          <EmailBlockEditor message={message} onMessageChange={onMessageChange} />
        ) : (
          /* Plain-text editor for SMS/WhatsApp — WhatsApp & SMS render
             literal text only, so we must store plain text (no HTML). */
          <div className="border border-border rounded-lg bg-background overflow-hidden">
            {/* Lightweight WhatsApp-formatting toolbar */}
            <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30">
              <ToolbarBtn icon={Bold} label="Bold (*text*)" onClick={() => wrapSelection("*", "*", "bold")} />
              <ToolbarBtn icon={Italic} label="Italic (_text_)" onClick={() => wrapSelection("_", "_", "italic")} />
              <ToolbarBtn icon={Strikethrough} label="Strikethrough (~text~)" onClick={() => wrapSelection("~", "~", "strike")} />
              <ToolbarBtn icon={Code} label="Monospace (`text`)" onClick={() => wrapSelection("`", "`", "code")} />
              <div className="w-px h-4 bg-border mx-0.5" />
              <ToolbarBtn icon={Link2} label="Insert link" onClick={insertLink} />
              <ToolbarBtn icon={Smile} label="Emoji" onClick={() => insertAtCursor("😊")} />
              <div className="ml-auto text-[10px] text-muted-foreground pr-1">
                {resolvedChannel === "sms"
                  ? `${charCount} chars · ${smsSegments} SMS segment${smsSegments === 1 ? "" : "s"}`
                  : `${charCount} character${charCount === 1 ? "" : "s"}`}
              </div>
            </div>

            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              placeholder="Hi {{first_name}}, thanks for signing up!"
              className="min-h-[260px] border-0 rounded-none resize-y focus-visible:ring-0 focus-visible:ring-offset-0 text-sm leading-relaxed"
            />

          </div>
        )}

        {/* Template Settings (email only) */}
        {isEmail && onTemplateSettingsChange && (
          <EmailTemplateSettings settings={currentSettings} onChange={onTemplateSettingsChange} />
        )}
      </div>
    </TooltipProvider>
  );
}
