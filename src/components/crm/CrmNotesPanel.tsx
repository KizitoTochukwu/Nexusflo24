import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Pin, PinOff, Trash2 } from "lucide-react";
import { useCrmNotes, useAddCrmNote, useUpdateCrmNote } from "@/hooks/useCrmRecords";
import type { CrmRecordType } from "@/lib/crm/events";

const CrmNotesPanel = ({
  workspaceId, recordType, recordId, canEdit,
}: { workspaceId: string; recordType: CrmRecordType; recordId: string; canEdit: boolean }) => {
  const [body, setBody] = useState("");
  const { data: notes = [], isLoading } = useCrmNotes(recordType, recordId);
  const add = useAddCrmNote();
  const update = useUpdateCrmNote();

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="space-y-2">
          <Textarea
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add an internal note…"
            aria-label="New note"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={!body.trim() || add.isPending}
              onClick={async () => {
                await add.mutateAsync({ workspaceId, recordType, recordId, body: body.trim() });
                setBody("");
              }}
            >
              {add.isPending ? "Saving…" : "Add note"}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : notes.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No notes yet.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border bg-background p-3">
              <div className="flex items-start gap-2">
                <p className="flex-1 whitespace-pre-wrap text-sm">{n.body}</p>
                {canEdit && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      aria-label={n.is_pinned ? "Unpin note" : "Pin note"}
                      onClick={() => update.mutate({ id: n.id, recordType, recordId, is_pinned: !n.is_pinned })}
                    >
                      {n.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      aria-label="Archive note"
                      onClick={() => update.mutate({ id: n.id, recordType, recordId, archive: true })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                {n.is_pinned && <Badge variant="secondary" className="text-[10px]">Pinned</Badge>}
                <span>{new Date(n.created_at).toLocaleString()}</span>
                {n.edited_at && <span>· edited</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CrmNotesPanel;
