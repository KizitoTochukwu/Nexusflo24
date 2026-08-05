import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileUp, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { useCrmFiles, useUploadCrmFile, getCrmFileUrl } from "@/hooks/useCrmRecords";
import type { CrmRecordType } from "@/lib/crm/events";

const formatSize = (bytes: number | null) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const CrmFilesPanel = ({
  workspaceId, recordType, recordId, canEdit,
}: { workspaceId: string; recordType: CrmRecordType; recordId: string; canEdit: boolean }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const { data: files = [], isLoading } = useCrmFiles(recordType, recordId);
  const upload = useUploadCrmFile();

  const openFile = async (path: string, id: string) => {
    setDownloading(id);
    try {
      const url = await getCrmFileUrl(path);
      if (!url) throw new Error("Could not create a download link");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e.message || "Download failed");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-4">
      {canEdit && (
        <div>
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.mutate({ workspaceId, recordType, recordId, file });
              e.target.value = "";
            }}
          />
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
            <FileUp className="mr-2 h-4 w-4" />
            {upload.isPending ? "Uploading…" : "Upload file"}
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">Up to 20MB per file. Files are private to this workspace.</p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : files.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No files attached yet.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 p-3">
              <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(f.size_bytes)} · {new Date(f.created_at).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost" size="sm"
                disabled={downloading === f.id}
                onClick={() => openFile(f.storage_path, f.id)}
              >
                <Download className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CrmFilesPanel;
