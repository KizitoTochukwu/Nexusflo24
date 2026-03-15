import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Bold, Italic, Underline, List, ListOrdered,
  Link2, Image, Minus, Smile, Square,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Type, Paintbrush, PanelTop
} from "lucide-react";
import ImageInsertDialog from "./ImageInsertDialog";

const COLOR_PRESETS = [
  { hex: "#000000", label: "Black" },
  { hex: "#FFFFFF", label: "White" },
  { hex: "#0B1F3A", label: "Navy" },
  { hex: "#E6B325", label: "Gold" },
  { hex: "#DC2626", label: "Red" },
  { hex: "#16A34A", label: "Green" },
  { hex: "#2563EB", label: "Blue" },
  { hex: "#0D9488", label: "Teal" },
  { hex: "#7C3AED", label: "Purple" },
  { hex: "#EA580C", label: "Orange" },
  { hex: "#6B7280", label: "Gray" },
  { hex: "#EC4899", label: "Pink" },
];

interface ColorPickerPopoverProps {
  icon: React.ReactNode;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (hex: string) => void;
}

function ColorPickerPopover({ icon, label, open, onOpenChange, onSelect }: ColorPickerPopoverProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
              {icon}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">{label}</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-auto p-3" align="start" sideOffset={8}>
        <div className="grid grid-cols-6 gap-1.5 mb-2">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c.hex}
              type="button"
              title={c.label}
              className="h-6 w-6 rounded border border-border hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-ring"
              style={{ backgroundColor: c.hex }}
              onClick={() => { onSelect(c.hex); onOpenChange(false); }}
            />
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          Custom
          <input
            type="color"
            className="h-6 w-6 rounded border-none cursor-pointer p-0"
            onChange={(e) => { onSelect(e.target.value); onOpenChange(false); }}
          />
        </label>
      </PopoverContent>
    </Popover>
  );
}

interface FormattingToolbarProps {
  onWrap: (before: string, after: string) => void;
  onInsert: (text: string) => void;
  onInsertButton: () => void;
}

export default function FormattingToolbar({ onWrap, onInsert, onInsertButton }: FormattingToolbarProps) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [textColorOpen, setTextColorOpen] = useState(false);
  const [bgColorOpen, setBgColorOpen] = useState(false);
  const [blockBgOpen, setBlockBgOpen] = useState(false);

  const tools = [
    { icon: Bold, label: "Bold", action: () => onWrap("<b>", "</b>") },
    { icon: Italic, label: "Italic", action: () => onWrap("<i>", "</i>") },
    { icon: Underline, label: "Underline", action: () => onWrap("<u>", "</u>") },
    { icon: List, label: "Bullet List", action: () => onWrap("<ul>\n<li>", "</li>\n</ul>") },
    { icon: ListOrdered, label: "Numbered List", action: () => onWrap("<ol>\n<li>", "</li>\n</ol>") },
    { icon: Link2, label: "Insert Link", action: () => onWrap('<a href="URL">', "</a>") },
    { icon: Square, label: "Insert Button", action: onInsertButton },
    { icon: Image, label: "Insert Image", action: () => setImageDialogOpen(true) },
    { icon: Minus, label: "Divider", action: () => onInsert("\n---\n") },
    { icon: Smile, label: "Emoji", action: () => onInsert("😊") },
    { icon: AlignLeft, label: "Align Left", action: () => onWrap('<div style="text-align:left">', "</div>") },
    { icon: AlignCenter, label: "Align Center", action: () => onWrap('<div style="text-align:center">', "</div>") },
    { icon: AlignRight, label: "Align Right", action: () => onWrap('<div style="text-align:right">', "</div>") },
    { icon: AlignJustify, label: "Justify", action: () => onWrap('<div style="text-align:justify">', "</div>") },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border pb-1.5 mb-2">
        {tools.map(({ icon: Icon, label, action }) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={action}
              >
                <Icon className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">{label}</TooltipContent>
          </Tooltip>
        ))}

        <div className="w-px h-5 bg-border mx-0.5" />

        <ColorPickerPopover
          icon={<Type className="h-3.5 w-3.5" />}
          label="Text Color"
          open={textColorOpen}
          onOpenChange={setTextColorOpen}
          onSelect={(hex) => onWrap(`<span style="color:${hex}">`, "</span>")}
        />
        <ColorPickerPopover
          icon={<Paintbrush className="h-3.5 w-3.5" />}
          label="Highlight Color"
          open={bgColorOpen}
          onOpenChange={setBgColorOpen}
          onSelect={(hex) => onWrap(`<span style="background-color:${hex}">`, "</span>")}
        />
      </div>

      <ImageInsertDialog
        open={imageDialogOpen}
        onOpenChange={setImageDialogOpen}
        onInsert={onInsert}
      />
    </TooltipProvider>
  );
}