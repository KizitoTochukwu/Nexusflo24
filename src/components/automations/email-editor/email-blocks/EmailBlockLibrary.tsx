import { BLOCK_META, EmailBlockType, createEmailBlock, EmailBlock } from "./emailBlockTypes";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EmailBlockLibraryProps {
  onAddBlock: (block: EmailBlock) => void;
}

const GROUPS = ["Content", "Layout", "Engagement"] as const;

export default function EmailBlockLibrary({ onAddBlock }: EmailBlockLibraryProps) {
  return (
    <TooltipProvider delayDuration={300}>
      {/* Hidden on very small screens, icon-rail on sm/md, full tiles on lg+ */}
      <div className="hidden sm:flex sm:w-[56px] lg:w-[104px] shrink-0 flex-col border-r border-border bg-muted/30 overflow-y-auto">
        <div className="p-2 lg:p-3">
          <h3 className="hidden lg:block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Content Blocks
          </h3>
          {GROUPS.map((group) => {
            const entries = (Object.entries(BLOCK_META) as [EmailBlockType, typeof BLOCK_META[EmailBlockType]][])
              .filter(([, m]) => m.group === group);
            return (
              <div key={group} className="mb-4 lg:mb-5">
                <p className="hidden lg:block text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-2 px-1">
                  {group}
                </p>
                <div className="grid grid-cols-1 gap-1.5 lg:gap-2">
                  {entries.map(([type, meta]) => {
                    const Icon = meta.icon;
                    const button = (
                      <button
                        key={type}
                        type="button"
                        className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-2 lg:py-3 px-1.5 lg:px-2 min-h-[40px] lg:min-h-[60px] text-[11px] font-medium text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground transition-all cursor-grab active:cursor-grabbing"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/email-block-type", type);
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        onClick={() => onAddBlock(createEmailBlock(type))}
                      >
                        <Icon className="h-4 w-4 lg:h-5 lg:w-5" />
                        <span className="hidden lg:inline leading-tight text-center">{meta.label}</span>
                      </button>
                    );
                    return (
                      <Tooltip key={type}>
                        <TooltipTrigger asChild>{button}</TooltipTrigger>
                        <TooltipContent side="right" className="lg:hidden text-xs">
                          {meta.label}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
