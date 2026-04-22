// Tiny vertical-stack auto-layout used when steps are added via the picker
// or the "+" inserter on the canvas. Manual drag is preserved between sessions
// because we only re-layout when explicitly invoked.

import type { Node, Edge } from "@xyflow/react";

const COLUMN_X = 480;
const ROW_GAP = 140;
const TOP_Y = 80;

/** Walk edges from the trigger and produce a vertical layout. */
export function verticalLayout(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes;

  // Find the trigger (kind === "trigger") or the first node with no incoming edges.
  const incoming = new Map<string, number>();
  nodes.forEach((n) => incoming.set(n.id, 0));
  edges.forEach((e) => incoming.set(e.target, (incoming.get(e.target) || 0) + 1));

  const trigger =
    nodes.find((n) => (n.data as any)?.kind === "trigger") ??
    nodes.find((n) => (incoming.get(n.id) || 0) === 0) ??
    nodes[0];

  const order: string[] = [];
  const seen = new Set<string>();
  const queue: string[] = [trigger.id];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    order.push(id);
    edges
      .filter((e) => e.source === id)
      .forEach((e) => queue.push(e.target));
  }

  // Append any orphans at the bottom so nothing is lost.
  nodes.forEach((n) => {
    if (!seen.has(n.id)) order.push(n.id);
  });

  const positions = new Map<string, { x: number; y: number }>();
  order.forEach((id, idx) => {
    positions.set(id, { x: COLUMN_X, y: TOP_Y + idx * ROW_GAP });
  });

  return nodes.map((n) =>
    positions.has(n.id) ? { ...n, position: positions.get(n.id)! } : n,
  );
}

/** Compute the position of a brand-new node appended to the bottom of the stack. */
export function nextStackPosition(nodes: Node[]): { x: number; y: number } {
  if (nodes.length === 0) return { x: COLUMN_X, y: TOP_Y };
  const lastY = nodes.reduce((max, n) => Math.max(max, n.position?.y ?? 0), TOP_Y);
  return { x: COLUMN_X, y: lastY + ROW_GAP };
}
