import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Link2, Image, Minus, Code,
  Type, Paintbrush, Undo2, Redo2, Table, Quote,
  Subscript, Superscript, RemoveFormatting
} from "lucide-react";

const FONT_FAMILIES = [
  "Arial", "Georgia", "Times New Roman", "Courier New",
  "Verdana", "Trebuchet MS", "Impact", "Comic Sans MS",
];

const FONT_SIZES = [
  "8", "9", "10", "11", "12", "14", "16", "18",
  "20", "24", "28", "32", "36", "48", "72",
];

const HEADING_STYLES = [
  { label: "Normal text", tag: "" },
  { label: "Heading 1", tag: "h1" },
  { label: "Heading 2", tag: "h2" },
  { label: "Heading 3", tag: "h3" },
  { label: "Heading 4", tag: "h4" },
  { label: "Heading 5", tag: "h5" },
  { label: "Heading 6", tag: "h6" },
];

const COLOR_PRESETS = [
  "#000000", "#434343", "#666666", "#999999", "#CCCCCC", "#FFFFFF",
  "#FF0000", "#FF9900", "#FFFF00", "#00FF00", "#00FFFF", "#0000FF",
  "#9900FF", "#FF00FF", "#F4CCCC", "#FCE5CD", "#FFF2CC", "#D9EAD3",
  "#D0E0E3", "#CFE2F3", "#D9D2E9", "#EAD1DC",
];

interface BlogContentEditorProps {
  value: string;
  onChange: (value: string) => void;
}

function ToolbarButton({ icon: Icon, label, onClick, className }: {
  icon: React.ElementType; label: string; onClick: () => void; className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className={`h-7 w-7 ${className || ""}`} onClick={onClick}>
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
              className="h-5 w-5 rounded border border-border hover:scale-125 transition-transform focus:outline-none focus:ring-2 focus:ring-ring"
              style={{ backgroundColor: hex }}
              onClick={() => { onSelect(hex); setOpen(false); }}
            />
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          Custom
          <input type="color" className="h-5 w-5 rounded border-none cursor-pointer p-0"
            onChange={(e) => { onSelect(e.target.value); setOpen(false); }}
          />
        </label>
      </PopoverContent>
    </Popover>
  );
}

