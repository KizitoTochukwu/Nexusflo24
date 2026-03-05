import { useState } from "react";
import { Block, BLOCK_LABELS } from "./blockTypes";
import { ArrowUp, ArrowDown, Copy, Trash2, GripVertical } from "lucide-react";
import { parseVideoUrl, buildEmbedParams } from "./videoUtils";

interface Props {
  blocks: Block[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (index: number, direction: "up" | "down") => void;
  onDuplicate: (index: number) => void;
  onDelete: (index: number) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

function getSectionStyle(p: Record<string, unknown>): React.CSSProperties {
  const bgType = (p.backgroundType as string) || "solid";
  const style: React.CSSProperties = {
    padding: `${p.paddingTop ?? 40}px ${p.paddingRight ?? 20}px ${p.paddingBottom ?? 40}px ${p.paddingLeft ?? 20}px`,
    marginTop: `${p.marginTop ?? 0}px`,
    marginBottom: `${p.marginBottom ?? 0}px`,
    borderRadius: `${p.borderRadius ?? 0}px`,
    borderWidth: `${p.borderWidth ?? 0}px`,
    borderColor: (p.borderColor as string) || "#e5e7eb",
    borderStyle: Number(p.borderWidth ?? 0) > 0 ? "solid" : "none",
  };
  if (bgType === "solid") style.backgroundColor = (p.backgroundColor as string) || "#ffffff";
  if (bgType === "gradient") style.background = `linear-gradient(135deg, ${p.gradientFrom || "#ffffff"}, ${p.gradientTo || "#f0f0f0"})`;
  if (bgType === "image") {
    style.backgroundImage = `url(${p.backgroundImage})`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
  }
  if (p.shadow) style.boxShadow = "0 4px 20px rgba(0,0,0,0.12)";
  return style;
}

function getColumnWidths(widthStr: string): string[] {
  return (widthStr || "50/50").split("/").map((w) => `${w.trim()}%`);
}

const ASPECT_MAP: Record<string, string> = { "16:9": "56.25%", "4:3": "75%", "1:1": "100%", "21:9": "42.86%" };

function renderBlockPreview(block: Block) {
  const p = block.props;
  switch (block.type) {
    case "heading": {
      const Tag = (p.level as string) === "h1" ? "h1" : (p.level as string) === "h3" ? "h3" : "h2";
      const defaultSizes: Record<string, string> = { h1: "text-3xl", h2: "text-2xl", h3: "text-xl" };
      return (
        <Tag
          className={`${!p.fontSize ? defaultSizes[p.level as string] || "text-2xl" : ""} leading-tight`}
          style={{
            color: p.color as string,
            textAlign: p.align as any,
            fontSize: (p.fontSize as string) || undefined,
            fontWeight: (p.fontWeight as string) || "bold",
            lineHeight: (p.lineHeight as string) || undefined,
            maxWidth: (p.maxWidth as string) || undefined,
          }}
        >
          {(p.text as string) || "Heading"}
        </Tag>
      );
    }
    case "text":
      return (
        <p
          className="text-sm leading-relaxed"
          style={{
            color: p.color as string,
            textAlign: p.align as any,
            fontSize: (p.fontSize as string) || undefined,
            lineHeight: (p.lineHeight as string) || undefined,
          }}
        >
          {(p.text as string) || "Text block"}
        </p>
      );
    case "image": {
      const imgEl = (p.src as string) ? (
        <img
          src={p.src as string}
          alt={p.alt as string}
          style={{
            width: p.width as string,
            borderRadius: p.borderRadius as string,
            objectFit: (p.objectFit as any) || "cover",
            boxShadow: p.shadow ? "0 4px 12px rgba(0,0,0,0.15)" : undefined,
          }}
          className="mx-auto"
        />
      ) : (
        <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-sm text-muted-foreground">Image placeholder</div>
      );
      return <div style={{ textAlign: (p.alignment as any) || "center" }}>{imgEl}</div>;
    }
    case "button":
      return (
        <div style={{ textAlign: p.align as any }}>
          <span
            className="inline-block font-medium"
            style={{
              backgroundColor: p.backgroundColor as string,
              color: p.textColor as string,
              borderRadius: (p.borderRadius as string) || "8px",
              padding: `${p.paddingY ?? 12}px ${p.paddingX ?? 32}px`,
              fontSize: p.size === "sm" ? "14px" : "16px",
            }}
          >
            {(p.text as string) || "Button"}
          </span>
        </div>
      );
    case "divider":
      return (
        <hr style={{
          borderColor: p.color as string,
          borderTopWidth: p.thickness as string,
          borderStyle: (p.style as string) || "solid",
          width: (p.width as string) || "100%",
          margin: p.margin as string,
        }} />
      );
    case "spacer":
      return <div style={{ height: p.height as string }} className="flex items-center justify-center text-[10px] text-muted-foreground/40">{p.height as string}</div>;
    case "section":
      return (
        <div style={getSectionStyle(p)}>
          <div style={{ maxWidth: (p.maxWidth as string) || "960px", margin: "0 auto" }}>
            <div className="text-center text-xs text-muted-foreground">Section Container</div>
          </div>
        </div>
      );
    case "columns2": {
      const widths = getColumnWidths((p.columnWidths as string) || "50/50");
      const vAlign = p.verticalAlign === "center" ? "center" : p.verticalAlign === "bottom" ? "flex-end" : "flex-start";
      return (
        <div className="grid" style={{ gridTemplateColumns: widths.map((w) => `minmax(0, ${w.replace("%", "fr").replace("fr", "")}fr)`).join(" "), gap: p.gap as string, alignItems: vAlign }}>
          {widths.map((_, i) => (
            <div key={i} className="rounded border border-dashed border-muted-foreground/20 p-6 text-center text-xs text-muted-foreground">Column {i + 1}</div>
          ))}
        </div>
      );
    }
    case "columns3": {
      const widths = getColumnWidths((p.columnWidths as string) || "33/33/33");
      const vAlign = p.verticalAlign === "center" ? "center" : p.verticalAlign === "bottom" ? "flex-end" : "flex-start";
      return (
        <div className="grid" style={{ gridTemplateColumns: widths.map((w) => `minmax(0, ${w.replace("%", "fr").replace("fr", "")}fr)`).join(" "), gap: p.gap as string, alignItems: vAlign }}>
          {widths.map((_, i) => (
            <div key={i} className="rounded border border-dashed border-muted-foreground/20 p-6 text-center text-xs text-muted-foreground">Column {i + 1}</div>
          ))}
        </div>
      );
    }
    case "form": {
      const fields = (p.fields as string[]) || ["email"];
      return (
        <div className="mx-auto max-w-sm space-y-2 rounded-lg border bg-muted/30 p-4">
          {fields.map((f) => (
            <div key={f} className="rounded border bg-background px-3 py-2 text-xs text-muted-foreground">{f}</div>
          ))}
          <div className="rounded-lg px-4 py-2 text-center text-sm font-medium text-white" style={{ backgroundColor: p.buttonColor as string }}>
            {(p.buttonText as string) || "Submit"}
          </div>
        </div>
      );
    }
    case "testimonials": {
      const items = (p.items as { name: string; text: string; role: string }[]) || [];
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item, i) => (
            <div key={i} className="rounded-lg border bg-muted/20 p-4">
              <p className="mb-2 text-sm italic">"{item.text}"</p>
              <p className="text-xs font-semibold">{item.name}</p>
              <p className="text-[11px] text-muted-foreground">{item.role}</p>
            </div>
          ))}
        </div>
      );
    }
    case "pricing":
      return (
        <div className={`mx-auto max-w-xs rounded-xl border-2 p-6 text-center ${p.highlighted ? "border-accent shadow-lg" : "border-border"}`}>
          <h4 className="text-lg font-bold">{(p.title as string) || "Plan"}</h4>
          <p className="mt-1 text-3xl font-bold text-accent">{(p.price as string) || "$0"}</p>
          <ul className="mt-3 space-y-1 text-sm">
            {((p.features as string[]) || []).map((f, i) => <li key={i}>✓ {f}</li>)}
          </ul>
          <div className="mt-4 rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: p.buttonColor as string }}>
            {(p.buttonText as string) || "Choose Plan"}
          </div>
        </div>
      );
    case "faq": {
      const items = (p.items as { q: string; a: string }[]) || [];
      return (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="rounded-lg border p-3">
              <p className="text-sm font-semibold">{item.q}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>
      );
    }
    case "embed": {
      if (p.useAspectRatio && p.src) {
        const pad = ASPECT_MAP[(p.aspectRatio as string) || "16:9"] || "56.25%";
        return (
          <div className="relative w-full" style={{ paddingBottom: pad }}>
            <iframe src={p.src as string} className="absolute inset-0 h-full w-full rounded border" title="Embed" />
          </div>
        );
      }
      return (p.src as string) ? (
        <iframe src={p.src as string} style={{ height: p.height as string }} className="w-full rounded border" title="Embed" />
      ) : (
        <div className="flex items-center justify-center rounded border-2 border-dashed border-muted-foreground/30 p-8 text-sm text-muted-foreground" style={{ height: p.height as string }}>Embed URL not set</div>
      );
    }
    case "video": {
      const info = parseVideoUrl((p.src as string) || "");
      if (!info) {
        return <div className="flex items-center justify-center rounded border-2 border-dashed border-muted-foreground/30 p-8 text-sm text-muted-foreground">Video URL not set</div>;
      }
      const pad = ASPECT_MAP[(p.aspectRatio as string) || "16:9"] || "56.25%";
      if (info.provider === "mp4") {
        return (
          <div className="relative w-full" style={{ paddingBottom: pad }}>
            <video src={info.embedUrl} controls={p.controls !== false} muted={!!p.mute} loop={!!p.loop} autoPlay={!!p.autoplay} className="absolute inset-0 h-full w-full rounded object-cover" />
          </div>
        );
      }
      const params = buildEmbedParams({ autoplay: !!p.autoplay, mute: !!p.mute, loop: !!p.loop });
      return (
        <div className="relative w-full" style={{ paddingBottom: pad }}>
          <iframe src={`${info.embedUrl}${params}`} className="absolute inset-0 h-full w-full rounded" title="Video" allow="autoplay; fullscreen" allowFullScreen />
        </div>
      );
    }
    default:
      return <div className="p-2 text-xs text-muted-foreground">Unknown block: {block.type}</div>;
  }
}

