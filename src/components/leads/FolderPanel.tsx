import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderOpen, Plus, MoreHorizontal, Pencil, Trash2, Inbox } from "lucide-react";
import { type LeadFolder, useCreateFolder, useRenameFolder, useDeleteFolder } from "@/hooks/useLeadFolders";

type Props = {
  folders: LeadFolder[];
  activeFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  workspaceId: string;
  totalLeadCount: number;
};

const FOLDER_COLORS = ["#D4AF37", "#3B82F6", "#EF4444", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899"];

const FolderPanel = ({ folders, activeFolderId, onSelectFolder, workspaceId, totalLeadCount }: Props) => {
  const createFolder = useCreateFolder();
  const renameFolder = useRenameFolder();
  const deleteFolder = useDeleteFolder();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(FOLDER_COLORS[0]);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createFolder.mutate({ name: newName.trim(), color: newColor, workspace_id: workspaceId }, {
      onSuccess: () => { setCreateOpen(false); setNewName(""); },
    });
  };

  const handleRename = () => {
    if (!renameId || !renameName.trim()) return;
    renameFolder.mutate({ id: renameId, name: renameName.trim() }, {
      onSuccess: () => setRenameId(null),
    });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteFolder.mutate(deleteId, {
      onSuccess: () => {
        setDeleteId(null);
        if (activeFolderId === deleteId) onSelectFolder(null);
      },
    });
  };

  return (
    <div className="w-full space-y-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Folders</span>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setCreateOpen(true)} title="New Folder">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <button
        onClick={() => onSelectFolder(null)}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${!activeFolderId ? "bg-accent/10 text-accent font-medium" : "hover:bg-muted"}`}
      >
        <Inbox className="h-4 w-4" />
        <span className="flex-1 text-left">All Leads</span>
        <span className="text-xs text-muted-foreground">{totalLeadCount}</span>
      </button>

      {folders.map((f) => (
        <div key={f.id} className="group flex items-center">
          <button
            onClick={() => onSelectFolder(f.id)}
            className={`flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${activeFolderId === f.id ? "bg-accent/10 text-accent font-medium" : "hover:bg-muted"}`}
          >
            <FolderOpen className="h-4 w-4" style={{ color: f.color || undefined }} />
            <span className="flex-1 text-left truncate">{f.name}</span>
            <span className="text-xs text-muted-foreground">{f.lead_count ?? 0}</span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setRenameId(f.id); setRenameName(f.name); }}>
                <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteId(f.id)} className="text-destructive">
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Folder</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Folder name" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Color</p>
              <div className="flex gap-2">
                {FOLDER_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`h-6 w-6 rounded-full border-2 transition-all ${newColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || createFolder.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {createFolder.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={!!renameId} onOpenChange={(v) => { if (!v) setRenameId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Rename Folder</DialogTitle></DialogHeader>
          <Input value={renameName} onChange={(e) => setRenameName(e.target.value)} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameId(null)}>Cancel</Button>
            <Button onClick={handleRename} disabled={!renameName.trim() || renameFolder.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {renameFolder.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>This will remove the folder. Leads inside it will not be deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FolderPanel;
