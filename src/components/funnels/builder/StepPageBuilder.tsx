import { useState, useCallback, useEffect } from "react";
import { Block, BlockType, createBlock, generateId } from "./blockTypes";
import BlockLibrary from "./BlockLibrary";
import BlockCanvas from "./BlockCanvas";
import PropertiesPanel from "./PropertiesPanel";
import { Button } from "@/components/ui/button";
import { Save, Undo2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  initialBlocks: Block[];
  onSave: (blocks: Block[]) => void;
  saving?: boolean;
  stepLabel?: string;
}

export default function StepPageBuilder({ initialBlocks, onSave, saving, stepLabel }: Props) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<Block[][]>([initialBlocks]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Sync when initialBlocks change (step switch)
  useEffect(() => {
    setBlocks(initialBlocks);
    setHistory([initialBlocks]);
    setHistoryIndex(0);
    setSelectedId(null);
  }, [initialBlocks]);

  const pushHistory = useCallback((next: Block[]) => {
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), next]);
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const updateBlocks = useCallback((next: Block[]) => {
    setBlocks(next);
    pushHistory(next);
  }, [pushHistory]);

  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setBlocks(prev);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const addBlock = (type: BlockType) => {
    const b = createBlock(type);
    const next = [...blocks, b];
    updateBlocks(next);
    setSelectedId(b.id);
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    const next = [...blocks];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    updateBlocks(next);
  };

  const reorderBlock = (fromIndex: number, toIndex: number) => {
    const next = [...blocks];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    updateBlocks(next);
  };

  const duplicateBlock = (index: number) => {
    const original = blocks[index];
    const copy: Block = { ...original, id: generateId(), props: { ...original.props } };
    const next = [...blocks];
    next.splice(index + 1, 0, copy);
    updateBlocks(next);
  };

  const deleteBlock = (index: number) => {
    const id = blocks[index].id;
    const next = blocks.filter((_, i) => i !== index);
    updateBlocks(next);
    if (selectedId === id) setSelectedId(null);
  };

  const updateBlockProps = (id: string, props: Record<string, unknown>) => {
    const next = blocks.map((b) => (b.id === id ? { ...b, props } : b));
    updateBlocks(next);
  };

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[500px] overflow-hidden rounded-lg border bg-background">
      {/* Left: Block Library */}
      <div className="w-48 shrink-0 overflow-y-auto border-r p-3">
        <BlockLibrary onAdd={addBlock} />
      </div>

      {/* Center: Canvas */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <span className="text-sm font-medium text-muted-foreground">{stepLabel || "Page Builder"}</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={undo} disabled={historyIndex === 0}>
              <Undo2 className="mr-1 h-4 w-4" /> Undo
            </Button>
            <Button size="sm" onClick={() => onSave(blocks)} disabled={saving}>
              <Save className="mr-1 h-4 w-4" /> {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl">
            <BlockCanvas
              blocks={blocks}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onMove={moveBlock}
              onDuplicate={duplicateBlock}
              onDelete={deleteBlock}
            />
          </div>
        </div>
      </div>

      {/* Right: Properties */}
      <div className="w-64 shrink-0 overflow-y-auto border-l p-3">
        <PropertiesPanel block={selectedBlock} onChange={updateBlockProps} />
      </div>
    </div>
  );
}
