import { useState, useRef, useCallback, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Eye, EyeOff, WrapText, Bold, Italic, Underline,
  List, ListOrdered, Link2, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, Minus, Type, Paintbrush,
  Undo2, Redo2, Quote, Strikethrough
} from "lucide-react";
import InsertDropdown from "@/components/automations/email-editor/InsertDropdown";
import ButtonInsertDialog from "@/components/automations/email-editor/ButtonInsertDialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { VARIABLE_OPTIONS, FUNNEL_PREVIEW_VALUES, CONDITIONAL_TEMPLATES } from "./funnelEditorConstants";

const COLOR_PRESETS = [
  "#000000", "#434343", "#666666", "#999999", "#FFFFFF",
  "#FF0000", "#FF9900", "#00FF00", "#0000FF", "#9900FF", "#FF00FF",
  "#0B1F3A", "#D4AF37", "#2563EB", "#16A34A", "#DC2626", "#EA580C",
];

interface FunnelTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
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
      <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
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
        <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
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

export default function FunnelTextEditor({
  value,
  onChange,
  placeholder = "Enter text content…",
  minHeight = "200px",
}: FunnelTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState(false);
  const [buttonDialogOpen, setButtonDialogOpen] = useState(false);
  const isInternalUpdate = useRef(false);

  // Sync value prop → editor
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    if (el.innerHTML !== value) {
      el.innerHTML = value;
    }
  }, [value]);

  const emitChange = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    isInternalUpdate.current = true;
    onChange(el.innerHTML);
  }, [onChange]);

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

  const insertConditional = useCallback(
    (template: typeof CONDITIONAL_TEMPLATES[number]) => {
      insertHtml(`<p>${template.value}</p><p>Content shown conditionally</p><p>${template.closing}</p>`);
    },
    [insertHtml]
  );

  const renderPreview = useCallback((text: string) => {
    let result = text;
    for (const [key, val] of Object.entries(FUNNEL_PREVIEW_VALUES)) {
      result = result.split(key).join(
        `<span class="bg-accent/50 px-1 rounded font-semibold">${val}</span>`
      );
    }
    result = result.replace(/\{\{#if[^}]*\}\}/g, "");
    result = result.replace(/\{\{\/if\}\}/g, "");
    result = result.replace(
      /\{\{(\w+)\}\}/g,
      '<span class="bg-muted px-1 rounded text-muted-foreground">[$1]</span>'
    );
    return result;
  }, []);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-2 w-full">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1 flex-wrap">
            <InsertDropdown onInsert={(text) => insertHtml(text)} />
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
              <ToolbarBtn icon={Minus} label="Horizontal rule" onClick={() => exec("insertHorizontalRule")} />
              <ToolbarBtn icon={Link2} label="Insert link" onClick={() => {
                const url = prompt("Enter URL:");
                if (url) exec("createLink", url);
              }} />
              <div className="w-px h-4 bg-border mx-0.5" />
              <ColorPicker icon={Type} label="Text color" colors={COLOR_PRESETS}
                onSelect={(hex) => exec("foreColor", hex)} />
              <ColorPicker icon={Paintbrush} label="Highlight" colors={COLOR_PRESETS}
                onSelect={(hex) => exec("hiliteColor", hex)} />
            </div>
          )}

          {preview ? (
            <div
              className="p-4 text-base leading-relaxed prose prose-sm max-w-none"
              style={{ minHeight }}
              dangerouslySetInnerHTML={{ __html: renderPreview(value) }}
            />
          ) : (
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="w-full bg-transparent text-sm leading-relaxed p-4 outline-none prose prose-sm max-w-none
                [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3
                [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2
                [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2
                [&_p]:mb-2
                [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2
                [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2
                [&_blockquote]:border-l-4 [&_blockquote]:border-accent [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground
                [&_a]:text-primary [&_a]:underline
                [&_hr]:my-4 [&_hr]:border-border
                placeholder:text-muted-foreground"
              style={{ minHeight }}
              onInput={emitChange}
              onBlur={emitChange}
              dangerouslySetInnerHTML={{ __html: value }}
              data-placeholder={placeholder}
            />
          )}
        </div>

        {/* Quick-insert badges */}
        <div className="flex flex-wrap gap-1">
          {VARIABLE_OPTIONS.slice(0, 4).map((v) => (
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

        <ButtonInsertDialog
          open={buttonDialogOpen}
          onOpenChange={setButtonDialogOpen}
          onInsert={(text) => insertHtml(text)}
        />
      </div>
    </TooltipProvider>
  );
}
