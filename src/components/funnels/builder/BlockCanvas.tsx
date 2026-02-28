import { Block } from "./blockTypes";
import { ArrowUp, ArrowDown, Copy, Trash2, GripVertical } from "lucide-react";

interface Props {
  blocks: Block[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (index: number, direction: "up" | "down") => void;
  onDuplicate: (index: number) => void;
  onDelete: (index: number) => void;
}

function renderBlockPreview(block: Block) {
  const p = block.props;
  switch (block.type) {
    case "heading": {
      const Tag = (p.level as string) === "h1" ? "h1" : (p.level as string) === "h3" ? "h3" : "h2";
      const sizes: Record<string, string> = { h1: "text-3xl", h2: "text-2xl", h3: "text-xl" };
      return (
        <Tag className={`${sizes[p.level as string] || "text-2xl"} font-bold`} style={{ color: p.color as string, textAlign: p.align as any }}>
          {(p.text as string) || "Heading"}
        </Tag>
      );
    }
    case "text":
      return <p className="text-sm leading-relaxed" style={{ color: p.color as string, textAlign: p.align as any }}>{(p.text as string) || "Text block"}</p>;
    case "image":
      return (p.src as string) ? (
        <img src={p.src as string} alt={p.alt as string} style={{ width: p.width as string, borderRadius: p.borderRadius as string }} className="mx-auto" />
      ) : (
        <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-sm text-muted-foreground">Image placeholder</div>
      );
    case "button":
      return (
        <div style={{ textAlign: p.align as any }}>
          <span className={`inline-block rounded-lg px-6 py-3 font-medium ${p.size === "sm" ? "text-sm px-4 py-2" : "text-base"}`} style={{ backgroundColor: p.backgroundColor as string, color: p.textColor as string, borderRadius: p.borderRadius as string }}>
            {(p.text as string) || "Button"}
          </span>
        </div>
      );
    case "divider":
      return <hr style={{ borderColor: p.color as string, borderTopWidth: p.thickness as string, margin: p.margin as string }} />;
    case "spacer":
      return <div style={{ height: p.height as string }} className="flex items-center justify-center text-[10px] text-muted-foreground/40">{p.height as string}</div>;
    case "section":
      return (
        <div className="rounded-lg border border-dashed border-muted-foreground/20 p-4 text-center text-xs text-muted-foreground">
          Section Container
        </div>
      );
    case "columns2":
      return (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded border border-dashed border-muted-foreground/20 p-6 text-center text-xs text-muted-foreground">Column 1</div>
          <div className="rounded border border-dashed border-muted-foreground/20 p-6 text-center text-xs text-muted-foreground">Column 2</div>
        </div>
      );
    case "columns3":
      return (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded border border-dashed border-muted-foreground/20 p-6 text-center text-xs text-muted-foreground">Column {n}</div>
          ))}
        </div>
      );
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
    case "embed":
      return (p.src as string) ? (
        <iframe src={p.src as string} style={{ height: p.height as string }} className="w-full rounded border" title="Embed" />
      ) : (
        <div className="flex items-center justify-center rounded border-2 border-dashed border-muted-foreground/30 p-8 text-sm text-muted-foreground" style={{ height: p.height as string }}>Embed URL not set</div>
      );
    default:
      return <div className="p-2 text-xs text-muted-foreground">Unknown block: {block.type}</div>;
  }
}

export default function BlockCanvas({ blocks, selectedId, onSelect, onMove, onDuplicate, onDelete }: Props) {
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
          onClick={() => onSelect(block.id)}
          className={`group relative cursor-pointer rounded-lg border p-4 transition-all ${
            selectedId === block.id
              ? "border-accent ring-2 ring-accent/20"
              : "border-border hover:border-muted-foreground/40"
          }`}
        >
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
