import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Save, Star, Trash2 } from "lucide-react";
import {
  useSavedViews, useCreateSavedView, useDeleteSavedView, type CrmSavedView,
} from "@/hooks/useCrmSavedViews";

type Props = {
  workspaceId: string;
  recordType: "contact" | "company" | "deal";
  /** Current filter state that gets stored when the user saves a view. */
  filters: Record<string, unknown>;
  columns?: string[];
  onApplyView: (view: CrmSavedView) => void;
};

/** Reusable "Views" menu + save popover shared by Contacts, Companies and Deals. */
const SavedViewsMenu = ({ workspaceId, recordType, filters, columns = [], onApplyView }: Props) => {
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [shared, setShared] = useState(false);

  const { data: views = [] } = useSavedViews(workspaceId, recordType);
  const createView = useCreateSavedView();
  const deleteView = useDeleteSavedView();

  const save = () => {
    if (!name.trim()) return;
    createView.mutate(
      {
        workspace_id: workspaceId,
        record_type: recordType,
        name: name.trim(),
        filters,
        columns,
        visibility: shared ? "shared" : "private",
      },
      {
        onSuccess: () => {
          setName("");
          setShared(false);
          setSaveOpen(false);
        },
      },
    );
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Star className="mr-2 h-4 w-4" /> Views
            {views.length > 0 && <span className="ml-1 text-xs text-muted-foreground">({views.length})</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Saved views</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {views.length === 0 && (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              Save your current filters to reuse them later.
            </p>
          )}
          {views.map((v) => (
            <DropdownMenuItem
              key={v.id}
              className="flex items-center justify-between gap-2"
              onSelect={(e) => { e.preventDefault(); onApplyView(v); }}
            >
              <span className="truncate">{v.name}</span>
              <button
                aria-label={`Delete view ${v.name}`}
                className="rounded p-1 text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); deleteView.mutate(v.id); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover open={saveOpen} onOpenChange={setSaveOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Save className="mr-2 h-4 w-4" /> Save view
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-3">
          <div>
            <Label className="text-xs">View name</Label>
            <Input
              className="h-9"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. High value, this quarter"
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Share with team</Label>
            <Switch checked={shared} onCheckedChange={setShared} />
          </div>
          <Button size="sm" className="w-full" onClick={save} disabled={!name.trim() || createView.isPending}>
            {createView.isPending ? "Saving…" : "Save view"}
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default SavedViewsMenu;
