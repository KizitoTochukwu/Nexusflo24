import { useState, useCallback } from "react";
import { GripVertical, Copy, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EmailBlock, EmailBlockType, createEmailBlock,
  TextBlockProps, ImageBlockProps, ButtonBlockProps,
  DividerBlockProps, SpacerBlockProps, SocialBlockProps, ColumnsBlockProps,
  BLOCK_META,
} from "./emailBlockTypes";

interface EmailBlockCanvasProps {
  blocks: EmailBlock[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onReorder: (blocks: EmailBlock[]) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onAddBlock: (block: EmailBlock, index: number) => void;
}

function TextPreview({ props }: { props: TextBlockProps }) {
  return (
    <div
      className="text-sm leading-relaxed whitespace-pre-wrap break-words"
      style={{
        fontSize: `${props.fontSize}px`,
        color: props.color,
        textAlign: props.alignment,
        fontWeight: props.fontWeight,
        lineHeight: props.lineHeight,
      }}
      dangerouslySetInnerHTML={{ __html: props.content.replace(/\n/g, "<br/>") }}
    />
  );
}

function ImagePreview({ props }: { props: ImageBlockProps }) {
  return (
    <div style={{ textAlign: props.alignment }}>
      {props.src ? (
        <img
          src={props.src}
          alt={props.alt}
          className="max-w-full inline-block"
          style={{ width: `${props.width}%`, borderRadius: `${props.borderRadius}px` }}
        />
      ) : (
        <div className="h-24 bg-muted/50 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-xs text-muted-foreground">
          Click to add image
        </div>
      )}
    </div>
  );
}

function ButtonPreview({ props }: { props: ButtonBlockProps }) {
  return (
    <div style={{ textAlign: props.alignment }}>
      <span
        className="inline-block font-semibold cursor-default"
        style={{
          backgroundColor: props.bgColor,
          color: props.textColor,
          padding: "12px 28px",
          borderRadius: `${props.borderRadius}px`,
          fontSize: `${props.fontSize}px`,
          width: props.fullWidth ? "100%" : "auto",
          textAlign: "center",
          display: props.fullWidth ? "block" : "inline-block",
        }}
      >
        {props.label}
      </span>
    </div>
  );
}

function DividerPreview({ props }: { props: DividerBlockProps }) {
  return (
    <hr
      style={{
        border: "none",
        borderTop: `${props.thickness}px ${props.style} ${props.color}`,
        margin: `${props.margin}px 0`,
      }}
    />
  );
}

function SpacerPreview({ props }: { props: SpacerBlockProps }) {
  return (
    <div
      className="flex items-center justify-center text-[10px] text-muted-foreground/50"
      style={{ height: `${props.height}px` }}
    >
      ↕ {props.height}px
    </div>
  );
}

function SocialPreview({ props }: { props: SocialBlockProps }) {
  const socials = [
    { key: "facebook", icon: "f", color: "#1877F2" },
    { key: "twitter", icon: "𝕏", color: "#000" },
    { key: "linkedin", icon: "in", color: "#0A66C2" },
    { key: "instagram", icon: "📷", color: "#E4405F" },
  ] as const;

  return (
    <div className="flex gap-2 items-center" style={{ justifyContent: props.alignment === "center" ? "center" : props.alignment === "right" ? "flex-end" : "flex-start" }}>
      {socials.map((s) => (
        <div
          key={s.key}
          className="rounded-full flex items-center justify-center text-white font-bold"
          style={{
            width: `${props.iconSize}px`,
            height: `${props.iconSize}px`,
            backgroundColor: s.color,
            fontSize: `${props.iconSize * 0.4}px`,
          }}
        >
          {s.icon}
        </div>
      ))}
    </div>
  );
}

function ColumnsPreview({ props }: { props: ColumnsBlockProps }) {
  return (
    <div className="flex" style={{ gap: `${props.gap}px` }}>
      {props.columns.map((col, i) => (
        <div
          key={i}
          className="flex-1 bg-muted/30 border border-dashed border-border rounded p-2 text-xs text-muted-foreground min-h-[40px]"
        >
          {col || `Column ${i + 1}`}
        </div>
      ))}
    </div>
  );
}

function BlockPreview({ block }: { block: EmailBlock }) {
  switch (block.type) {
    case "text": return <TextPreview props={block.props as TextBlockProps} />;
    case "image": return <ImagePreview props={block.props as ImageBlockProps} />;
    case "button": return <ButtonPreview props={block.props as ButtonBlockProps} />;
    case "divider": return <DividerPreview props={block.props as DividerBlockProps} />;
    case "spacer": return <SpacerPreview props={block.props as SpacerBlockProps} />;
    case "social": return <SocialPreview props={block.props as SocialBlockProps} />;
    case "columns": return <ColumnsPreview props={block.props as ColumnsBlockProps} />;
    default: return null;
  }
}

export default function EmailBlockCanvas({
  blocks, selectedId, onSelect, onReorder, onDuplicate, onDelete, onAddBlock,
}: EmailBlockCanvasProps) {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    setDragSourceIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes("application/email-block-type") ? "copy" : "move";
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    const blockType = e.dataTransfer.getData("application/email-block-type") as EmailBlockType;
    if (blockType) {
      onAddBlock(createEmailBlock(blockType), dropIndex);
      setDragSourceIndex(null);
      return;
    }

    if (dragSourceIndex !== null && dragSourceIndex !== dropIndex) {
      const newBlocks = [...blocks];
      const [moved] = newBlocks.splice(dragSourceIndex, 1);
      const adjustedIndex = dropIndex > dragSourceIndex ? dropIndex - 1 : dropIndex;
      newBlocks.splice(adjustedIndex, 0, moved);
      onReorder(newBlocks);
    }
    setDragSourceIndex(null);
  }, [blocks, dragSourceIndex, onReorder, onAddBlock]);

  const moveBlock = useCallback((index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[target]] = [newBlocks[target], newBlocks[index]];
    onReorder(newBlocks);
  }, [blocks, onReorder]);

  return (
    <div
      className="flex-1 overflow-y-auto bg-muted/20 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelect(null);
      }}
    >
      <div className="max-w-[600px] mx-auto min-h-[400px]">
        {blocks.length === 0 && (
          <div
            className="border-2 border-dashed border-border rounded-xl h-[300px] flex flex-col items-center justify-center text-muted-foreground"
            onDragOver={(e) => handleDragOver(e, 0)}
            onDragLeave={() => setDragOverIndex(null)}
            onDrop={(e) => handleDrop(e, 0)}
          >
            <p className="text-sm font-medium mb-1">Drag blocks here or click to add</p>
            <p className="text-xs">Build your email visually</p>
          </div>
        )}

        {blocks.map((block, index) => {
          const meta = BLOCK_META[block.type];
          const isSelected = selectedId === block.id;
          const isDragOver = dragOverIndex === index;

          return (
            <div key={block.id}>
              {/* Drop zone */}
              <div
                className={`h-1 rounded-full mx-4 transition-all ${isDragOver ? "bg-primary h-1.5 my-1" : "my-0.5"}`}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={() => setDragOverIndex(null)}
                onDrop={(e) => handleDrop(e, index)}
              />

              {/* Block card */}
              <div
                className={`group relative rounded-lg border bg-background transition-all cursor-pointer mb-0.5 ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/20 shadow-md"
                    : "border-border hover:border-primary/30 hover:shadow-sm"
                }`}
                onClick={() => onSelect(block.id)}
                draggable
                onDragStart={() => handleDragStart(index)}
              >
                {/* Block type label */}
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50">
                  <div className="flex items-center gap-1.5">
                    <GripVertical className="h-3 w-3 text-muted-foreground/50 cursor-grab" />
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      {meta.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="h-5 w-5"
                      onClick={(e) => { e.stopPropagation(); moveBlock(index, -1); }}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="h-5 w-5"
                      onClick={(e) => { e.stopPropagation(); moveBlock(index, 1); }}
                      disabled={index === blocks.length - 1}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="h-5 w-5"
                      onClick={(e) => { e.stopPropagation(); onDuplicate(block.id); }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="h-5 w-5 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); onDelete(block.id); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Block content */}
                <div className="p-3">
                  <BlockPreview block={block} />
                </div>
              </div>
            </div>
          );
        })}

        {/* Final drop zone */}
        {blocks.length > 0 && (
          <div
            className={`h-1 rounded-full mx-4 transition-all ${dragOverIndex === blocks.length ? "bg-primary h-1.5 my-1" : "my-0.5"}`}
            onDragOver={(e) => handleDragOver(e, blocks.length)}
            onDragLeave={() => setDragOverIndex(null)}
            onDrop={(e) => handleDrop(e, blocks.length)}
          />
        )}
      </div>
    </div>
  );
}
