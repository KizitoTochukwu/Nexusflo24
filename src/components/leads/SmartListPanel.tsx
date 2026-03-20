import { useState } from "react";
import { Bookmark, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSmartLists, useCreateSmartList, useDeleteSmartList, type SmartList } from "@/hooks/useSmartLists";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface SmartListPanelProps {
  workspaceId: string;
  currentFilters: Record<string, string>;
  onApply: (filters: Record<string, string>) => void;
}

const ICONS = ["📋", "🔥", "❄️", "⭐", "🎯", "📈", "💎", "🚀"];

export default function SmartListPanel({ workspaceId, currentFilters, onApply }: SmartListPanelProps) {
  const { data: lists = [], isLoading } = useSmartLists(workspaceId);
  const createList = useCreateSmartList();
  const deleteList = useDeleteSmartList();
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📋");

  const hasActiveFilters = Object.values(currentFilters).some((v) => v && v !== "All");

  const handleSave = () => {
    if (!name.trim()) return;
    const filters: Record<string, string> = {};
    for (const [k, v] of Object.entries(currentFilters)) {
      if (v && v !== "All") filters[k] = v;
    }
    createList.mutate(
      { workspace_id: workspaceId, name: name.trim(), icon, filters },
      { onSuccess: () => { setSaveOpen(false); setName(""); } }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Bookmark className="h-3 w-3" /> Smart Lists
        </h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-accent"
            onClick={() => setSaveOpen(true)}
          >
            <Plus className="h-3 w-3 mr-0.5" /> Save
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : lists.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">
          Apply filters and click "Save" to create a smart list.
        </p>
      ) : (
        <div className="space-y-0.5">
          {lists.map((list) => (
            <div
              key={list.id}
              className="group flex items-center justify-between rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-muted transition-colors"
              onClick={() => onApply(list.filters)}
            >
              <span className="flex items-center gap-1.5 truncate">
                <span>{list.icon}</span>
                <span className="truncate">{list.name}</span>
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteList.mutate(list.id); }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Save Smart List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Hot leads from Facebook"
                maxLength={50}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Icon</label>
              <div className="flex gap-1.5 flex-wrap">
                {ICONS.map((ic) => (
                  <button
                    key={ic}
                    onClick={() => setIcon(ic)}
                    className={`rounded-md px-2 py-1 text-lg transition-colors ${
                      icon === ic ? "bg-accent/20 ring-1 ring-accent" : "hover:bg-muted"
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-md bg-muted/50 p-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">Active filters:</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(currentFilters)
                  .filter(([, v]) => v && v !== "All")
                  .map(([k, v]) => (
                    <span key={k} className="rounded bg-accent/10 px-1.5 py-0.5 text-[11px] text-accent font-medium">
                      {k}: {v}
                    </span>
                  ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name.trim() || createList.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {createList.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Save List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