export default function BlogContentEditor({ value, onChange }: BlogContentEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [fontSize, setFontSize] = useState("14");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [history, setHistory] = useState<string[]>([value]);
  const [historyIdx, setHistoryIdx] = useState(0);

  const getSelection = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return { start: 0, end: 0, selected: "" };
    return { start: el.selectionStart, end: el.selectionEnd, selected: value.substring(el.selectionStart, el.selectionEnd) };
  }, [value]);

  const replaceSelection = useCallback((before: string, after: string, replaceText?: string) => {
    const { start, end, selected } = getSelection();
    const inner = replaceText !== undefined ? replaceText : selected;
    const newValue = value.substring(0, start) + before + inner + after + value.substring(end);
    onChange(newValue);
    setHistory((h) => [...h.slice(0, historyIdx + 1), newValue]);
    setHistoryIdx((i) => i + 1);
    setTimeout(() => {
      const el = textareaRef.current;
      if (el) {
        const cursorPos = start + before.length + inner.length;
        el.focus();
        el.setSelectionRange(cursorPos, cursorPos);
      }
    }, 0);
  }, [value, onChange, getSelection, historyIdx]);

  const insertAtCursor = useCallback((text: string) => {
    const { start, end } = getSelection();
    const newValue = value.substring(0, start) + text + value.substring(end);
    onChange(newValue);
    setHistory((h) => [...h.slice(0, historyIdx + 1), newValue]);
    setHistoryIdx((i) => i + 1);
    setTimeout(() => {
      const el = textareaRef.current;
      if (el) { el.focus(); el.setSelectionRange(start + text.length, start + text.length); }
    }, 0);
  }, [value, onChange, getSelection, historyIdx]);

  const wrapTag = (tag: string, attrs?: string) => {
    const a = attrs ? ` ${attrs}` : "";
    replaceSelection(`<${tag}${a}>`, `</${tag}>`);
  };

  const handleUndo = () => {
    if (historyIdx > 0) {
      const newIdx = historyIdx - 1;
      setHistoryIdx(newIdx);
      onChange(history[newIdx]);
    }
  };

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      const newIdx = historyIdx + 1;
      setHistoryIdx(newIdx);
      onChange(history[newIdx]);
    }
  };

  const applyHeading = (tag: string) => {
    if (!tag) {
      const { selected } = getSelection();
      // Strip any heading tags
      const stripped = selected.replace(/<\/?h[1-6][^>]*>/g, "");
      replaceSelection("", "", stripped);
    } else {
      wrapTag(tag);
    }
  };

  const applyFontSize = (size: string) => {
    setFontSize(size);
    wrapTag("span", `style="font-size:${size}px"`);
  };

  const applyFontFamily = (font: string) => {
    wrapTag("span", `style="font-family:'${font}'"`);
  };

  const insertLink = () => {
    const text = linkText || linkUrl;
    insertAtCursor(`<a href="${linkUrl}">${text}</a>`);
    setLinkUrl("");
    setLinkText("");
    setLinkOpen(false);
  };

  const insertImage = () => {
    insertAtCursor(`<img src="${imageUrl}" alt="${imageAlt || "image"}" style="max-width:100%;border-radius:8px" />`);
    setImageUrl("");
    setImageAlt("");
    setImageOpen(false);
  };

  const insertTable = () => {
    insertAtCursor(
      `\n<table style="width:100%;border-collapse:collapse">\n<tr>\n<th style="border:1px solid #ddd;padding:8px">Header 1</th>\n<th style="border:1px solid #ddd;padding:8px">Header 2</th>\n<th style="border:1px solid #ddd;padding:8px">Header 3</th>\n</tr>\n<tr>\n<td style="border:1px solid #ddd;padding:8px">Cell</td>\n<td style="border:1px solid #ddd;padding:8px">Cell</td>\n<td style="border:1px solid #ddd;padding:8px">Cell</td>\n</tr>\n</table>\n`
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="border border-border rounded-lg overflow-hidden bg-background">
        {/* Toolbar Row 1 */}
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 border-b border-border bg-muted/30">
          <ToolbarButton icon={Undo2} label="Undo" onClick={handleUndo} />
          <ToolbarButton icon={Redo2} label="Redo" onClick={handleRedo} />

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Heading style */}
          <Select onValueChange={applyHeading} defaultValue="">
            <SelectTrigger className="h-7 w-[130px] text-xs border-none bg-transparent hover:bg-accent">
              <SelectValue placeholder="Normal text" />
            </SelectTrigger>
            <SelectContent>
              {HEADING_STYLES.map((h) => (
                <SelectItem key={h.label} value={h.tag || "_normal"} className="text-xs">
                  {h.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Font family */}
          <Select onValueChange={applyFontFamily} defaultValue="Arial">
            <SelectTrigger className="h-7 w-[110px] text-xs border-none bg-transparent hover:bg-accent">
              <SelectValue placeholder="Arial" />
            </SelectTrigger>
            <SelectContent>
              {FONT_FAMILIES.map((f) => (
                <SelectItem key={f} value={f} className="text-xs" style={{ fontFamily: f }}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Font size */}
          <Select value={fontSize} onValueChange={applyFontSize}>
            <SelectTrigger className="h-7 w-[60px] text-xs border-none bg-transparent hover:bg-accent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Text formatting */}
          <ToolbarButton icon={Bold} label="Bold (Ctrl+B)" onClick={() => wrapTag("b")} />
          <ToolbarButton icon={Italic} label="Italic (Ctrl+I)" onClick={() => wrapTag("i")} />
          <ToolbarButton icon={Underline} label="Underline (Ctrl+U)" onClick={() => wrapTag("u")} />
          <ToolbarButton icon={Strikethrough} label="Strikethrough" onClick={() => wrapTag("s")} />
          <ToolbarButton icon={Subscript} label="Subscript" onClick={() => wrapTag("sub")} />
          <ToolbarButton icon={Superscript} label="Superscript" onClick={() => wrapTag("sup")} />

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Colors */}
          <ColorPicker icon={Type} label="Text color" colors={COLOR_PRESETS}
            onSelect={(hex) => wrapTag("span", `style="color:${hex}"`)} />
          <ColorPicker icon={Paintbrush} label="Highlight color" colors={COLOR_PRESETS}
            onSelect={(hex) => wrapTag("span", `style="background-color:${hex}"`) } />

          <Separator orientation="vertical" className="h-5 mx-1" />

          <ToolbarButton icon={RemoveFormatting} label="Clear formatting" onClick={() => {
            const { selected } = getSelection();
            const cleaned = selected.replace(/<[^>]+>/g, "");
            replaceSelection("", "", cleaned);
          }} />
        </div>

        {/* Toolbar Row 2 */}
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 border-b border-border bg-muted/30">
          {/* Alignment */}
          <ToolbarButton icon={AlignLeft} label="Align left" onClick={() => wrapTag("div", 'style="text-align:left"')} />
          <ToolbarButton icon={AlignCenter} label="Align center" onClick={() => wrapTag("div", 'style="text-align:center"')} />
          <ToolbarButton icon={AlignRight} label="Align right" onClick={() => wrapTag("div", 'style="text-align:right"')} />
          <ToolbarButton icon={AlignJustify} label="Justify" onClick={() => wrapTag("div", 'style="text-align:justify"')} />

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Lists */}
          <ToolbarButton icon={List} label="Bullet list" onClick={() => replaceSelection("<ul>\n<li>", "</li>\n</ul>")} />
          <ToolbarButton icon={ListOrdered} label="Numbered list" onClick={() => replaceSelection("<ol>\n<li>", "</li>\n</ol>")} />

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Code */}
          <ToolbarButton icon={Code} label="Code block" onClick={() => replaceSelection("<pre><code>", "</code></pre>")} />
          <ToolbarButton icon={Quote} label="Blockquote" onClick={() => wrapTag("blockquote")} />
          <ToolbarButton icon={Minus} label="Horizontal rule" onClick={() => insertAtCursor("\n<hr />\n")} />
          <ToolbarButton icon={Table} label="Insert table" onClick={insertTable} />

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Link */}
          <Popover open={linkOpen} onOpenChange={setLinkOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
                    <Link2 className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Insert link</TooltipContent>
            </Tooltip>
            <PopoverContent className="w-72 space-y-2" align="start">
              <Input placeholder="URL" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="h-8 text-xs" />
              <Input placeholder="Link text (optional)" value={linkText} onChange={(e) => setLinkText(e.target.value)} className="h-8 text-xs" />
              <Button size="sm" className="w-full h-7 text-xs" onClick={insertLink} disabled={!linkUrl}>Insert Link</Button>
            </PopoverContent>
          </Popover>

          {/* Image */}
          <Popover open={imageOpen} onOpenChange={setImageOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
                    <Image className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Insert image</TooltipContent>
            </Tooltip>
            <PopoverContent className="w-72 space-y-2" align="start">
              <Input placeholder="Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="h-8 text-xs" />
              <Input placeholder="Alt text" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} className="h-8 text-xs" />
              <Button size="sm" className="w-full h-7 text-xs" onClick={insertImage} disabled={!imageUrl}>Insert Image</Button>
            </PopoverContent>
          </Popover>
        </div>

        {/* Editor area */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setHistory((h) => [...h.slice(0, historyIdx + 1), e.target.value]);
            setHistoryIdx((i) => i + 1);
          }}
          onKeyDown={(e) => {
            if (e.ctrlKey || e.metaKey) {
              if (e.key === "b") { e.preventDefault(); wrapTag("b"); }
              if (e.key === "i") { e.preventDefault(); wrapTag("i"); }
              if (e.key === "u") { e.preventDefault(); wrapTag("u"); }
              if (e.key === "z") { e.preventDefault(); handleUndo(); }
              if (e.key === "y") { e.preventDefault(); handleRedo(); }
            }
          }}
          placeholder="Start writing your article content here..."
          rows={16}
          className="w-full resize-y border-none outline-none p-4 font-mono text-sm bg-background text-foreground min-h-[300px]"
        />
      </div>
    </TooltipProvider>
  );
}
