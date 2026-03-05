import { Block, generateId } from "./blockTypes";

/** Find a block by ID anywhere in the tree */
export function findBlockById(blocks: Block[], id: string): Block | null {
  for (const b of blocks) {
    if (b.id === id) return b;
    if (b.children) {
      const found = findBlockById(b.children, id);
      if (found) return found;
    }
  }
  return null;
}

/** Find parent block and index of a child */
export function findParentAndIndex(
  blocks: Block[],
  id: string
): { parent: Block[]; index: number; parentBlock: Block | null } | null {
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].id === id) return { parent: blocks, index: i, parentBlock: null };
    if (blocks[i].children) {
      const found = findParentAndIndex(blocks[i].children!, id);
      if (found) return { ...found, parentBlock: found.parentBlock ?? blocks[i] };
    }
  }
  return null;
}

/** Deep clone blocks */
export function cloneBlocks(blocks: Block[]): Block[] {
  return JSON.parse(JSON.stringify(blocks));
}

/** Update a block's props anywhere in the tree */
export function updateBlockInTree(blocks: Block[], id: string, props: Record<string, unknown>): Block[] {
  return blocks.map((b) => {
    if (b.id === id) return { ...b, props };
    if (b.children) return { ...b, children: updateBlockInTree(b.children, id, props) };
    return b;
  });
}

/** Delete a block anywhere in the tree */
export function deleteBlockInTree(blocks: Block[], id: string): Block[] {
  return blocks
    .filter((b) => b.id !== id)
    .map((b) => {
      if (b.children) return { ...b, children: deleteBlockInTree(b.children, id) };
      return b;
    });
}

/** Add a block as a child of a container, or at root level */
export function addBlockToTree(blocks: Block[], block: Block, parentId: string | null, index?: number): Block[] {
  if (!parentId) {
    const next = [...blocks];
    if (index !== undefined) next.splice(index, 0, block);
    else next.push(block);
    return next;
  }
  return blocks.map((b) => {
    if (b.id === parentId) {
      const children = [...(b.children || [])];
      if (index !== undefined) children.splice(index, 0, block);
      else children.push(block);
      return { ...b, children };
    }
    if (b.children) return { ...b, children: addBlockToTree(b.children, block, parentId, index) };
    return b;
  });
}

/** Move a block within its sibling list */
export function moveBlockInTree(blocks: Block[], id: string, direction: "up" | "down"): Block[] {
  return blocks.map((b) => {
    const idx = blocks.indexOf(b);
    // Check if id is a direct child
    if (b.id === id) {
      // handled at parent level
      return b;
    }
    if (b.children) {
      const childIdx = b.children.findIndex((c) => c.id === id);
      if (childIdx !== -1) {
        const target = direction === "up" ? childIdx - 1 : childIdx + 1;
        if (target < 0 || target >= b.children.length) return b;
        const next = [...b.children];
        [next[childIdx], next[target]] = [next[target], next[childIdx]];
        return { ...b, children: next };
      }
      return { ...b, children: moveBlockInTree(b.children, id, direction) };
    }
    return b;
  });
}

/** Duplicate a block (with new IDs for it and all children) */
export function duplicateBlockInTree(blocks: Block[], id: string): Block[] {
  const result: Block[] = [];
  for (const b of blocks) {
    result.push(b.children ? { ...b, children: duplicateBlockInTree(b.children, id) } : b);
    if (b.id === id) {
      result.push(deepCloneWithNewIds(b));
    }
  }
  return result;
}

function deepCloneWithNewIds(block: Block): Block {
  return {
    ...block,
    id: generateId(),
    props: { ...block.props },
    children: block.children?.map(deepCloneWithNewIds),
  };
}

/** Reorder a block within its sibling list */
export function reorderBlockInTree(blocks: Block[], fromId: string, toIndex: number, parentId: string | null): Block[] {
  if (!parentId) {
    const fromIdx = blocks.findIndex((b) => b.id === fromId);
    if (fromIdx === -1) return blocks;
    const next = [...blocks];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIndex, 0, moved);
    return next;
  }
  return blocks.map((b) => {
    if (b.id === parentId && b.children) {
      const fromIdx = b.children.findIndex((c) => c.id === fromId);
      if (fromIdx === -1) return b;
      const next = [...b.children];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIndex, 0, moved);
      return { ...b, children: next };
    }
    if (b.children) return { ...b, children: reorderBlockInTree(b.children, fromId, toIndex, parentId) };
    return b;
  });
}

/** Check if a block type is a container */
export function isContainer(type: string): boolean {
  return type === "section" || type === "columns2" || type === "columns3";
}

/** Get breadcrumb path to a block */
export function getBlockPath(blocks: Block[], id: string, path: string[] = []): string[] | null {
  for (const b of blocks) {
    if (b.id === id) return [...path, b.type];
    if (b.children) {
      const found = getBlockPath(b.children, id, [...path, b.type]);
      if (found) return found;
    }
  }
  return null;
}
