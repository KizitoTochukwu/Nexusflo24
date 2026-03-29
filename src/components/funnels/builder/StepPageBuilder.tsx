import { useState, useCallback, useEffect, useRef } from "react";
import { Block, BlockType, createBlock, generateId } from "./blockTypes";
import {
  findBlockById,
  updateBlockInTree,
  deleteBlockInTree,
  addBlockToTree,
  duplicateBlockInTree,
  reorderBlockInTree,
  isContainer,
  getBlockPath,
  cloneBlocks,
} from "./blockTreeUtils";
import BlockLibrary from "./BlockLibrary";
import BlockCanvas from "./BlockCanvas";
import PropertiesPanel from "./PropertiesPanel";
import { Button } from "@/components/ui/button";
import { Save, Undo2 } from "lucide-react";

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

  // Add block — if a container is selected, add inside it; otherwise add at root
  const addBlock = (type: BlockType) => {
    const b = createBlock(type);
    // Initialize children array for containers
    if (isContainer(type)) {
      b.children = [];
    }
    
    let parentId: string | null = null;
    if (selectedId) {
      const selected = findBlockById(blocks, selectedId);
      if (selected && isContainer(selected.type)) {
        parentId = selectedId;
      }
    }
    
    const next = addBlockToTree(blocks, b, parentId);
    updateBlocks(next);
    setSelectedId(b.id);
  };

  const moveBlock = (id: string, direction: "up" | "down") => {
    // Find the block's sibling list and move within it
    const findAndMove = (list: Block[]): Block[] | null => {
      const idx = list.findIndex((b) => b.id === id);
      if (idx !== -1) {
        const target = direction === "up" ? idx - 1 : idx + 1;
        if (target < 0 || target >= list.length) return null;
        const next = [...list];
        [next[idx], next[target]] = [next[target], next[idx]];
        return next;
      }
      for (let i = 0; i < list.length; i++) {
        if (list[i].children) {
          const result = findAndMove(list[i].children!);
          if (result) return list.map((b, j) => j === i ? { ...b, children: result } : b);
        }
      }
      return null;
    };
    const next = findAndMove(blocks);
    if (next) updateBlocks(next);
  };

  const reorderBlock = (fromId: string, toIndex: number, parentId: string | null) => {
    const next = reorderBlockInTree(blocks, fromId, toIndex, parentId);
    updateBlocks(next);
  };

  const duplicateBlock = (id: string) => {
    const next = duplicateBlockInTree(blocks, id);
    updateBlocks(next);
  };

  const deleteBlock = (id: string) => {
    const next = deleteBlockInTree(blocks, id);
    updateBlocks(next);
    if (selectedId === id) setSelectedId(null);
  };

  const updateBlockProps = (id: string, props: Record<string, unknown>) => {
    const next = updateBlockInTree(blocks, id, props);
    updateBlocks(next);
  };

  const selectedBlock = selectedId ? findBlockById(blocks, selectedId) : null;
  const blockPath = selectedId ? getBlockPath(blocks, selectedId) : null;

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[500px] overflow-hidden rounded-lg border bg-background">
      {/* Left: Block Library */}
      <div className="w-48 shrink-0 overflow-y-auto border-r p-3">
        <BlockLibrary onAdd={addBlock} />
      </div>

      {/* Center: Canvas */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">{stepLabel || "Page Builder"}</span>
            {blockPath && blockPath.length > 1 && (
              <span className="text-[10px] text-muted-foreground/60">
                {blockPath.join(" › ")}
              </span>
            )}
          </div>
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
              onReorder={reorderBlock}
              onDropIntoContainer={(blockId, containerId, index) => {
                // Move a block into a container
                const block = findBlockById(blocks, blockId);
                if (!block) return;
                let next = deleteBlockInTree(blocks, blockId);
                next = addBlockToTree(next, { ...block }, containerId, index);
                updateBlocks(next);
              }}
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
