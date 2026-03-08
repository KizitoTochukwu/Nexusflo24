import { useState, useRef, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Monitor, Smartphone, LayoutTemplate } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import InsertDropdown from "./InsertDropdown";
import FormattingToolbar from "./FormattingToolbar";
import VariableAutocomplete from "./VariableAutocomplete";
import ButtonInsertDialog from "./ButtonInsertDialog";
import EmailTemplateSettings, { DEFAULT_TEMPLATE_SETTINGS, type TemplateSettings } from "./EmailTemplateSettings";
import { VARIABLE_OPTIONS, PREVIEW_VALUES } from "./editorConstants";
import { buildPreviewHtml } from "./emailPreviewRenderer";
import { EMAIL_PRESETS } from "./emailPresets";

interface AutomationEmailEditorProps {
  isEmail: boolean;
  subject: string;
  message: string;
  onSubjectChange: (v: string) => void;
  onMessageChange: (v: string) => void;
  templateSettings?: TemplateSettings;
  onTemplateSettingsChange?: (settings: TemplateSettings) => void;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorWrapRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [preview, setPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [buttonDialogOpen, setButtonDialogOpen] = useState(false);
  const [autocomplete, setAutocomplete] = useState<{
    active: boolean;
    filter: string;
    startPos: number;
    position: {top: number;left: number;};
  }>({ active: false, filter: "", startPos: 0, position: { top: 0, left: 0 } });

  const currentSettings = templateSettings ?? DEFAULT_TEMPLATE_SETTINGS;

  const insertAtCursor = useCallback(
    (text: string) => {
      const el = textareaRef.current;
      if (!el) {
        onMessageChange(message + text);
        return;
      }
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newValue = message.slice(0, start) + text + message.slice(end);
      onMessageChange(newValue);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + text.length;
        el.setSelectionRange(pos, pos);
      });
    },
    [message, onMessageChange]
  );

  const wrapSelection = useCallback(
    (before: string, after: string) => {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = message.slice(start, end) || "text";
      const newValue = message.slice(0, start) + before + selected + after + message.slice(end);
      onMessageChange(newValue);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + before.length, start + before.length + selected.length);
      });
    },
    [message, onMessageChange]
  );

  const handleAutocompleteSelect = useCallback(
    (value: string) => {
      const el = textareaRef.current;
      if (!el) return;
      const before = message.slice(0, autocomplete.startPos);
      const after = message.slice(el.selectionStart);
      const newValue = before + value + after;
      onMessageChange(newValue);
      setAutocomplete((s) => ({ ...s, active: false }));
      requestAnimationFrame(() => {
        el.focus();
        const pos = autocomplete.startPos + value.length;
        el.setSelectionRange(pos, pos);
      });
    },
    [message, onMessageChange, autocomplete.startPos]
  );

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      onMessageChange(val);

      const cursorPos = e.target.selectionStart;
      const textBeforeCursor = val.slice(0, cursorPos);
      const lastDoubleBrace = textBeforeCursor.lastIndexOf("{{");
      if (lastDoubleBrace !== -1) {
        const textAfterBrace = textBeforeCursor.slice(lastDoubleBrace + 2);
        if (!textAfterBrace.includes("}}") && !textAfterBrace.includes("\n")) {
          setAutocomplete({
            active: true,
            filter: textAfterBrace,
            startPos: lastDoubleBrace,
            position: { top: 28, left: 8 }
          });
          return;
        }
      }
      setAutocomplete((s) => s.active ? { ...s, active: false } : s);
    },
    [onMessageChange]
  );

  // Write preview HTML to iframe when preview is active
  useEffect(() => {
    if (preview && iframeRef.current) {
      const html = buildPreviewHtml(message, subject, PREVIEW_VALUES, currentSettings);
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      }
    }
  }, [preview, message, subject, previewDevice, currentSettings]);

  // Close autocomplete on blur
  useEffect(() => {
    const handler = () => setAutocomplete((s) => s.active ? { ...s, active: false } : s);
    const el = textareaRef.current;
    el?.addEventListener("blur", handler);
    return () => el?.removeEventListener("blur", handler);
  }, []);

  return (
    <div className="space-y-3 w-full">
      {/* Subject */}
      {isEmail &&
      <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Subject Line</label>
          <Input
          placeholder="Email subject line"
          className="w-full bg-background"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)} />
        
        </div>
      }

      {/* Toolbar row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <InsertDropdown onInsert={insertAtCursor} />
          {isEmail &&
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <LayoutTemplate className="h-3.5 w-3.5" />
                  Presets
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {EMAIL_PRESETS.map((preset) =>
              <DropdownMenuItem
                key={preset.id}
                onClick={() => {
                  onSubjectChange(preset.subject);
                  onMessageChange(preset.body);
                }}
                className="flex flex-col items-start gap-0.5 py-2">
                
                    <span className="font-medium text-sm">
                      {preset.emoji} {preset.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {preset.description}
                    </span>
                  </DropdownMenuItem>
              )}
              </DropdownMenuContent>
            </DropdownMenu>
          }
        </div>
        <div className="flex items-center gap-1">
          {preview && isEmail &&
          <div className="flex items-center border border-border rounded-md mr-1">
              <Button
              type="button"
              variant={previewDevice === "desktop" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0 rounded-r-none"
              onClick={() => setPreviewDevice("desktop")}>
              
                <Monitor className="h-3.5 w-3.5" />
              </Button>
              <Button
              type="button"
              variant={previewDevice === "mobile" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0 rounded-l-none"
              onClick={() => setPreviewDevice("mobile")}>
              
                <Smartphone className="h-3.5 w-3.5" />
              </Button>
            </div>
          }
          <Button
            type="button"
            variant={preview ? "default" : "ghost"}
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={() => setPreview(!preview)}>
            
            {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {preview ? "Edit" : "Preview"}
          </Button>
        </div>
      </div>

      {/* Editor area */}
      <div
        ref={editorWrapRef}
        className="relative border border-border rounded-lg bg-background overflow-hidden">
        
        {!preview &&
        <div className="px-2 pt-2">
            <FormattingToolbar
            onWrap={wrapSelection}
            onInsert={insertAtCursor}
            onInsertButton={() => setButtonDialogOpen(true)} />
          
          </div>
        }

        {preview ?
        isEmail ?
        <div className="flex justify-center bg-muted/30 p-4">
              <div
            className="transition-all duration-300 overflow-hidden rounded-lg border border-border shadow-sm"
            style={{
              width: previewDevice === "mobile" ? "375px" : "100%",
              maxWidth: "100%"
            }}>
            
                <iframe
              ref={iframeRef}
              title="Email Preview"
              className="w-full border-0"
              style={{ minHeight: "480px", height: "auto" }}
              sandbox="allow-same-origin" />
            
              </div>
            </div> :

        <div className="p-4 min-h-[300px] bg-muted/30">
              <div className="bg-background rounded-lg border border-border p-4 max-w-md mx-auto">
                <p className="text-xs text-muted-foreground mb-2 font-medium">
                  {message.length > 0 ? `${message.length} characters` : "Empty message"}
                </p>
                <div
              className="text-sm leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: (() => {
                  let result = message;
                  for (const [key, val] of Object.entries(PREVIEW_VALUES)) {
                    result = result.split(key).join(`<span class="font-semibold">${val}</span>`);
                  }
                  result = result.replace(/\{\{(\w+)\}\}/g, '<span class="text-muted-foreground">[$1]</span>');
                  result = result.replace(/\n/g, "<br/>");
                  return result;
                })()
              }} />
            
              </div>
            </div> :


        <div className="relative">
            <textarea
            ref={textareaRef}
            placeholder={
            isEmail ?
            "Hi {{first_name}},\n\nThanks for signing up! We're excited to have you on board.\n\n• Benefit one\n• Benefit two\n• Benefit three\n\nBest regards,\nYour Team" :
            "Hi {{first_name}}, thanks for signing up!"
            }
            className="w-full min-h-[300px] bg-transparent text-base leading-relaxed p-4 resize-y outline-none placeholder:text-muted-foreground font-mono text-sm"
            value={message}
            onChange={handleInput} />
          
            {autocomplete.active &&
          <VariableAutocomplete
            filter={autocomplete.filter}
            position={autocomplete.position}
            onSelect={handleAutocompleteSelect} />

          }
          </div>
        }
      </div>

      {/* Formatting tips (only in edit mode for email) */}
      {!preview && isEmail &&
      <div className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2 space-y-0.5">
          <p className="font-medium text-foreground/70">Formatting tips:</p>
          <p><code className="bg-muted px-1 rounded">• item</code> for bullet lists · <code className="bg-muted px-1 rounded">1. item</code> for numbered lists · <code className="bg-muted px-1 rounded">---</code> for dividers · <code className="bg-muted px-1 rounded"># Heading</code> for headings</p>
        </div>
      }

      {/* Template Settings (email only) */}
      {isEmail && onTemplateSettingsChange &&
      <EmailTemplateSettings
        settings={currentSettings}
        onChange={onTemplateSettingsChange} />

      }

      {/* Quick-insert variable badges */}
      {!preview















      }

      {/* Button insert dialog */}
      <ButtonInsertDialog
        open={buttonDialogOpen}
        onOpenChange={setButtonDialogOpen}
        onInsert={insertAtCursor} />
      
    </div>);

}