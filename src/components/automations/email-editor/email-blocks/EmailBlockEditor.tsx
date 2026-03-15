import { useState, useCallback, useEffect, useRef } from "react";
import { EmailBlock, createEmailBlock } from "./emailBlockTypes";
import { blocksToHtml, parseBlocksFromMessage } from "./emailBlockSerializer";
import EmailBlockLibrary from "./EmailBlockLibrary";
import EmailBlockCanvas from "./EmailBlockCanvas";
import EmailBlockProperties from "./EmailBlockProperties";

interface EmailBlockEditorProps {
  message: string;
  onMessageChange: (message: string) => void;
}

export default function EmailBlockEditor({ message, onMessageChange }: EmailBlockEditorProps) {
  const [blocks, setBlocks] = useState<EmailBlock[]>(() => {
    const parsed = parseBlocksFromMessage(message);
    if (parsed) return parsed;
    // Legacy: convert plain text to a single text block
    if (message.trim()) {
      return [{ ...createEmailBlock("text"), props: { ...createEmailBlock("text").props, content: message } as any }];
    }
    return [];
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isInternalUpdate = useRef(false);

  // Sync blocks → message (serialized JSON)
  const syncToMessage = useCallback((newBlocks: EmailBlock[]) => {
    isInternalUpdate.current = true;
    onMessageChange(JSON.stringify(newBlocks));
  }, [onMessageChange]);

  // If message changes externally, sync back
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const parsed = parseBlocksFromMessage(message);
    if (parsed) setBlocks(parsed);
  }, [message]);

  const updateBlocks = useCallback((newBlocks: EmailBlock[]) => {
    setBlocks(newBlocks);
    syncToMessage(newBlocks);
  }, [syncToMessage]);

  const addBlock = useCallback((block: EmailBlock, index?: number) => {
    setBlocks((prev) => {
      const idx = index ?? prev.length;
      const newBlocks = [...prev.slice(0, idx), block, ...prev.slice(idx)];
      syncToMessage(newBlocks);
      return newBlocks;
    });
    setSelectedId(block.id);
  }, [syncToMessage]);

  const addBlockAtIndex = useCallback((block: EmailBlock, index: number) => {
    addBlock(block, index);
  }, [addBlock]);

  const duplicateBlock = useCallback((id: string) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx === -1) return prev;
      const orig = prev[idx];
      const clone: EmailBlock = {
        ...orig,
        id: `blk_${Date.now()}_dup`,
        props: JSON.parse(JSON.stringify(orig.props)),
      };
      const newBlocks = [...prev.slice(0, idx + 1), clone, ...prev.slice(idx + 1)];
      syncToMessage(newBlocks);
      setSelectedId(clone.id);
      return newBlocks;
    });
  }, [syncToMessage]);

  const deleteBlock = useCallback((id: string) => {
    setBlocks((prev) => {
      const newBlocks = prev.filter((b) => b.id !== id);
      syncToMessage(newBlocks);
      if (selectedId === id) setSelectedId(null);
      return newBlocks;
    });
  }, [syncToMessage, selectedId]);

  const updateBlockProps = useCallback((id: string, props: EmailBlock["props"]) => {
    setBlocks((prev) => {
      const newBlocks = prev.map((b) => (b.id === id ? { ...b, props } : b));
      syncToMessage(newBlocks);
      return newBlocks;
    });
  }, [syncToMessage]);

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;

  return (
    <div className="flex border border-border rounded-lg bg-background overflow-hidden" style={{ minHeight: "420px" }}>
      <EmailBlockLibrary onAddBlock={(block) => addBlock(block)} />
      <EmailBlockCanvas
        blocks={blocks}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onReorder={updateBlocks}
        onDuplicate={duplicateBlock}
        onDelete={deleteBlock}
        onAddBlock={addBlockAtIndex}
      />
      <EmailBlockProperties
        block={selectedBlock}
        onChange={updateBlockProps}
      />
    </div>
  );
}
