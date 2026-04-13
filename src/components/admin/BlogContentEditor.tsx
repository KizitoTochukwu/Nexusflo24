import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Link2, Image, Minus, Code,
  Type, Paintbrush, Undo2, Redo2, Table, Quote,
  Subscript, Superscript, RemoveFormatting, Upload
} from "lucide-react";

const FONT_FAMILIES = [
  "Arial", "Georgia", "Times New Roman", "Courier New",
  "Verdana", "Trebuchet MS", "Inter", "Helvetica",
];

const FONT_SIZES = ["1", "2", "3", "4", "5", "6", "7"];
const FONT_SIZE_LABELS: Record<string, string> = {
  "1": "10px", "2": "13px", "3": "16px", "4": "18px", "5": "24px", "6": "32px", "7": "48px",
};

const HEADING_STYLES = [
  { label: "Normal text", value: "p" },
  { label: "Heading 1", value: "h1" },
  { label: "Heading 2", value: "h2" },
  { label: "Heading 3", value: "h3" },
  { label: "Heading 4", value: "h4" },
  { label: "Heading 5", value: "h5" },
  { label: "Heading 6", value: "h6" },
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

function ToolbarButton({ icon: Icon, label, onClick, active, className }: {
  icon: React.ElementType; label: string; onClick: () => void; active?: boolean; className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${active ? "bg-accent text-accent-foreground" : ""} ${className || ""}`}
          onClick={onClick}
        >
          <Icon className="h-4 w-4" />
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
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
              <Icon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-auto p-3" align="start" sideOffset={8}>
        <div className="grid grid-cols-6 gap-1.5 mb-2">
          {colors.map((hex) => (
            <button key={hex} type="button"
              className="h-6 w-6 rounded border border-border hover:scale-125 transition-transform focus:outline-none focus:ring-2 focus:ring-ring"
              style={{ backgroundColor: hex }}
              onClick={() => { onSelect(hex); setOpen(false); }}
            />
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          Custom
          <input type="color" className="h-6 w-6 rounded border-none cursor-pointer p-0"
            onChange={(e) => { onSelect(e.target.value); setOpen(false); }}
          />
        </label>
      </PopoverContent>
    </Popover>
  );
}

export default function BlogContentEditor({ value, onChange }: BlogContentEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [uploading, setUploading] = useState(false);
  const isInternalUpdate = useRef(false);

  // Sync value prop → editor only when value changes externally
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

  const applyHeading = (tag: string) => {
    exec("formatBlock", tag === "p" ? "p" : tag);
  };

  const insertLink = () => {
    const text = linkText || linkUrl;
    exec("insertHTML", `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" style="color:#0000EE;text-decoration:underline">${text}</a>`);
    setLinkUrl("");
    setLinkText("");
    setLinkOpen(false);
  };

  const insertImage = (url: string, alt: string) => {
    exec("insertHTML", `<img src="${url}" alt="${alt || "image"}" style="max-width:100%;border-radius:8px;margin:8px 0" />`);
  };

  const insertImageFromUrl = () => {
    insertImage(imageUrl, imageAlt);
    setImageUrl("");
    setImageAlt("");
    setImageOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `blog/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('blog-assets').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('blog-assets').getPublicUrl(path);
      insertImage(publicUrl, file.name);
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const insertTable = () => {
    exec("insertHTML",
      `<table style="width:100%;border-collapse:collapse;margin:12px 0"><tr><th style="border:1px solid #ddd;padding:8px;background:#f5f5f5">Header 1</th><th style="border:1px solid #ddd;padding:8px;background:#f5f5f5">Header 2</th><th style="border:1px solid #ddd;padding:8px;background:#f5f5f5">Header 3</th></tr><tr><td style="border:1px solid #ddd;padding:8px">Cell</td><td style="border:1px solid #ddd;padding:8px">Cell</td><td style="border:1px solid #ddd;padding:8px">Cell</td></tr></table>`
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="border border-border rounded-lg overflow-hidden bg-background shadow-sm">
        {/* Toolbar Row 1 */}
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/40">
          <ToolbarButton icon={Undo2} label="Undo (Ctrl+Z)" onClick={() => exec("undo")} />
          <ToolbarButton icon={Redo2} label="Redo (Ctrl+Y)" onClick={() => exec("redo")} />

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Heading style */}
          <Select onValueChange={applyHeading} defaultValue="p">
            <SelectTrigger className="h-8 w-[130px] text-xs border-none bg-transparent hover:bg-accent">
              <SelectValue placeholder="Normal text" />
            </SelectTrigger>
            <SelectContent>
              {HEADING_STYLES.map((h) => (
                <SelectItem key={h.value} value={h.value} className="text-xs">
                  {h.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Font family */}
          <Select onValueChange={(f) => exec("fontName", f)} defaultValue="Arial">
            <SelectTrigger className="h-8 w-[120px] text-xs border-none bg-transparent hover:bg-accent">
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
          <Select onValueChange={(s) => exec("fontSize", s)} defaultValue="3">
            <SelectTrigger className="h-8 w-[70px] text-xs border-none bg-transparent hover:bg-accent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">{FONT_SIZE_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Text formatting */}
          <ToolbarButton icon={Bold} label="Bold (Ctrl+B)" onClick={() => exec("bold")} />
          <ToolbarButton icon={Italic} label="Italic (Ctrl+I)" onClick={() => exec("italic")} />
          <ToolbarButton icon={Underline} label="Underline (Ctrl+U)" onClick={() => exec("underline")} />
          <ToolbarButton icon={Strikethrough} label="Strikethrough" onClick={() => exec("strikeThrough")} />
          <ToolbarButton icon={Subscript} label="Subscript" onClick={() => exec("subscript")} />
          <ToolbarButton icon={Superscript} label="Superscript" onClick={() => exec("superscript")} />

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Colors */}
          <ColorPicker icon={Type} label="Text color" colors={COLOR_PRESETS}
            onSelect={(hex) => exec("foreColor", hex)} />
          <ColorPicker icon={Paintbrush} label="Highlight color" colors={COLOR_PRESETS}
            onSelect={(hex) => exec("hiliteColor", hex)} />

          <Separator orientation="vertical" className="h-5 mx-1" />

          <ToolbarButton icon={RemoveFormatting} label="Clear formatting" onClick={() => exec("removeFormat")} />
        </div>

        {/* Toolbar Row 2 */}
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/40">
          {/* Alignment */}
          <ToolbarButton icon={AlignLeft} label="Align left" onClick={() => exec("justifyLeft")} />
          <ToolbarButton icon={AlignCenter} label="Align center" onClick={() => exec("justifyCenter")} />
          <ToolbarButton icon={AlignRight} label="Align right" onClick={() => exec("justifyRight")} />
          <ToolbarButton icon={AlignJustify} label="Justify" onClick={() => exec("justifyFull")} />

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Lists */}
          <ToolbarButton icon={List} label="Bullet list" onClick={() => exec("insertUnorderedList")} />
          <ToolbarButton icon={ListOrdered} label="Numbered list" onClick={() => exec("insertOrderedList")} />

          <Separator orientation="vertical" className="h-5 mx-1" />

          <ToolbarButton icon={Code} label="Code block" onClick={() => exec("formatBlock", "pre")} />
          <ToolbarButton icon={Quote} label="Blockquote" onClick={() => exec("formatBlock", "blockquote")} />
          <ToolbarButton icon={Minus} label="Horizontal rule" onClick={() => exec("insertHorizontalRule")} />
          <ToolbarButton icon={Table} label="Insert table" onClick={insertTable} />

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Link */}
          <Popover open={linkOpen} onOpenChange={setLinkOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                    <Link2 className="h-4 w-4" />
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

          {/* Image URL */}
          <Popover open={imageOpen} onOpenChange={setImageOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                    <Image className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Insert image URL</TooltipContent>
            </Tooltip>
            <PopoverContent className="w-72 space-y-2" align="start">
              <Input placeholder="Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="h-8 text-xs" />
              <Input placeholder="Alt text" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} className="h-8 text-xs" />
              <Button size="sm" className="w-full h-7 text-xs" onClick={insertImageFromUrl} disabled={!imageUrl}>Insert Image</Button>
            </PopoverContent>
          </Popover>

          {/* Image Upload */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Upload className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Upload image</TooltipContent>
          </Tooltip>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </div>

        {/* WYSIWYG Editor Area */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="w-full min-h-[400px] p-6 outline-none text-foreground bg-background prose prose-sm max-w-none
            focus:ring-0 focus:outline-none
            [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-6
            [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:mt-5
            [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4
            [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:mb-2 [&_h4]:mt-3
            [&_p]:mb-3 [&_p]:leading-relaxed
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3
            [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3
            [&_li]:mb-1
            [&_blockquote]:border-l-4 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4 [&_blockquote]:text-muted-foreground
            [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-md [&_pre]:overflow-x-auto [&_pre]:my-3 [&_pre]:text-sm
            [&_a]:text-primary [&_a]:underline
            [&_img]:rounded-lg [&_img]:my-3 [&_img]:max-w-full
            [&_table]:w-full [&_table]:my-3
            [&_hr]:my-6 [&_hr]:border-border"
          style={{ lineHeight: 1.7 }}
          onInput={emitChange}
          onBlur={emitChange}
          dangerouslySetInnerHTML={{ __html: value }}
          data-placeholder="Start writing your article content here..."
        />
        
        {/* Word count bar */}
        <div className="flex items-center justify-between px-4 py-1.5 border-t border-border bg-muted/30 text-xs text-muted-foreground">
          <span>{(editorRef.current?.innerText || "").trim().split(/\s+/).filter(Boolean).length} words</span>
          <span>{(editorRef.current?.innerText || "").length} characters</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
