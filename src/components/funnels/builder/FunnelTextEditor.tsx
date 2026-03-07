import { useState, useRef, useCallback, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, WrapText } from "lucide-react";
import InsertDropdown from "@/components/automations/email-editor/InsertDropdown";
import FormattingToolbar from "@/components/automations/email-editor/FormattingToolbar";
import VariableAutocomplete from "@/components/automations/email-editor/VariableAutocomplete";
import ButtonInsertDialog from "@/components/automations/email-editor/ButtonInsertDialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { VARIABLE_OPTIONS, FUNNEL_PREVIEW_VALUES, CONDITIONAL_TEMPLATES } from "./funnelEditorConstants";

interface FunnelTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export default function FunnelTextEditor({
  value,
  onChange,
  placeholder = "Enter text content…",
  minHeight = "200px",
}: FunnelTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
        onChange(value + text);
        return;
      }
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newValue = value.slice(0, start) + text + value.slice(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + text.length;
        el.setSelectionRange(pos, pos);
      });
    },
    [value, onChange]
  );

  const wrapSelection = useCallback(
    (before: string, after: string) => {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = value.slice(start, end) || "text";
      const newValue = value.slice(0, start) + before + selected + after + value.slice(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + before.length, start + before.length + selected.length);
      });
    },
    [value, onChange]
  );

  const insertConditional = useCallback(
    (template: typeof CONDITIONAL_TEMPLATES[number]) => {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = value.slice(start, end) || "Content shown conditionally";
      const newValue =
        value.slice(0, start) + template.value + "\n" + selected + "\n" + template.closing + value.slice(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        el.focus();
      });
    },
    [value, onChange]
  );

  const handleAutocompleteSelect = useCallback(
    (val: string) => {
      const el = textareaRef.current;
      if (!el) return;
      const before = value.slice(0, autocomplete.startPos);
      const after = value.slice(el.selectionStart);
      const newValue = before + val + after;
      onChange(newValue);
      setAutocomplete((s) => ({ ...s, active: false }));
      requestAnimationFrame(() => {
        el.focus();
        const pos = autocomplete.startPos + val.length;
        el.setSelectionRange(pos, pos);
      });
    },
    [value, onChange, autocomplete.startPos]
  );

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      onChange(val);
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
            position: { top: 28, left: 8 },
          });
          return;
        }
      }
      setAutocomplete((s) => (s.active ? { ...s, active: false } : s));
    },
    [onChange]
  );

  const renderPreview = useCallback((text: string) => {
    let result = text;
    for (const [key, val] of Object.entries(FUNNEL_PREVIEW_VALUES)) {
      result = result.split(key).join(
        `<span class="bg-accent/50 px-1 rounded font-semibold">${val}</span>`
      );
    }
    // Strip conditional blocks for preview — just show the inner content
    result = result.replace(/\{\{#if[^}]*\}\}\n?/g, "");
    result = result.replace(/\n?\{\{\/if\}\}/g, "");
    // Replace remaining variables
    result = result.replace(
      /\{\{(\w+)\}\}/g,
      '<span class="bg-muted px-1 rounded text-muted-foreground">[$1]</span>'
    );
    result = result.replace(/\n/g, "<br/>");
    return result;
  }, []);

  useEffect(() => {
    const handler = () => setAutocomplete((s) => (s.active ? { ...s, active: false } : s));
    const el = textareaRef.current;
    el?.addEventListener("blur", handler);
    return () => el?.removeEventListener("blur", handler);
  }, []);

  return (
    <div className="space-y-2 w-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          <InsertDropdown onInsert={insertAtCursor} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                <WrapText className="h-3.5 w-3.5" />
                Conditional
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {CONDITIONAL_TEMPLATES.map((t) => (
                <DropdownMenuItem key={t.label} onClick={() => insertConditional(t)}>
                  {t.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Button
          type="button"
          variant={preview ? "secondary" : "ghost"}
          size="sm"
          className="gap-1.5 h-7 text-xs"
          onClick={() => setPreview(!preview)}
        >
          {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {preview ? "Edit" : "Preview"}
        </Button>
      </div>

      {/* Editor / Preview */}
      <div className="relative border border-border rounded-lg bg-background overflow-hidden">
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
            className="p-4 text-base leading-relaxed prose prose-sm max-w-none"
            style={{ minHeight }}
            dangerouslySetInnerHTML={{ __html: renderPreview(value) }}
          />
        ) : (
          <div className="relative">
            <textarea
              ref={textareaRef}
              placeholder={placeholder}
              className="w-full bg-transparent text-sm leading-relaxed p-3 resize-y outline-none placeholder:text-muted-foreground"
              style={{ minHeight }}
              value={value}
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

      {/* Quick-insert badges */}
      <div className="flex flex-wrap gap-1">
        {VARIABLE_OPTIONS.slice(0, 4).map((v) => (
          <Badge
            key={v.value}
            variant="secondary"
            className="cursor-pointer hover:bg-accent transition-colors text-[10px]"
            onClick={() => insertAtCursor(v.value)}
          >
            {v.value}
          </Badge>
        ))}
      </div>

      <ButtonInsertDialog
        open={buttonDialogOpen}
        onOpenChange={setButtonDialogOpen}
        onInsert={insertAtCursor}
      />
    </div>
  );
}
