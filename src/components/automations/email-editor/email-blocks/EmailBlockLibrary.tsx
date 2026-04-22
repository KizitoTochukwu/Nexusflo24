import { BLOCK_META, EmailBlockType, createEmailBlock, EmailBlock } from "./emailBlockTypes";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EmailBlockLibraryProps {
  onAddBlock: (block: EmailBlock) => void;
}

const GROUPS = ["Content", "Layout", "Engagement"] as const;

export default function EmailBlockLibrary({ onAddBlock }: EmailBlockLibraryProps) {
  return (
    <TooltipProvider delayDuration={300}>
      {/* Slim icon-rail palette at all breakpoints to maximize canvas width */}
      <div className="hidden sm:flex w-[48px] shrink-0 flex-col border-r border-border bg-muted/30 overflow-y-auto">
        <div className="p-1.5">
          {GROUPS.map((group) => {
            const entries = (Object.entries(BLOCK_META) as [EmailBlockType, typeof BLOCK_META[EmailBlockType]][])
              .filter(([, m]) => m.group === group);
            return (
              <div key={group} className="mb-3 last:mb-0">
                <div className="grid grid-cols-1 gap-1">
                  {entries.map(([type, meta]) => {
                    const Icon = meta.icon;
                    const button = (
                      <button
                        key={type}
                        type="button"
                        aria-label={meta.label}
                        className="flex items-center justify-center rounded-md border border-border bg-background h-9 w-9 mx-auto text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground transition-all cursor-grab active:cursor-grabbing"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/email-block-type", type);
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        onClick={() => onAddBlock(createEmailBlock(type))}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    );
                    return (
                      <Tooltip key={type}>
                        <TooltipTrigger asChild>{button}</TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">
                          {meta.label}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
                <div className="my-2 mx-1.5 border-t border-border/50 last:hidden" />
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
