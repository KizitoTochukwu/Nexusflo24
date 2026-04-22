// HubSpot-style React Flow custom node.
// Renders the trigger / action / condition / end card variants.

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Flag, RefreshCw, GitBranch, CheckCircle2 } from "lucide-react";
import { findPaletteItem, CATEGORY_META, type NodeCategory } from "@/lib/workflows/nodeLibrary";
import type { NodeData } from "@/lib/workflows/types";

type WorkflowNodeData = NodeData & {
  /** Inspector toggles this from the right panel */
  reEnroll?: boolean;
  /** Click handler injected by the editor (open inspector) */
  onOpenDetails?: () => void;
  /** Whether this node is the currently-selected one (visual emphasis) */
  isSelected?: boolean;
};

function CardShell({
  children,
  selected,
  category,
  onClick,
}: {
  children: React.ReactNode;
  selected?: boolean;
  category?: NodeCategory;
  onClick?: () => void;
}) {
  const ring =
    selected
      ? "ring-2 ring-accent shadow-[0_8px_30px_-8px_hsl(var(--accent)/0.45)]"
      : "ring-1 ring-border shadow-[0_4px_18px_-8px_hsl(var(--primary)/0.18)]";

  return (
    <div
      onClick={onClick}
      className={`group w-[320px] cursor-pointer rounded-xl bg-card transition-all hover:-translate-y-[1px] hover:shadow-[0_10px_30px_-8px_hsl(var(--primary)/0.25)] ${ring}`}
      data-category={category}
    >
      {children}
    </div>
  );
}

/** "Trigger" header card — flag icon + "When this happens" + configuring pill. */
function TriggerCardBody({ data }: { data: WorkflowNodeData }) {
  const palette = findPaletteItem(data.subType || "");
  const isConfigured = !!data.subType;

  return (
    <>
      <div className="flex items-center gap-2 px-4 pt-4">
        <Flag className="h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
        <span className="text-sm font-semibold text-foreground">Trigger</span>
      </div>
      <div className="px-4 pb-3 pt-2">
        <p className="text-xs font-medium text-muted-foreground">When this happens</p>
        <div className="mt-2 rounded-md bg-muted/60 px-3 py-2.5">
          {isConfigured ? (
            <div className="flex items-center gap-2">
              {palette && (
                <palette.icon className="h-4 w-4 text-accent" />
              )}
              <span className="truncate text-sm font-medium text-foreground">
                {data.label || palette?.label || "Trigger"}
              </span>
            </div>
          ) : (
            <span className="text-sm italic text-muted-foreground">Configuring…</span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border/70 px-4 py-2.5 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <RefreshCw className="h-3 w-3" />
          Re-enroll {data.reEnroll ? "on" : "off"}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onOpenDetails?.();
          }}
          className="font-semibold text-accent hover:underline"
        >
          Details
        </button>
      </div>
    </>
  );
}

/** Generic action / delay / condition card body. */
function StepCardBody({ data }: { data: WorkflowNodeData }) {
  const palette = findPaletteItem(data.subType || "");
  const meta = palette ? CATEGORY_META[palette.category] : undefined;

  const headerLabel =
    data.kind === "condition"
      ? "If / then branch"
      : data.kind === "delay"
      ? "Delay"
      : data.kind === "merge"
      ? "Merge"
      : data.kind === "goal"
      ? "Goal"
      : "Action";

  const HeaderIcon =
    data.kind === "condition" ? GitBranch : data.kind === "goal" ? CheckCircle2 : Flag;

  return (
    <>
      <div className="flex items-center gap-2 px-4 pt-4">
        <HeaderIcon className="h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
        <span className="text-sm font-semibold text-foreground">{headerLabel}</span>
        {meta && (
          <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.chipClass}`}>
            {meta.label.split(" ")[0]}
          </span>
        )}
      </div>
      <div className="px-4 pb-3 pt-2">
        <div className="rounded-md bg-muted/60 px-3 py-2.5">
          <div className="flex items-center gap-2">
            {palette && (
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full ring-1 ${meta?.badgeClass ?? "bg-muted text-muted-foreground ring-border"}`}
              >
                <palette.icon className="h-3.5 w-3.5" />
              </span>
            )}
            <span className="truncate text-sm font-medium text-foreground">
              {data.label || palette?.label || "Step"}
            </span>
          </div>
          {palette?.description && (
            <p className="mt-1 line-clamp-1 pl-9 text-xs text-muted-foreground">
              {palette.description}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-end border-t border-border/70 px-4 py-2.5 text-xs">
        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onOpenDetails?.();
          }}
          className="font-semibold text-accent hover:underline"
        >
          Details
        </button>
      </div>
    </>
  );
}

function WorkflowNodeCardImpl({ data, selected }: NodeProps) {
  const d = data as unknown as WorkflowNodeData;
  const isTrigger = d.kind === "trigger";
  const isCondition = d.kind === "condition";
  const palette = findPaletteItem(d.subType || "");

  return (
    <>
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          className="!h-2 !w-2 !border-0 !bg-muted-foreground/40"
        />
      )}

      <CardShell
        selected={selected}
        category={palette?.category}
        onClick={() => d.onOpenDetails?.()}
      >
        {isTrigger ? <TriggerCardBody data={d} /> : <StepCardBody data={d} />}
      </CardShell>

      {isCondition ? (
        <>
          <Handle
            id="yes"
            type="source"
            position={Position.Bottom}
            style={{ left: "30%" }}
            className="!h-2 !w-2 !border-0 !bg-emerald-500"
          />
          <Handle
            id="no"
            type="source"
            position={Position.Bottom}
            style={{ left: "70%" }}
            className="!h-2 !w-2 !border-0 !bg-destructive"
          />
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!h-2 !w-2 !border-0 !bg-muted-foreground/40"
        />
      )}
    </>
  );
}

export const WorkflowNodeCard = memo(WorkflowNodeCardImpl);

/** "End" pill rendered as a separate React Flow node type. */
function EndPillImpl() {
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-0 !bg-muted-foreground/40"
      />
      <div className="rounded-lg bg-card px-6 py-2 text-sm font-medium text-muted-foreground ring-1 ring-border shadow-[0_2px_10px_-4px_hsl(var(--primary)/0.18)]">
        End
      </div>
    </>
  );
}

export const EndPill = memo(EndPillImpl);
