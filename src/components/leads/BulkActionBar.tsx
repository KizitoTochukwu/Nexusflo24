import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderOpen, Sparkles, Trash2, X } from "lucide-react";
import type { LeadFolder } from "@/hooks/useLeadFolders";

type Props = {
  selectedCount: number;
  folders: LeadFolder[];
  onMoveToFolder: (folderId: string) => void;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
  onBulkQualify?: () => void;
  isDeleting?: boolean;
  isMoving?: boolean;
  isQualifying?: boolean;
  qualifyProgress?: { done: number; total: number } | null;
};

const BulkActionBar = ({ selectedCount, folders, onMoveToFolder, onDeleteSelected, onClearSelection, onBulkQualify, isDeleting, isMoving, isQualifying, qualifyProgress }: Props) => {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2">
      <span className="text-sm font-medium">{selectedCount} selected</span>

      {onBulkQualify && (
        <Button size="sm" variant="outline" onClick={onBulkQualify} disabled={isQualifying}>
          <Sparkles className="mr-2 h-3.5 w-3.5" />
          {isQualifying && qualifyProgress
            ? `Qualifying ${qualifyProgress.done}/${qualifyProgress.total}…`
            : "AI Qualify"}
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" disabled={isMoving || folders.length === 0}>
            <FolderOpen className="mr-2 h-3.5 w-3.5" /> Move to Folder
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {folders.map((f) => (
            <DropdownMenuItem key={f.id} onClick={() => onMoveToFolder(f.id)}>
              <div className="mr-2 h-3 w-3 rounded-full" style={{ backgroundColor: f.color || "#888" }} />
              {f.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button size="sm" variant="destructive" onClick={onDeleteSelected} disabled={isDeleting}>
        <Trash2 className="mr-2 h-3.5 w-3.5" /> {isDeleting ? "Deleting…" : "Delete Selected"}
      </Button>

      <Button size="sm" variant="ghost" onClick={onClearSelection}>
        <X className="mr-2 h-3.5 w-3.5" /> Clear
      </Button>
    </div>
  );
};

export default BulkActionBar;