export default function BlockCanvas({ blocks, selectedId, onSelect, onMove, onDuplicate, onDelete, onReorder }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== toIndex && onReorder) {
      onReorder(dragIndex, toIndex);
    }
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  if (blocks.length === 0) {
    return (
      <div className="flex h-96 flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 text-muted-foreground">
        <p className="text-sm font-medium">No blocks yet</p>
        <p className="text-xs">Click a block from the library to add it</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {blocks.map((block, i) => (
        <div
          key={block.id}
          draggable
          onDragStart={(e) => handleDragStart(e, i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDrop={(e) => handleDrop(e, i)}
          onDragEnd={handleDragEnd}
          onClick={() => onSelect(block.id)}
          className={`group relative cursor-grab rounded-lg border p-4 transition-all ${
            selectedId === block.id
              ? "border-accent ring-2 ring-accent/20"
              : "border-border hover:border-muted-foreground/40"
          } ${dragIndex === i ? "opacity-40" : ""} ${
            overIndex === i && dragIndex !== i
              ? "border-t-4 border-t-accent"
              : ""
          }`}
        >
          {/* Type badge + drag handle */}
          <span className="absolute -top-2.5 left-2 z-10 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground flex items-center gap-1">
            <GripVertical className="h-3 w-3 opacity-50" />
            {BLOCK_LABELS[block.type]?.label || block.type}
          </span>
          {/* Toolbar */}
          <div className={`absolute -top-3 right-2 z-10 flex items-center gap-0.5 rounded-md border bg-background px-1 py-0.5 shadow-sm transition-opacity ${
            selectedId === block.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}>
            <button onClick={(e) => { e.stopPropagation(); onMove(i, "up"); }} disabled={i === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
              <ArrowUp className="h-3 w-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onMove(i, "down"); }} disabled={i === blocks.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
              <ArrowDown className="h-3 w-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDuplicate(i); }} className="p-1 text-muted-foreground hover:text-foreground">
              <Copy className="h-3 w-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(i); }} className="p-1 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
          {renderBlockPreview(block)}
        </div>
      ))}
    </div>
  );
}
