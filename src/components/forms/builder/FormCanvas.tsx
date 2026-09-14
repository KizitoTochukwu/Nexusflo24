import type { FormField, FormSchema } from "@/hooks/useForms";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, Trash2, Plus, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  schema: FormSchema;
  selectedFieldId: string | null;
  selectedStepIdx: number;
  onSelectField: (stepIdx: number, fieldId: string | null) => void;
  onSelectStep: (idx: number) => void;
  onMoveField: (stepIdx: number, fieldId: string, dir: -1 | 1) => void;
  onReorderFields?: (stepIdx: number, fromIndex: number, toIndex: number) => void;
  onDeleteField: (stepIdx: number, fieldId: string) => void;
  onAddStep: () => void;
}


const FIELD_TYPE_LABEL: Record<string, string> = {
  short_text: "Short text",
  long_text: "Long text",
  email: "Email",
  phone: "Phone",
  number: "Number",
  select: "Dropdown",
  checkbox_group: "Checkboxes",
  radio: "Radio",
  consent: "Consent",
  hidden: "Hidden",
  date: "Date",
  divider: "Divider",
  heading: "Heading",
  paragraph: "Paragraph",
  image: "Image",
  logo: "Logo",
  file: "File upload",

};

export default function FormCanvas({
  schema, selectedFieldId, selectedStepIdx, onSelectField, onSelectStep,
  onMoveField, onReorderFields, onDeleteField, onAddStep,
}: Props) {
  const steps = schema.steps ?? [];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorderFields) return;
    const fields = steps[selectedStepIdx]?.fields ?? [];
    const from = fields.findIndex((f) => f.id === active.id);
    const to = fields.findIndex((f) => f.id === over.id);
    if (from < 0 || to < 0) return;
    onReorderFields(selectedStepIdx, from, to);
  };


  return (
    <div className="space-y-4">
      {steps.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {steps.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectStep(i)}
              className={cn(
                "rounded-md border px-3 py-1 text-xs font-medium",
                i === selectedStepIdx
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted",
              )}
            >
              Step {i + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={onAddStep}
            className="rounded-md border border-dashed px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            <Plus className="mr-1 inline h-3 w-3" /> Add step
          </button>
        </div>
      )}

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        {(steps[selectedStepIdx]?.fields ?? []).length === 0 ? (
          <div className="rounded-lg border-2 border-dashed py-12 text-center text-sm text-muted-foreground">
            Add your first field from the panel on the left.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={steps[selectedStepIdx].fields.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {steps[selectedStepIdx].fields.map((f, idx, arr) => (
                  <FieldRow
                    key={f.id}
                    field={f}
                    isFirst={idx === 0}
                    isLast={idx === arr.length - 1}
                    selected={selectedFieldId === f.id}
                    onClick={() => onSelectField(selectedStepIdx, f.id)}
                    onUp={() => onMoveField(selectedStepIdx, f.id, -1)}
                    onDown={() => onMoveField(selectedStepIdx, f.id, 1)}
                    onDelete={() => onDeleteField(selectedStepIdx, f.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}


        {steps.length === 1 && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm" onClick={onAddStep}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Convert to multi-step
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function FieldRow({
  field, selected, isFirst, isLast, onClick, onUp, onDown, onDelete,
}: {
  field: FormField;
  selected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onClick: () => void;
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={onClick}
      className={cn(
        "group flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5 cursor-pointer",
        selected ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/40",
        isDragging && "z-10 opacity-80 shadow-lg",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label="Drag to reorder"
          className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{field.label || <em className="opacity-60">Untitled</em>}</p>
          <p className="text-xs text-muted-foreground">
            {FIELD_TYPE_LABEL[field.type] || field.type}
            {field.required ? " · Required" : ""}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isFirst} onClick={onUp}>
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isLast} onClick={onDown}>
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
