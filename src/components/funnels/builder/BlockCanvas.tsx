import { useState } from "react";
import { Block, BLOCK_LABELS } from "./blockTypes";
import { isContainer } from "./blockTreeUtils";
import { ArrowUp, ArrowDown, Copy, Trash2, GripVertical, Plus } from "lucide-react";
import { parseVideoUrl, buildEmbedParams } from "./videoUtils";

interface Props {
  blocks: Block[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder?: (fromId: string, toIndex: number, parentId: string | null) => void;
  onDropIntoContainer?: (blockId: string, containerId: string, index: number) => void;
}

const ASPECT_MAP: Record<string, string> = { "16:9": "56.25%", "4:3": "75%", "1:1": "100%", "21:9": "42.86%" };

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
    position: "relative",
  };
  if (bgType === "solid") style.backgroundColor = (p.backgroundColor as string) || "#ffffff";
  if (bgType === "gradient") style.background = `linear-gradient(135deg, ${p.gradientFrom || "#ffffff"}, ${p.gradientTo || "#f0f0f0"})`;
  if (bgType === "image") {
    style.backgroundImage = `url(${p.backgroundImage})`;
    style.backgroundSize = (p.backgroundSize as string) || "cover";
    style.backgroundPosition = (p.backgroundPosition as string) || "center";
    style.backgroundRepeat = (p.backgroundRepeat as string) || "no-repeat";
  }
  const intensity = (p.shadowIntensity as string) || "medium";
  const shadowMap: Record<string, string> = {
    light: "0 2px 10px rgba(0,0,0,0.06)",
    medium: "0 4px 20px rgba(0,0,0,0.12)",
    heavy: "0 8px 40px rgba(0,0,0,0.2)",
  };
  if (p.shadow) style.boxShadow = shadowMap[intensity] || shadowMap.medium;
  return style;
}

function getColumnWidths(widthStr: string): string[] {
  return (widthStr || "50/50").split("/").map((w) => `${w.trim()}%`);
}

