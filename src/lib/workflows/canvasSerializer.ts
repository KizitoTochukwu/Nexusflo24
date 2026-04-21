// Converts React Flow canvas <-> normalized workflow_nodes rows.
// Used both client-side (preview) and by edge functions when persisting.
import type { WorkflowCanvasJSON } from "./types";

export interface NormalizedNodeRow {
  id: string;
  node_type: string;
  sub_type: string | null;
  config: Record<string, unknown>;
  parent_node_id: string | null;
  branch: "main" | "yes" | "no";
  step_order: number;
}

export function normalizeCanvas(canvas: WorkflowCanvasJSON): NormalizedNodeRow[] {
  const { nodes, edges } = canvas;
  const rows: NormalizedNodeRow[] = [];
  // Map node id -> incoming edge (parent + branch)
  const incoming = new Map<string, { parent: string; branch: "main" | "yes" | "no" }>();
  for (const e of edges) {
    const branch: "main" | "yes" | "no" =
      e.sourceHandle === "yes" ? "yes" : e.sourceHandle === "no" ? "no" : "main";
    incoming.set(e.target, { parent: e.source, branch });
  }
  let order = 0;
  for (const n of nodes) {
    const inc = incoming.get(n.id);
    rows.push({
      id: n.id,
      node_type: n.data.kind ?? n.type ?? "action",
      sub_type: n.data.subType ?? null,
      config: { ...(n.data.config ?? {}), criteria: n.data.criteria, label: n.data.label },
      parent_node_id: inc?.parent ?? null,
      branch: inc?.branch ?? "main",
      step_order: order++,
    });
  }
  return rows;
}

export function findRootNodeId(canvas: WorkflowCanvasJSON): string | null {
  const targets = new Set(canvas.edges.map((e) => e.target));
  const root = canvas.nodes.find((n) => !targets.has(n.id) && n.data.kind === "trigger");
  return root?.id ?? canvas.nodes[0]?.id ?? null;
}
