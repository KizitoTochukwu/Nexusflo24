import { useState, useRef, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Eye, EyeOff, Monitor, Smartphone, LayoutTemplate,
  Bold, Italic, Underline, Strikethrough,
  List, ListOrdered, Link2, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, Minus, Type, Paintbrush,
  Undo2, Redo2, Quote, Smile
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import InsertDropdown from "./InsertDropdown";
import ButtonInsertDialog from "./ButtonInsertDialog";
import EmailTemplateSettings, { DEFAULT_TEMPLATE_SETTINGS, type TemplateSettings } from "./EmailTemplateSettings";
import { VARIABLE_OPTIONS, PREVIEW_VALUES } from "./editorConstants";
import { buildPreviewHtml } from "./emailPreviewRenderer";
import { EMAIL_PRESETS } from "./emailPresets";
import EmailBlockEditor from "./email-blocks/EmailBlockEditor";
import { parseBlocksFromMessage, blocksToHtml } from "./email-blocks/emailBlockSerializer";

const COLOR_PRESETS = [
  "#000000", "#434343", "#666666", "#999999", "#FFFFFF",
  "#FF0000", "#FF9900", "#00FF00", "#0000FF", "#9900FF", "#FF00FF",
  "#0B1F3A", "#D4AF37", "#2563EB", "#16A34A", "#DC2626", "#EA580C",
];

interface AutomationEmailEditorProps {
  isEmail: boolean;
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

function ColorPicker({ colors, onSelect, label, icon: Icon }: {
  colors: string[]; onSelect: (hex: string) => void; label: string; icon: React.ElementType;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
              <Icon className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">{label}</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-auto p-3" align="start" sideOffset={8}>
        <div className="grid grid-cols-6 gap-1.5 mb-2">
          {colors.map((hex) => (
            <button key={hex} type="button"
              className="h-5 w-5 rounded border border-border hover:scale-125 transition-transform"
              style={{ backgroundColor: hex }}
              onClick={() => { onSelect(hex); setOpen(false); }}
            />
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          Custom
          <input type="color" className="h-5 w-5 rounded border-none cursor-pointer p-0"
            onChange={(e) => { onSelect(e.target.value); setOpen(false); }} />
        </label>
      </PopoverContent>
    </Popover>
  );
}

export default function AutomationEmailEditor({
  isEmail,
  subject,
  message,
  onSubjectChange,
  onMessageChange,
  templateSettings,
  onTemplateSettingsChange
}: AutomationEmailEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [preview, setPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [buttonDialogOpen, setButtonDialogOpen] = useState(false);
  const isInternalUpdate = useRef(false);

  const currentSettings = templateSettings ?? DEFAULT_TEMPLATE_SETTINGS;

  // For email, determine the HTML to preview (blocks → HTML or legacy)
  const getEmailHtml = useCallback(() => {
    const blocks = parseBlocksFromMessage(message);
    if (blocks) return blocksToHtml(blocks);
    return message;
  }, [message]);

  // Sync value prop → editor (SMS/WhatsApp only)
  useEffect(() => {
    if (isEmail) return;
    const el = editorRef.current;
    if (!el) return;
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    if (el.innerHTML !== message) {
      el.innerHTML = message;
    }
  }, [message, isEmail]);

  const emitChange = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    isInternalUpdate.current = true;
    onMessageChange(el.innerHTML);
  }, [onMessageChange]);

  const exec = useCallback((cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    emitChange();
  }, [emitChange]);

  const insertHtml = useCallback((html: string) => {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, html);
    emitChange();
  }, [emitChange]);

  // Write preview HTML to iframe
  useEffect(() => {
    if (preview && iframeRef.current && isEmail) {
      const htmlBody = getEmailHtml();
      const html = buildPreviewHtml(htmlBody, subject, PREVIEW_VALUES, currentSettings);
      const doc = iframeRef.current.contentDocument;
      if (doc) { doc.open(); doc.write(html); doc.close(); }
    }
  }, [preview, message, subject, previewDevice, currentSettings, isEmail, getEmailHtml]);

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
            {!isEmail && <InsertDropdown onInsert={(text) => insertHtml(text)} />}
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
            <div className="p-4 min-h-[300px] bg-muted/30 border border-border rounded-lg">
              <div className="bg-background rounded-lg border border-border p-4 max-w-md mx-auto">
                <p className="text-xs text-muted-foreground mb-2 font-medium">
                  {message.length > 0 ? `${message.length} characters` : "Empty message"}
                </p>
                <div
                  className="text-sm leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: (() => {
                      let result = message;
                      for (const [key, val] of Object.entries(PREVIEW_VALUES)) {
                        result = result.split(key).join(`<span class="font-semibold">${val}</span>`);
                      }
                      result = result.replace(/\{\{(\w+)\}\}/g, '<span class="text-muted-foreground">[$1]</span>');
                      return result;
                    })()
                  }}
                />
              </div>
            </div>
          )
        ) : isEmail ? (
          /* Block editor for email */
          <EmailBlockEditor message={message} onMessageChange={onMessageChange} />
        ) : (
          /* WYSIWYG Editor for SMS/WhatsApp */
          <div className="border border-border rounded-lg bg-background overflow-hidden">
            {/* Formatting toolbar */}
            <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30">
              <ToolbarBtn icon={Undo2} label="Undo" onClick={() => exec("undo")} />
              <ToolbarBtn icon={Redo2} label="Redo" onClick={() => exec("redo")} />
              <div className="w-px h-4 bg-border mx-0.5" />
              <ToolbarBtn icon={Bold} label="Bold" onClick={() => exec("bold")} />
              <ToolbarBtn icon={Italic} label="Italic" onClick={() => exec("italic")} />
              <ToolbarBtn icon={Underline} label="Underline" onClick={() => exec("underline")} />
              <ToolbarBtn icon={Strikethrough} label="Strikethrough" onClick={() => exec("strikeThrough")} />
              <div className="w-px h-4 bg-border mx-0.5" />
              <ToolbarBtn icon={AlignLeft} label="Align left" onClick={() => exec("justifyLeft")} />
              <ToolbarBtn icon={AlignCenter} label="Align center" onClick={() => exec("justifyCenter")} />
              <ToolbarBtn icon={AlignRight} label="Align right" onClick={() => exec("justifyRight")} />
              <ToolbarBtn icon={AlignJustify} label="Justify" onClick={() => exec("justifyFull")} />
              <div className="w-px h-4 bg-border mx-0.5" />
              <ToolbarBtn icon={List} label="Bullet list" onClick={() => exec("insertUnorderedList")} />
              <ToolbarBtn icon={ListOrdered} label="Numbered list" onClick={() => exec("insertOrderedList")} />
              <ToolbarBtn icon={Quote} label="Blockquote" onClick={() => exec("formatBlock", "blockquote")} />
              <ToolbarBtn icon={Minus} label="Divider" onClick={() => exec("insertHorizontalRule")} />
              <ToolbarBtn icon={Link2} label="Insert link" onClick={() => {
                const url = prompt("Enter URL:");
                if (url) exec("createLink", url);
              }} />
              <ToolbarBtn icon={Smile} label="Emoji" onClick={() => insertHtml("😊")} />
              <div className="w-px h-4 bg-border mx-0.5" />
              <ColorPicker icon={Type} label="Text color" colors={COLOR_PRESETS}
                onSelect={(hex) => exec("foreColor", hex)} />
              <ColorPicker icon={Paintbrush} label="Highlight" colors={COLOR_PRESETS}
                onSelect={(hex) => exec("hiliteColor", hex)} />
            </div>

            {/* WYSIWYG area */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="w-full min-h-[300px] bg-transparent text-sm leading-relaxed p-4 outline-none prose prose-sm max-w-none
                [&_p]:mb-2
                [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2
                [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2
                [&_blockquote]:border-l-4 [&_blockquote]:border-accent [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground
                [&_a]:text-primary [&_a]:underline
                [&_hr]:my-3 [&_hr]:border-border"
              style={{ lineHeight: 1.7 }}
              onInput={emitChange}
              onBlur={emitChange}
              dangerouslySetInnerHTML={{ __html: message }}
              data-placeholder="Hi {{first_name}}, thanks for signing up!"
            />
          </div>
        )}

        {/* Template Settings (email only) */}
        {isEmail && onTemplateSettingsChange && (
          <EmailTemplateSettings settings={currentSettings} onChange={onTemplateSettingsChange} />
        )}

        {/* Quick-insert variable badges (SMS only) */}
        {!preview && !isEmail && (
          <div className="flex flex-wrap gap-1">
            {VARIABLE_OPTIONS.slice(0, 5).map((v) => (
              <Badge
                key={v.value}
                variant="secondary"
                className="cursor-pointer hover:bg-accent transition-colors text-[10px]"
                onClick={() => insertHtml(v.value)}
              >
                {v.value}
              </Badge>
            ))}
          </div>
        )}

        <ButtonInsertDialog
          open={buttonDialogOpen}
          onOpenChange={setButtonDialogOpen}
          onInsert={(text) => insertHtml(text)}
        />
      </div>
    </TooltipProvider>
  );
}