function renderBlockContent(block: Block) {
  const p = block.props;
  switch (block.type) {
    case "heading": {
      const Tag = (p.level as string) === "h1" ? "h1" : (p.level as string) === "h3" ? "h3" : "h2";
      const defaultSizes: Record<string, string> = { h1: "text-3xl", h2: "text-2xl", h3: "text-xl" };
      let rawHeading = (p.text as string) || "";
      // Treat empty rich-text output (e.g. "<p><br></p>", "<br>", whitespace) as empty
      const stripped = rawHeading.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
      if (!stripped) rawHeading = "Heading";
      const headingHasHtml = stripped ? /<[a-z][\s\S]*>/i.test(rawHeading) : false;
      const headingWrapStyle: React.CSSProperties = {
        maxWidth: (p.maxWidth as string) || undefined,
        margin: (p.maxWidth as string) ? (p.align === "center" ? "0 auto" : p.align === "right" ? "0 0 0 auto" : undefined) : undefined,
      };
      const headingInnerStyle: React.CSSProperties = {
        color: p.color as string,
        textAlign: p.align as any,
        fontSize: (p.fontSize as string) || undefined,
        fontWeight: (p.fontWeight as string) || "bold",
        lineHeight: (p.lineHeight as string) || undefined,
      };
      const headingClass = `${!p.fontSize ? defaultSizes[p.level as string] || "text-2xl" : ""} leading-tight`;
      if (headingHasHtml) {
        return (
          <div style={headingWrapStyle}>
            <Tag className={headingClass} style={headingInnerStyle} dangerouslySetInnerHTML={{ __html: rawHeading }} />
          </div>
        );
      }
      return (
        <div style={headingWrapStyle}>
          <Tag className={headingClass} style={headingInnerStyle}>{rawHeading}</Tag>
        </div>
      );
    }
    case "text": {
      const rawText = (p.text as string) || "Text block";
      const textHasHtml = /<[a-z][\s\S]*>/i.test(rawText);
      const textWrapStyle: React.CSSProperties = { maxWidth: (p.maxWidth as string) || undefined, margin: (p.maxWidth as string) ? (p.align === "center" ? "0 auto" : p.align === "right" ? "0 0 0 auto" : undefined) : undefined };
      const textInnerStyle: React.CSSProperties = { color: p.color as string, textAlign: p.align as any, fontSize: (p.fontSize as string) || undefined, fontWeight: (p.fontWeight as string) || undefined, lineHeight: (p.lineHeight as string) || undefined };
      if (textHasHtml) {
        const htmlContent = rawText.replace(/\n/g, "<br/>");
        return (
          <div style={textWrapStyle}>
            <div className="text-sm leading-relaxed" style={textInnerStyle} dangerouslySetInnerHTML={{ __html: htmlContent }} />
          </div>
        );
      }
      return (
        <div style={textWrapStyle}>
          <p className="text-sm leading-relaxed" style={{ ...textInnerStyle, whiteSpace: "pre-wrap" }}>
            {rawText}
          </p>
        </div>
      );
    }
    case "image": {
      const imgEl = (p.src as string) ? (
        <img src={p.src as string} alt={p.alt as string} style={{ width: p.width as string, borderRadius: p.borderRadius as string, objectFit: (p.objectFit as any) || "cover", boxShadow: p.shadow ? "0 4px 12px rgba(0,0,0,0.15)" : undefined }} className="mx-auto" />
      ) : (
        <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-sm text-muted-foreground">Image placeholder</div>
      );
      return <div style={{ textAlign: (p.alignment as any) || "center" }}>{imgEl}</div>;
    }
    case "button":
      return (
        <div style={{ textAlign: p.align as any }}>
          <span className="inline-block font-medium" style={{ backgroundColor: p.backgroundColor as string, color: p.textColor as string, borderRadius: (p.borderRadius as string) || "8px", padding: `${p.paddingY ?? 12}px ${p.paddingX ?? 32}px`, fontSize: p.size === "sm" ? "14px" : "16px" }}>
            {(p.text as string) || "Button"}
          </span>
        </div>
      );
    case "divider":
      return <hr style={{ borderColor: p.color as string, borderTopWidth: p.thickness as string, borderStyle: (p.style as string) || "solid", width: (p.width as string) || "100%", margin: p.margin as string }} />;
    case "spacer":
      return <div style={{ height: p.height as string }} className="flex items-center justify-center text-[10px] text-muted-foreground/40">{p.height as string}</div>;
    case "form": {
      const fields = (p.fields as string[]) || ["email"];
      return (
        <div className="mx-auto max-w-sm space-y-2 rounded-lg border bg-muted/30 p-4">
          {fields.map((f) => <div key={f} className="rounded border bg-background px-3 py-2 text-xs text-muted-foreground">{f}</div>)}
          <div className="rounded-lg px-4 py-2 text-center text-sm font-medium text-white" style={{ backgroundColor: p.buttonColor as string }}>{(p.buttonText as string) || "Submit"}</div>
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
          <ul className="mt-3 space-y-1 text-sm">{((p.features as string[]) || []).map((f, i) => <li key={i}>✓ {f}</li>)}</ul>
          <div className="mt-4 rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: p.buttonColor as string }}>{(p.buttonText as string) || "Choose Plan"}</div>
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
      const wrapStyle: React.CSSProperties = {
        maxWidth: (p.maxWidth as string) || undefined,
        textAlign: (p.alignment as any) || "center",
        marginTop: p.marginTop ? `${p.marginTop}px` : undefined,
        marginBottom: p.marginBottom ? `${p.marginBottom}px` : undefined,
        marginLeft: (p.alignment as string) === "center" ? "auto" : undefined,
        marginRight: (p.alignment as string) === "center" || (p.alignment as string) === "left" ? "auto" : undefined,
      };
      if (p.useAspectRatio && p.src) {
        const pad = ASPECT_MAP[(p.aspectRatio as string) || "16:9"] || "56.25%";
        return (
          <div style={wrapStyle}>
            <div className="relative w-full" style={{ paddingBottom: pad }}>
              <iframe src={p.src as string} className="absolute inset-0 h-full w-full rounded border" title="Embed" />
            </div>
          </div>
        );
      }
      return (p.src as string) ? (
        <div style={wrapStyle}><iframe src={p.src as string} style={{ height: p.height as string }} className="w-full rounded border" title="Embed" /></div>
      ) : (
        <div className="flex items-center justify-center rounded border-2 border-dashed border-muted-foreground/30 p-8 text-sm text-muted-foreground" style={{ height: p.height as string }}>Embed URL not set</div>
      );
    }
    case "video": {
      const info = parseVideoUrl((p.src as string) || "");
      if (!info) return <div className="flex items-center justify-center rounded border-2 border-dashed border-muted-foreground/30 p-8 text-sm text-muted-foreground">Video URL not set</div>;
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
    case "booking": {
      const bpId = p.booking_page_id as string;
      if (!bpId) {
        return (
          <div className="mx-auto max-w-sm rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">Select a booking page in properties →</p>
          </div>
        );
      }
      const sizeMap: Record<string, string> = { sm: "12px 24px", md: "14px 32px", lg: "16px 40px" };
      return (
        <div style={{ textAlign: (p.align as any) || "center" }}>
          <span
            className="inline-block font-semibold"
            style={{
              backgroundColor: (p.buttonColor as string) || "#D4AF37",
              color: "#ffffff",
              borderRadius: (p.borderRadius as string) || "8px",
              padding: sizeMap[(p.size as string) || "lg"] || sizeMap.lg,
            }}
          >
            {(p.buttonText as string) || "Book a Call"}
          </span>
        </div>
      );
    }
    case "cards": {
      const items = (p.items as { icon: string; title: string; description: string }[]) || [];
      const cols = (p.columns as number) || 3;
      return (
        <div className={`grid gap-4 ${cols === 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-3" : "grid-cols-1"}`}>
          {items.map((item, i) => (
            <div key={i} className="rounded-xl border p-5" style={{ backgroundColor: (p.cardBg as string) || "#ffffff", borderRadius: (p.cardBorderRadius as string) || "12px" }}>
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold" style={{ backgroundColor: (p.iconBg as string) || "#fef3c7", color: (p.iconColor as string) || "#d4af37" }}>
                {item.icon?.charAt(0) || "★"}
              </div>
              <h4 className="mb-1 text-sm font-bold" style={{ color: (p.titleColor as string) || "#0B1F3B" }}>{item.title}</h4>
              <p className="text-xs leading-relaxed" style={{ color: (p.textColor as string) || "#64748b" }}>{item.description}</p>
            </div>
          ))}
        </div>
      );
    }
    default:
      return <div className="p-2 text-xs text-muted-foreground">Unknown block: {block.type}</div>;
  }
}

/* ─── Nested Block Item ─── */
function BlockItem({
  block,
  index,
  siblingCount,
  selectedId,
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
  onReorder,
  onDropIntoContainer,
  parentId,
  dragState,
  setDragState,
}: {
  block: Block;
  index: number;
  siblingCount: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder?: Props["onReorder"];
  onDropIntoContainer?: Props["onDropIntoContainer"];
  parentId: string | null;
  dragState: { draggingId: string | null; overId: string | null };
  setDragState: (s: { draggingId: string | null; overId: string | null }) => void;
}) {
  const isContainerBlock = isContainer(block.type);
  const p = block.props;

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    setDragState({ draggingId: block.id, overId: null });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", block.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (dragState.draggingId !== block.id) {
      setDragState({ ...dragState, overId: block.id });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const fromId = e.dataTransfer.getData("text/plain");
    if (fromId && fromId !== block.id) {
      // If dropping onto a container, drop inside it
      if (isContainerBlock && onDropIntoContainer) {
        onDropIntoContainer(fromId, block.id, (block.children?.length || 0));
      } else if (onReorder) {
        onReorder(fromId, index, parentId);
      }
    }
    setDragState({ draggingId: null, overId: null });
  };

  const handleDragEnd = () => {
    setDragState({ draggingId: null, overId: null });
  };

  // Render container blocks (section, columns) with nested children
  if (isContainerBlock) {
    return (
      <div
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        onClick={(e) => { e.stopPropagation(); onSelect(block.id); }}
        className={`group/container relative cursor-grab rounded-lg border-2 transition-all ${
          selectedId === block.id ? "border-accent ring-2 ring-accent/20" : "border-dashed border-muted-foreground/20 hover:border-muted-foreground/40"
        } ${dragState.draggingId === block.id ? "opacity-40" : ""} ${
          dragState.overId === block.id && dragState.draggingId !== block.id ? "border-accent bg-accent/5" : ""
        }`}
      >
        {/* Container badge */}
        <span className="absolute -top-2.5 left-2 z-10 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground flex items-center gap-1">
          <GripVertical className="h-3 w-3 opacity-50" />
          {BLOCK_LABELS[block.type]?.label || block.type}
        </span>
        {/* Toolbar */}
        <div className={`absolute -top-3 right-2 z-10 flex items-center gap-0.5 rounded-md border bg-background px-1 py-0.5 shadow-sm transition-opacity ${
          selectedId === block.id ? "opacity-100" : "opacity-0 group-hover/container:opacity-100"
        }`}>
          <button onClick={(e) => { e.stopPropagation(); onMove(block.id, "up"); }} disabled={index === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
          <button onClick={(e) => { e.stopPropagation(); onMove(block.id, "down"); }} disabled={index === siblingCount - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDuplicate(block.id); }} className="p-1 text-muted-foreground hover:text-foreground"><Copy className="h-3 w-3" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(block.id); }} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
        </div>

        {/* Container content with nested children */}
        {block.type === "section" && (
          <div style={getSectionStyle(p)}>
            {p.backgroundType === "image" && Number(p.backgroundOverlay ?? 0) > 0 && (
              <div className="absolute inset-0 rounded-lg" style={{ backgroundColor: `${(p.overlayColor as string) || "#000000"}${Math.round((Number(p.backgroundOverlay) / 100) * 255).toString(16).padStart(2, "0")}`, borderRadius: `${p.borderRadius ?? 0}px` }} />
            )}
            <div style={{ maxWidth: (p.maxWidth as string) || "960px", margin: "0 auto", position: "relative" }}>
              <NestedDropZone
                blocks={block.children || []}
                parentId={block.id}
                selectedId={selectedId}
                onSelect={onSelect}
                onMove={onMove}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                onReorder={onReorder}
                onDropIntoContainer={onDropIntoContainer}
                dragState={dragState}
                setDragState={setDragState}
              />
            </div>
          </div>
        )}

        {(block.type === "columns2" || block.type === "columns3") && (() => {
          const widths = getColumnWidths((p.columnWidths as string) || (block.type === "columns2" ? "50/50" : "33/33/33"));
          const vAlign = p.verticalAlign === "center" ? "center" : p.verticalAlign === "bottom" ? "flex-end" : "flex-start";
          const colCount = block.type === "columns2" ? 2 : 3;
          // Split children into columns based on a simple approach: distribute sequentially
          const childrenPerCol: Block[][] = Array.from({ length: colCount }, () => []);
          (block.children || []).forEach((child, i) => {
            const colIdx = Math.min(i % colCount, colCount - 1);
            childrenPerCol[colIdx].push(child);
          });

          return (
            <div className="p-4">
              <div className="grid" style={{ gridTemplateColumns: widths.map(() => "1fr").join(" "), gap: p.gap as string, alignItems: vAlign }}>
                {widths.map((_, colIdx) => (
                  <ColumnDropZone
                    key={colIdx}
                    colIdx={colIdx}
                    blocks={childrenPerCol[colIdx] || []}
                    parentId={block.id}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    onMove={onMove}
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                    onReorder={onReorder}
                    onDropIntoContainer={onDropIntoContainer}
                    dragState={dragState}
                    setDragState={setDragState}
                  />
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  // Regular (non-container) block
  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      onClick={(e) => { e.stopPropagation(); onSelect(block.id); }}
      className={`group relative cursor-grab rounded-lg border p-4 transition-all ${
        selectedId === block.id ? "border-accent ring-2 ring-accent/20" : "border-border hover:border-muted-foreground/40"
      } ${dragState.draggingId === block.id ? "opacity-40" : ""} ${
        dragState.overId === block.id && dragState.draggingId !== block.id ? "border-t-4 border-t-accent" : ""
      }`}
    >
      <span className="absolute -top-2.5 left-2 z-10 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground flex items-center gap-1">
        <GripVertical className="h-3 w-3 opacity-50" />
        {BLOCK_LABELS[block.type]?.label || block.type}
      </span>
      <div className={`absolute -top-3 right-2 z-10 flex items-center gap-0.5 rounded-md border bg-background px-1 py-0.5 shadow-sm transition-opacity ${
        selectedId === block.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      }`}>
        <button onClick={(e) => { e.stopPropagation(); onMove(block.id, "up"); }} disabled={index === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
        <button onClick={(e) => { e.stopPropagation(); onMove(block.id, "down"); }} disabled={index === siblingCount - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
        <button onClick={(e) => { e.stopPropagation(); onDuplicate(block.id); }} className="p-1 text-muted-foreground hover:text-foreground"><Copy className="h-3 w-3" /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(block.id); }} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
      </div>
      {renderBlockContent(block)}
    </div>
  );
}

/* ─── Nested Drop Zone ─── */
function NestedDropZone({
  blocks,
  parentId,
  selectedId,
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
  onReorder,
  onDropIntoContainer,
  dragState,
  setDragState,
}: {
  blocks: Block[];
  parentId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder?: Props["onReorder"];
  onDropIntoContainer?: Props["onDropIntoContainer"];
  dragState: { draggingId: string | null; overId: string | null };
  setDragState: (s: { draggingId: string | null; overId: string | null }) => void;
}) {
  const handleDropOnEmpty = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const fromId = e.dataTransfer.getData("text/plain");
    if (fromId && onDropIntoContainer) {
      onDropIntoContainer(fromId, parentId, blocks.length);
    }
    setDragState({ draggingId: null, overId: null });
  };

  if (blocks.length === 0) {
    return (
      <div
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={handleDropOnEmpty}
        className="flex min-h-[60px] items-center justify-center rounded border-2 border-dashed border-muted-foreground/15 text-[11px] text-muted-foreground/50"
      >
        <Plus className="mr-1 h-3 w-3" /> Drop blocks here
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {blocks.map((block, i) => (
        <BlockItem
          key={block.id}
          block={block}
          index={i}
          siblingCount={blocks.length}
          selectedId={selectedId}
          onSelect={onSelect}
          onMove={onMove}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onReorder={onReorder}
          onDropIntoContainer={onDropIntoContainer}
          parentId={parentId}
          dragState={dragState}
          setDragState={setDragState}
        />
      ))}
    </div>
  );
}

/* ─── Column Drop Zone ─── */
function ColumnDropZone({
  colIdx,
  blocks,
  parentId,
  selectedId,
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
  onReorder,
  onDropIntoContainer,
  dragState,
  setDragState,
}: {
  colIdx: number;
  blocks: Block[];
  parentId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder?: Props["onReorder"];
  onDropIntoContainer?: Props["onDropIntoContainer"];
  dragState: { draggingId: string | null; overId: string | null };
  setDragState: (s: { draggingId: string | null; overId: string | null }) => void;
}) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const fromId = e.dataTransfer.getData("text/plain");
    if (fromId && onDropIntoContainer) {
      onDropIntoContainer(fromId, parentId, blocks.length);
    }
    setDragState({ draggingId: null, overId: null });
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={handleDrop}
      className="min-h-[60px] rounded border border-dashed border-muted-foreground/20 p-2"
    >
      {blocks.length === 0 ? (
        <div className="flex h-full min-h-[48px] items-center justify-center text-[10px] text-muted-foreground/40">
          Col {colIdx + 1}
        </div>
      ) : (
        <div className="space-y-2">
          {blocks.map((block, i) => (
            <BlockItem
              key={block.id}
              block={block}
              index={i}
              siblingCount={blocks.length}
              selectedId={selectedId}
              onSelect={onSelect}
              onMove={onMove}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onReorder={onReorder}
              onDropIntoContainer={onDropIntoContainer}
              parentId={parentId}
              dragState={dragState}
              setDragState={setDragState}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Canvas ─── */
export default function BlockCanvas({ blocks, selectedId, onSelect, onMove, onDuplicate, onDelete, onReorder, onDropIntoContainer }: Props) {
  const [dragState, setDragState] = useState<{ draggingId: string | null; overId: string | null }>({ draggingId: null, overId: null });

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
        <BlockItem
          key={block.id}
          block={block}
          index={i}
          siblingCount={blocks.length}
          selectedId={selectedId}
          onSelect={onSelect}
          onMove={onMove}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onReorder={onReorder}
          onDropIntoContainer={onDropIntoContainer}
          parentId={null}
          dragState={dragState}
          setDragState={setDragState}
        />
      ))}
    </div>
  );
}
