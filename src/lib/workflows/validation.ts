import type { WorkflowCanvasJSON } from "./types";

export interface ValidationIssue {
  nodeId?: string;
  level: "error" | "warning";
  message: string;
}

/** Returns issues that must be resolved before publishing. */
export function validateWorkflow(canvas: WorkflowCanvasJSON): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { nodes, edges } = canvas;

  if (nodes.length === 0) {
    issues.push({ level: "error", message: "Workflow is empty — add at least a trigger." });
    return issues;
  }

  const triggers = nodes.filter((n) => n.data.kind === "trigger");
  if (triggers.length === 0) {
    issues.push({ level: "error", message: "Add a trigger node — workflows must have a starting point." });
  }
  if (triggers.length > 1) {
    issues.push({ level: "warning", message: "Multiple triggers detected. Only the first will be used." });
  }

  // Orphan check: every non-trigger node must have an incoming edge
  const targets = new Set(edges.map((e) => e.target));
  for (const n of nodes) {
    if (n.data.kind !== "trigger" && !targets.has(n.id)) {
      issues.push({ nodeId: n.id, level: "error", message: `Node "${n.data.label || n.data.subType || n.id}" is disconnected.` });
    }
  }

  // Conditions need both YES and NO outputs to feel useful (warn if missing)
  for (const n of nodes) {
    if (n.data.kind === "condition") {
      const out = edges.filter((e) => e.source === n.id);
      const hasYes = out.some((e) => e.sourceHandle === "yes");
      const hasNo = out.some((e) => e.sourceHandle === "no");
      if (!hasYes) issues.push({ nodeId: n.id, level: "warning", message: `Condition "${n.data.label || "Condition"}" has no YES branch.` });
      if (!hasNo) issues.push({ nodeId: n.id, level: "warning", message: `Condition "${n.data.label || "Condition"}" has no NO branch.` });
    }
    if (n.data.kind === "action" && n.data.subType === "send_email") {
      const cfg = (n.data.config ?? {}) as Record<string, unknown>;
      if (!cfg.subject || !cfg.body) {
        issues.push({ nodeId: n.id, level: "error", message: "Send Email step is missing subject or body." });
      }
    }
    if (n.data.kind === "action" && (n.data.subType === "send_sms" || n.data.subType === "send_whatsapp")) {
      const cfg = (n.data.config ?? {}) as Record<string, unknown>;
      if (!cfg.message) {
        issues.push({ nodeId: n.id, level: "error", message: "Message body is required." });
      }
    }
    if (n.data.kind === "delay") {
      const cfg = (n.data.config ?? {}) as Record<string, unknown>;
      if (!cfg.duration && !cfg.untilWeekday && !cfg.untilProperty) {
        issues.push({ nodeId: n.id, level: "error", message: "Delay step needs a duration." });
      }
    }
  }

  return issues;
}
