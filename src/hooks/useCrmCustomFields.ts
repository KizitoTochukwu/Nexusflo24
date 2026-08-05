import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CrmRecordType = "contact" | "company" | "deal";

export type CustomFieldType = "text" | "textarea" | "number" | "date" | "select" | "checkbox" | "url";

export type CrmCustomFieldDef = {
  id: string;
  workspace_id: string;
  record_type: CrmRecordType;
  field_key: string;
  label: string;
  field_type: CustomFieldType;
  options: string[];
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type CrmCustomFieldValue = {
  id: string;
  field_id: string;
  record_id: string;
  record_type: string;
  value: unknown;
};

export const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "url", label: "URL" },
];

export const slugifyFieldKey = (label: string) =>
  label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || `field_${Date.now().toString(36)}`;

export function useCustomFieldDefs(workspaceId: string, recordType?: CrmRecordType, activeOnly = false) {
  return useQuery({
    queryKey: ["crm-field-defs", workspaceId, recordType ?? "all", activeOnly],
    queryFn: async () => {
      let q = supabase
        .from("crm_custom_field_defs" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("record_type", { ascending: true })
        .order("sort_order", { ascending: true });
      if (recordType) q = q.eq("record_type", recordType);
      if (activeOnly) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return ((data ?? []) as unknown as CrmCustomFieldDef[]).map((d) => ({
        ...d,
        options: Array.isArray(d.options) ? d.options : [],
      }));
    },
    enabled: !!workspaceId,
  });
}

export function useUpsertCustomFieldDef() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CrmCustomFieldDef> & { workspace_id: string; record_type: CrmRecordType; label: string; field_type: CustomFieldType }) => {
      const payload: Record<string, unknown> = {
        workspace_id: input.workspace_id,
        record_type: input.record_type,
        field_key: input.field_key || slugifyFieldKey(input.label),
        label: input.label,
        field_type: input.field_type,
        options: input.options ?? [],
        is_required: input.is_required ?? false,
        sort_order: input.sort_order ?? 0,
        is_active: input.is_active ?? true,
      };
      if (input.id) {
        const { error } = await supabase.from("crm_custom_field_defs" as any).update(payload).eq("id", input.id);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await supabase.from("crm_custom_field_defs" as any).insert(payload).select("id").maybeSingle();
      if (error) throw error;
      return (data as any)?.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-field-defs"] });
      toast.success("Custom field saved");
    },
    onError: (e: any) =>
      toast.error(
        e?.code === "23505" ? "A field with that key already exists for this record type" : e?.message || "Could not save field",
      ),
  });
}

export function useDeleteCustomFieldDef() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_custom_field_defs" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-field-defs"] });
      qc.invalidateQueries({ queryKey: ["crm-field-values"] });
      toast.success("Custom field deleted");
    },
    onError: (e: any) => toast.error(e?.message || "Could not delete field"),
  });
}

export function useCustomFieldValues(workspaceId: string, recordType: CrmRecordType, recordId?: string) {
  return useQuery({
    queryKey: ["crm-field-values", workspaceId, recordType, recordId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_custom_field_values" as any)
        .select("id, field_id, record_id, record_type, value")
        .eq("workspace_id", workspaceId)
        .eq("record_type", recordType)
        .eq("record_id", recordId!);
      if (error) throw error;
      const map: Record<string, unknown> = {};
      for (const row of (data ?? []) as unknown as CrmCustomFieldValue[]) map[row.field_id] = row.value;
      return map;
    },
    enabled: !!workspaceId && !!recordId,
  });
}

export function useSaveCustomFieldValues() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      workspace_id: string;
      record_type: CrmRecordType;
      record_id: string;
      values: Record<string, unknown>;
    }) => {
      const rows = Object.entries(input.values).map(([field_id, value]) => ({
        workspace_id: input.workspace_id,
        record_type: input.record_type,
        record_id: input.record_id,
        field_id,
        value: value ?? null,
      }));
      if (!rows.length) return;
      const { error } = await supabase
        .from("crm_custom_field_values" as any)
        .upsert(rows, { onConflict: "field_id,record_id" });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["crm-field-values", vars.workspace_id, vars.record_type, vars.record_id] });
      toast.success("Custom fields updated");
    },
    onError: (e: any) => toast.error(e?.message || "Could not save custom fields"),
  });
}
