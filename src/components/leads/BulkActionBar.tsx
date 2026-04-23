import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderInput, FolderMinus, FolderOpen, Sparkles, Trash2, X } from "lucide-react";
import type { LeadFolder } from "@/hooks/useLeadFolders";

type Props = {
  selectedCount: number;
  folders: LeadFolder[];
  activeFolderId?: string | null;
  onMoveToFolder: (folderId: string) => void;
  onMoveBetweenFolders?: (toFolderId: string) => void;
  onRemoveFromFolder?: () => void;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
  onBulkQualify?: () => void;
  isDeleting?: boolean;
  isMoving?: boolean;
  isRemoving?: boolean;
  isQualifying?: boolean;
  qualifyProgress?: { done: number; total: number } | null;
};

const BulkActionBar = ({
  selectedCount, folders, activeFolderId,
  onMoveToFolder, onMoveBetweenFolders, onRemoveFromFolder,
  onDeleteSelected, onClearSelection, onBulkQualify,
  isDeleting, isMoving, isRemoving, isQualifying, qualifyProgress,
}: Props) => {
  if (selectedCount === 0) return null;

  const activeFolder = folders.find((f) => f.id === activeFolderId);
  const otherFolders = folders.filter((f) => f.id !== activeFolderId);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2">
      <span className="text-sm font-medium">{selectedCount} selected</span>

      {onBulkQualify && (
        <Button size="sm" variant="outline" onClick={onBulkQualify} disabled={isQualifying}>
          <Sparkles className="mr-2 h-3.5 w-3.5" />
          {isQualifying && qualifyProgress
            ? `Qualifying ${qualifyProgress.done}/${qualifyProgress.total}…`
            : "AI Qualify"}
        </Button>
      )}

      {/* Add to folder (always available) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" disabled={isMoving || folders.length === 0}>
            <FolderOpen className="mr-2 h-3.5 w-3.5" /> Add to Folder
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

      {/* Move between folders (only when viewing a folder) */}
      {activeFolder && onMoveBetweenFolders && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" disabled={isMoving || otherFolders.length === 0}>
              <FolderInput className="mr-2 h-3.5 w-3.5" /> Move from "{activeFolder.name}"
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {otherFolders.length === 0 ? (
              <DropdownMenuItem disabled>No other folders</DropdownMenuItem>
            ) : (
              otherFolders.map((f) => (
                <DropdownMenuItem key={f.id} onClick={() => onMoveBetweenFolders(f.id)}>
                  <div className="mr-2 h-3 w-3 rounded-full" style={{ backgroundColor: f.color || "#888" }} />
                  {f.name}
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onRemoveFromFolder} className="text-destructive">
              <FolderMinus className="mr-2 h-3.5 w-3.5" /> Remove from folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Standalone remove (when in a folder, no move target) */}
      {activeFolder && !onMoveBetweenFolders && onRemoveFromFolder && (
        <Button size="sm" variant="outline" onClick={onRemoveFromFolder} disabled={isRemoving}>
          <FolderMinus className="mr-2 h-3.5 w-3.5" /> Remove from folder
        </Button>
      )}

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
