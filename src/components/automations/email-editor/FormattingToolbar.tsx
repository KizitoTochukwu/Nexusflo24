import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  Bold, Italic, Underline, List, ListOrdered,
  Link2, Image, Minus, Smile, Square
} from "lucide-react";
import ImageInsertDialog from "./ImageInsertDialog";

interface FormattingToolbarProps {
  onWrap: (before: string, after: string) => void;
  onInsert: (text: string) => void;
  onInsertButton: () => void;
}

export default function FormattingToolbar({ onWrap, onInsert, onInsertButton }: FormattingToolbarProps) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  const tools = [
    { icon: Bold, label: "Bold", action: () => onWrap("<b>", "</b>") },
    { icon: Italic, label: "Italic", action: () => onWrap("<i>", "</i>") },
    { icon: Underline, label: "Underline", action: () => onWrap("<u>", "</u>") },
    { icon: List, label: "Bullet List", action: () => onInsert("\n• ") },
    { icon: ListOrdered, label: "Numbered List", action: () => onInsert("\n1. ") },
    { icon: Link2, label: "Insert Link", action: () => onWrap('<a href="URL">', "</a>") },
    { icon: Square, label: "Insert Button", action: onInsertButton },
    { icon: Image, label: "Insert Image", action: () => setImageDialogOpen(true) },
    { icon: Minus, label: "Divider", action: () => onInsert("\n---\n") },
    { icon: Smile, label: "Emoji", action: () => onInsert("😊") },
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
      </div>

      <ImageInsertDialog
        open={imageDialogOpen}
        onOpenChange={setImageDialogOpen}
        onInsert={onInsert}
      />
    </TooltipProvider>
  );
}
