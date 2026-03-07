import { useState, useRef, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import InsertDropdown from "./InsertDropdown";
import FormattingToolbar from "./FormattingToolbar";
import VariableAutocomplete from "./VariableAutocomplete";
import ButtonInsertDialog from "./ButtonInsertDialog";
import { VARIABLE_OPTIONS, PREVIEW_VALUES } from "./editorConstants";

interface AutomationEmailEditorProps {
  isEmail: boolean;
  subject: string;
  message: string;
  onSubjectChange: (v: string) => void;
  onMessageChange: (v: string) => void;
}

export default function AutomationEmailEditor({
  isEmail,
  subject,
  message,
  onSubjectChange,
  onMessageChange,
}: AutomationEmailEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorWrapRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState(false);
  const [buttonDialogOpen, setButtonDialogOpen] = useState(false);
  const [autocomplete, setAutocomplete] = useState<{
    active: boolean;
    filter: string;
    startPos: number;
    position: { top: number; left: number };
  }>({ active: false, filter: "", startPos: 0, position: { top: 0, left: 0 } });

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
      // Replace from startPos (where {{ was typed) to current cursor
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
      // Check for {{ trigger
      const textBeforeCursor = val.slice(0, cursorPos);
      const lastDoubleBrace = textBeforeCursor.lastIndexOf("{{");
      if (lastDoubleBrace !== -1) {
        const textAfterBrace = textBeforeCursor.slice(lastDoubleBrace + 2);
        // No closing brace yet and no newlines
        if (!textAfterBrace.includes("}}") && !textAfterBrace.includes("\n")) {
          setAutocomplete({
            active: true,
            filter: textAfterBrace,
            startPos: lastDoubleBrace,
            position: { top: 28, left: 8 },
          });
          return;
        }
      }
      setAutocomplete((s) => (s.active ? { ...s, active: false } : s));
    },
    [onMessageChange]
  );

  const previewHtml = useCallback(
    (text: string) => {
      let result = text;
      for (const [key, val] of Object.entries(PREVIEW_VALUES)) {
        result = result.replaceAll(key, `<span class="bg-accent/50 px-1 rounded font-semibold">${val}</span>`);
      }
      // Replace remaining {{...}} with placeholder
      result = result.replace(/\{\{(\w+)\}\}/g, '<span class="bg-muted px-1 rounded text-muted-foreground">[$1]</span>');
      // Convert newlines
      result = result.replace(/\n/g, "<br/>");
      return result;
    },
    []
  );

  // Close autocomplete on blur
  useEffect(() => {
    const handler = () => setAutocomplete((s) => (s.active ? { ...s, active: false } : s));
    const el = textareaRef.current;
    el?.addEventListener("blur", handler);
    return () => el?.removeEventListener("blur", handler);
  }, []);

  return (
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
        <InsertDropdown onInsert={insertAtCursor} />
        <Button
          type="button"
          variant={preview ? "secondary" : "ghost"}
          size="sm"
          className="gap-1.5 h-8 text-xs"
          onClick={() => setPreview(!preview)}
        >
          {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {preview ? "Edit" : "Preview"}
        </Button>
      </div>

      {/* Editor area */}
      <div
        ref={editorWrapRef}
        className="relative border border-border rounded-lg bg-background overflow-hidden"
      >
        {!preview && (
          <div className="px-2 pt-2">
            <FormattingToolbar
              onWrap={wrapSelection}
              onInsert={insertAtCursor}
              onInsertButton={() => setButtonDialogOpen(true)}
            />
          </div>
        )}

        {preview ? (
          <div
            className="p-4 min-h-[300px] text-base leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: previewHtml(message) }}
          />
        ) : (
          <div className="relative">
            <textarea
              ref={textareaRef}
              placeholder={
                isEmail
                  ? "Hi {{first_name}},\n\nThanks for signing up! We're excited to have you on board.\n\nBest regards,\nYour Team"
                  : "Hi {{first_name}}, thanks for signing up!"
              }
              className="w-full min-h-[300px] bg-transparent text-base leading-relaxed p-4 resize-y outline-none placeholder:text-muted-foreground"
              value={message}
              onChange={handleInput}
            />
            {autocomplete.active && (
              <VariableAutocomplete
                filter={autocomplete.filter}
                position={autocomplete.position}
                onSelect={handleAutocompleteSelect}
              />
            )}
          </div>
        )}
      </div>

      {/* Quick-insert variable badges */}
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">Quick insert:</span>
        <div className="flex flex-wrap gap-1.5">
          {VARIABLE_OPTIONS.slice(0, 5).map((v) => (
            <Badge
              key={v.value}
              variant="secondary"
              className="cursor-pointer hover:bg-accent transition-colors text-xs"
              onClick={() => insertAtCursor(v.value)}
            >
              {v.value}
            </Badge>
          ))}
        </div>
      </div>

      {/* Button insert dialog */}
      <ButtonInsertDialog
        open={buttonDialogOpen}
        onOpenChange={setButtonDialogOpen}
        onInsert={insertAtCursor}
      />
    </div>
  );
}
