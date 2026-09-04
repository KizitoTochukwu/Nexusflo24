import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Archive, TagIcon, Trash2, UserCog, Workflow, X } from "lucide-react";
import { LIFECYCLE_STAGES } from "@/lib/crm/constants";

type Member = { user_id: string; profile?: { full_name?: string | null; email?: string | null } | null };

type Props = {
  selectedCount: number;
  members: Member[];
  canManage: boolean;
  busy?: boolean;
  onAssignOwner: (userId: string | null) => void;
  onSetStage: (stage: string) => void;
  onAddTag: (tag: string) => void;
  onArchive: () => void;
  onDelete: () => void;
  onClear: () => void;
};

const ContactBulkBar = ({ selectedCount, members, canManage, busy, onAssignOwner, onSetStage, onAddTag, onArchive, onDelete, onClear }: Props) => {
  const [tag, setTag] = useState("");
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (selectedCount === 0) return null;

  const label = (m: Member) => m.profile?.full_name || m.profile?.email || m.user_id.slice(0, 8);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2">
      <span className="text-sm font-medium">{selectedCount} selected</span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" disabled={busy}>
            <UserCog className="mr-2 h-3.5 w-3.5" /> Assign owner
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel className="text-xs text-muted-foreground">Set owner</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onAssignOwner(null)}>Unassigned</DropdownMenuItem>
          {members.map((m) => (
            <DropdownMenuItem key={m.user_id} onClick={() => onAssignOwner(m.user_id)}>{label(m)}</DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" disabled={busy}>
            <Workflow className="mr-2 h-3.5 w-3.5" /> Lifecycle stage
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {LIFECYCLE_STAGES.map((s) => (
            <DropdownMenuItem key={s.value} onClick={() => onSetStage(s.value)}>{s.label}</DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center gap-1">
        <Input
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="Add tag"
          className="h-8 w-32"
          onKeyDown={(e) => {
            if (e.key === "Enter" && tag.trim()) { onAddTag(tag.trim()); setTag(""); }
          }}
        />
        <Button size="sm" variant="outline" disabled={!tag.trim() || busy} onClick={() => { onAddTag(tag.trim()); setTag(""); }}>
          <TagIcon className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Button size="sm" variant="outline" disabled={busy || !canManage} onClick={() => setConfirmArchive(true)}>
        <Archive className="mr-2 h-3.5 w-3.5" /> Archive
      </Button>

      <Button size="sm" variant="destructive" disabled={busy || !canManage} onClick={() => setConfirmDelete(true)}>
        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
      </Button>

      <Button size="sm" variant="ghost" onClick={onClear}>
        <X className="mr-2 h-3.5 w-3.5" /> Clear
      </Button>

      <AlertDialog open={confirmArchive} onOpenChange={setConfirmArchive}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {selectedCount} contact{selectedCount === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Archived contacts are hidden from the default list but keep their full history and can be restored
              at any time using the "Include archived" filter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onArchive}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} contact{selectedCount === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the selected contact{selectedCount === 1 ? "" : "s"} and their details.
              This cannot be undone — unlike Archive, deleted contacts cannot be restored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Delete permanently</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ContactBulkBar;
