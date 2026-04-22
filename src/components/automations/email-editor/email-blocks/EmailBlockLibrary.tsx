import { BLOCK_META, EmailBlockType, createEmailBlock, EmailBlock } from "./emailBlockTypes";

interface EmailBlockLibraryProps {
  onAddBlock: (block: EmailBlock) => void;
}

const GROUPS = ["Content", "Layout", "Engagement"] as const;

export default function EmailBlockLibrary({ onAddBlock }: EmailBlockLibraryProps) {
  return (
    <div className="w-[140px] shrink-0 border-r border-border bg-muted/30 overflow-y-auto">
      <div className="p-3">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Content Blocks
        </h3>
        {GROUPS.map((group) => {
          const entries = (Object.entries(BLOCK_META) as [EmailBlockType, typeof BLOCK_META[EmailBlockType]][])
            .filter(([, m]) => m.group === group);
          return (
            <div key={group} className="mb-4">
              <p className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-1.5 px-1">
                {group}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {entries.map(([type, meta]) => {
                  const Icon = meta.icon;
                  return (
                    <button
                      key={type}
                      type="button"
                      className="flex flex-col items-center gap-1 rounded-lg border border-border bg-background p-2.5 text-[10px] font-medium text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground transition-all cursor-grab active:cursor-grabbing"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/email-block-type", type);
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => onAddBlock(createEmailBlock(type))}
                    >
                      <Icon className="h-4 w-4" />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
