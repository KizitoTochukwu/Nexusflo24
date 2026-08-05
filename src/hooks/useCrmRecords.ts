import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { CrmRecordType } from "@/lib/crm/events";
import { logCrmActivity } from "@/lib/crm/events";

export type CrmActivity = {
  id: string;
  workspace_id: string;
  record_type: string;
  record_id: string;
  activity_type: string;
  title: string | null;
  description: string | null;
  actor_user_id: string | null;
  actor_label: string | null;
  source: string;
  status: string | null;
  related_type: string | null;
  related_id: string | null;
  meta: Record<string, unknown>;
  occurred_at: string;
};

export type CrmNote = {
  id: string;
  workspace_id: string;
  record_type: string;
  record_id: string;
  author_user_id: string | null;
  body: string;
  body_html: string | null;
  is_pinned: boolean;
  is_internal: boolean;
  edited_at: string | null;
  created_at: string;
};

export type CrmFile = {
  id: string;
  workspace_id: string;
  record_type: string;
  record_id: string;
  uploaded_by: string | null;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

export function useCrmActivities(
  recordType: CrmRecordType,
  recordId?: string,
  opts: { types?: string[]; from?: string; to?: string } = {}
) {
  return useQuery({
    queryKey: ["crm-activities", recordType, recordId, opts],
    queryFn: async () => {
      let q = supabase
        .from("crm_activities" as any)
        .select("*")
        .eq("record_type", recordType)
        .eq("record_id", recordId!)
        .order("occurred_at", { ascending: false })
        .limit(300);
      if (opts.types?.length) q = q.in("activity_type", opts.types);
      if (opts.from) q = q.gte("occurred_at", opts.from);
      if (opts.to) q = q.lte("occurred_at", `${opts.to}T23:59:59.999Z`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as CrmActivity[];
    },
    enabled: !!recordId,
  });
}

export function useCrmNotes(recordType: CrmRecordType, recordId?: string) {
  return useQuery({
    queryKey: ["crm-notes", recordType, recordId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_notes" as any)
        .select("*")
        .eq("record_type", recordType)
        .eq("record_id", recordId!)
        .is("archived_at", null)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CrmNote[];
    },
    enabled: !!recordId,
  });
}

export function useAddCrmNote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { workspaceId: string; recordType: CrmRecordType; recordId: string; body: string; isInternal?: boolean }) => {
      const { data, error } = await supabase
        .from("crm_notes" as any)
        .insert({
          workspace_id: input.workspaceId,
          record_type: input.recordType,
          record_id: input.recordId,
          author_user_id: user?.id ?? null,
          body: input.body,
          is_internal: input.isInternal ?? true,
        } as any)
        .select()
        .single();
      if (error) throw error;
      await logCrmActivity({
        workspaceId: input.workspaceId,
        recordType: input.recordType,
        recordId: input.recordId,
        activityType: "note_added",
        title: "Note added",
        description: input.body.slice(0, 140),
        actorUserId: user?.id,
        actorLabel: user?.email ?? undefined,
      });
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["crm-notes", v.recordType, v.recordId] });
      qc.invalidateQueries({ queryKey: ["crm-activities", v.recordType, v.recordId] });
      toast.success("Note added");
    },
    onError: (e: any) => toast.error(e.message || "Failed to add note"),
  });
}

export function useUpdateCrmNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; recordType: CrmRecordType; recordId: string; body?: string; is_pinned?: boolean; archive?: boolean }) => {
      const patch: Record<string, unknown> = {};
      if (input.body !== undefined) {
        patch.body = input.body;
        patch.edited_at = new Date().toISOString();
      }
      if (input.is_pinned !== undefined) patch.is_pinned = input.is_pinned;
      if (input.archive) patch.archived_at = new Date().toISOString();
      const { error } = await supabase.from("crm_notes" as any).update(patch as any).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["crm-notes", v.recordType, v.recordId] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to update note"),
  });
}

const MAX_FILE_BYTES = 20 * 1024 * 1024;

export function useCrmFiles(recordType: CrmRecordType, recordId?: string) {
  return useQuery({
    queryKey: ["crm-files", recordType, recordId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_files" as any)
        .select("*")
        .eq("record_type", recordType)
        .eq("record_id", recordId!)
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CrmFile[];
    },
    enabled: !!recordId,
  });
}

export function useUploadCrmFile() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { workspaceId: string; recordType: CrmRecordType; recordId: string; file: File }) => {
      if (input.file.size > MAX_FILE_BYTES) throw new Error("Files must be 20MB or smaller.");
      const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${input.workspaceId}/${input.recordType}/${input.recordId}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from("crm-files").upload(path, input.file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw upErr;

      const { error } = await supabase.from("crm_files" as any).insert({
        workspace_id: input.workspaceId,
        record_type: input.recordType,
        record_id: input.recordId,
        uploaded_by: user?.id ?? null,
        file_name: input.file.name,
        storage_path: path,
        mime_type: input.file.type || null,
        size_bytes: input.file.size,
      } as any);
      if (error) throw error;

      await logCrmActivity({
        workspaceId: input.workspaceId,
        recordType: input.recordType,
        recordId: input.recordId,
        activityType: "file_uploaded",
        title: "File uploaded",
        description: input.file.name,
        actorUserId: user?.id,
        actorLabel: user?.email ?? undefined,
      });
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["crm-files", v.recordType, v.recordId] });
      qc.invalidateQueries({ queryKey: ["crm-activities", v.recordType, v.recordId] });
      toast.success("File uploaded");
    },
    onError: (e: any) => toast.error(e.message || "Upload failed"),
  });
}

export async function getCrmFileUrl(storagePath: string) {
  const { data, error } = await supabase.storage.from("crm-files").createSignedUrl(storagePath, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}
