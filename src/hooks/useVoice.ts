import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VOICE_STARTER_ENTITLEMENT } from "@/lib/voice/constants";

export type VoiceAssistant = {
  id: string;
  workspace_id: string;
  name: string;
  status: string;
  greeting: string | null;
  persona: string | null;
  language: string;
  timezone: string;
  tags: string[];
  recording_enabled: boolean;
  published_version: number | null;
  updated_at: string;
  created_at: string;
};

export type VoicePhoneNumber = {
  id: string;
  workspace_id: string;
  assistant_id: string | null;
  phone_number: string;
  provider: string;
  country: string | null;
  status: string;
  webhook_status: string;
  forward_to_number: string | null;
  created_at: string;
};

export type VoiceCallSession = {
  id: string;
  workspace_id: string;
  assistant_id: string | null;
  from_number: string | null;
  to_number: string | null;
  direction: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number;
  billable_seconds: number;
  contact_id: string | null;
  outcome: string | null;
  intent: string | null;
  sentiment: string | null;
  summary: string | null;
};

export type VoiceKnowledgeSource = {
  id: string;
  workspace_id: string;
  assistant_id: string | null;
  source_type: string;
  title: string;
  content: string | null;
  url: string | null;
  status: string;
  error_message: string | null;
  updated_at: string;
};

export type VoiceSettings = {
  workspace_id: string;
  enabled: boolean;
  recording_enabled: boolean;
  recording_retention_days: number;
  transcript_retention_days: number;
  max_concurrent_calls: number;
  included_minutes: number;
  overage_rate_pence: number;
  transfer_number: string | null;
  notification_emails: string[];
};

const key = (ws: string | undefined, part: string) => ["voice", part, ws];

export function useVoiceSettings(workspaceId?: string) {
  return useQuery({
    queryKey: key(workspaceId, "settings"),
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voice_settings")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .maybeSingle();
      if (error) throw error;
      return (data as VoiceSettings | null) ?? null;
    },
  });
}

export function useUpdateVoiceSettings(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<VoiceSettings>) => {
      const { data, error } = await supabase
        .from("voice_settings")
        .upsert(
          {
            workspace_id: workspaceId!,
            included_minutes: VOICE_STARTER_ENTITLEMENT.includedMinutes,
            max_concurrent_calls: VOICE_STARTER_ENTITLEMENT.maxConcurrentCalls,
            ...patch,
          },
          { onConflict: "workspace_id" },
        )
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as VoiceSettings;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(workspaceId, "settings") });
      toast.success("Voice settings saved");
    },
    onError: (e: Error) => toast.error(e.message || "Could not save voice settings"),
  });
}

export function useVoiceAssistants(workspaceId?: string) {
  return useQuery({
    queryKey: key(workspaceId, "assistants"),
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voice_assistants")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .neq("status", "archived")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VoiceAssistant[];
    },
  });
}

export function useCreateVoiceAssistant(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; greeting?: string; persona?: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("voice_assistants")
        .insert({
          workspace_id: workspaceId!,
          name: input.name,
          greeting: input.greeting ?? null,
          persona: input.persona ?? null,
          created_by: auth.user?.id ?? null,
        })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as VoiceAssistant;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(workspaceId, "assistants") });
      toast.success("Assistant created as a draft");
    },
    onError: (e: Error) => toast.error(e.message || "Could not create the assistant"),
  });
}

export function useUpdateVoiceAssistant(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<VoiceAssistant> & { id: string }) => {
      const { error } = await supabase.from("voice_assistants").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(workspaceId, "assistants") });
      toast.success("Assistant updated");
    },
    onError: (e: Error) => toast.error(e.message || "Could not update the assistant"),
  });
}

export type VoiceAssistantVersion = {
  id: string;
  assistant_id: string;
  version: number;
  config: Record<string, unknown>;
  runtime_prompt: string | null;
  published_by: string | null;
  published_at: string;
};

/** A single assistant, including the working draft configuration. */
export function useVoiceAssistant(assistantId?: string) {
  return useQuery({
    queryKey: ["voice", "assistant", assistantId],
    enabled: !!assistantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voice_assistants")
        .select("*")
        .eq("id", assistantId!)
        .maybeSingle();
      if (error) throw error;
      return data as (VoiceAssistant & {
        config: Record<string, unknown>;
        runtime_prompt: string | null;
      }) | null;
    },
  });
}

/** Save-and-resume: the wizard writes the working draft, never a version. */
export function useSaveVoiceAssistantDraft(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name: string;
      greeting: string | null;
      persona: string | null;
      language: string;
      timezone: string;
      tags: string[];
      recording_enabled: boolean;
      crm_pipeline_id: string | null;
      crm_stage_id: string | null;
      default_owner_user_id: string | null;
      voice_id: string | null;
      config: Record<string, unknown>;
    }) => {
      const { id, config, ...patch } = input;
      const { error } = await supabase
        .from("voice_assistants")
        .update({ ...patch, config: config as never })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["voice", "assistant", vars.id] });
      qc.invalidateQueries({ queryKey: key(workspaceId, "assistants") });
      toast.success("Progress saved");
    },
    onError: (e: Error) => toast.error(e.message || "Could not save your changes"),
  });
}

export function useVoiceAssistantVersions(assistantId?: string) {
  return useQuery({
    queryKey: ["voice", "versions", assistantId],
    enabled: !!assistantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voice_assistant_versions")
        .select("*")
        .eq("assistant_id", assistantId!)
        .order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as VoiceAssistantVersion[];
    },
  });
}

export function usePublishVoiceAssistant(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { assistantId: string; config: Record<string, unknown>; runtimePrompt: string }) => {
      const { data, error } = await (supabase as any).rpc("voice_publish_assistant", {
        _assistant_id: input.assistantId,
        _config: input.config,
        _runtime_prompt: input.runtimePrompt,
        _activate: true,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (version, vars) => {
      qc.invalidateQueries({ queryKey: ["voice", "assistant", vars.assistantId] });
      qc.invalidateQueries({ queryKey: ["voice", "versions", vars.assistantId] });
      qc.invalidateQueries({ queryKey: key(workspaceId, "assistants") });
      toast.success(`Published version ${version}`);
    },
    onError: (e: Error) => toast.error(e.message || "Could not publish this assistant"),
  });
}

export function useRollbackVoiceAssistant(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { assistantId: string; version: number }) => {
      const { error } = await (supabase as any).rpc("voice_rollback_assistant", {
        _assistant_id: input.assistantId,
        _version: input.version,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["voice", "assistant", vars.assistantId] });
      qc.invalidateQueries({ queryKey: ["voice", "versions", vars.assistantId] });
      qc.invalidateQueries({ queryKey: key(workspaceId, "assistants") });
      toast.success(`Restored version ${vars.version}`);
    },
    onError: (e: Error) => toast.error(e.message || "Could not restore that version"),
  });
}

/** Pipelines with their stages, for the CRM capture step. */
export function useVoicePipelineOptions(workspaceId?: string) {
  return useQuery({
    queryKey: key(workspaceId, "pipelines"),
    enabled: !!workspaceId,
    staleTime: 60_000,
    queryFn: async () => {
      const [{ data: pipelines, error: pErr }, { data: stages, error: sErr }] = await Promise.all([
        supabase.from("crm_pipelines").select("id, name").eq("workspace_id", workspaceId!).order("name"),
        supabase
          .from("crm_pipeline_stages")
          .select("id, name, pipeline_id, position")
          .eq("workspace_id", workspaceId!)
          .order("position"),
      ]);
      if (pErr) throw pErr;
      if (sErr) throw sErr;
      return {
        pipelines: (pipelines ?? []) as { id: string; name: string }[],
        stages: (stages ?? []) as { id: string; name: string; pipeline_id: string; position: number }[],
      };
    },
  });
}

/** Booking pages this assistant could book into. */
export function useVoiceBookingPages(workspaceId?: string) {
  return useQuery({
    queryKey: key(workspaceId, "booking-pages"),
    enabled: !!workspaceId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_pages")
        .select("id, name")
        .eq("workspace_id", workspaceId!)
        .order("name");
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });
}

export function useVoiceNumbers(workspaceId?: string) {
  return useQuery({
    queryKey: key(workspaceId, "numbers"),
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voice_phone_numbers")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VoicePhoneNumber[];
    },
  });
}

export function useVoiceCalls(workspaceId?: string) {
  return useQuery({
    queryKey: key(workspaceId, "calls"),
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voice_call_sessions")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("started_at", { ascending: false, nullsFirst: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as VoiceCallSession[];
    },
  });
}

export function useVoiceKnowledge(workspaceId?: string) {
  return useQuery({
    queryKey: key(workspaceId, "knowledge"),
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voice_knowledge_sources")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VoiceKnowledgeSource[];
    },
  });
}

export function useCreateVoiceKnowledge(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; content: string; source_type: string; assistant_id?: string | null }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("voice_knowledge_sources").insert({
        workspace_id: workspaceId!,
        title: input.title,
        content: input.content,
        source_type: input.source_type,
        assistant_id: input.assistant_id ?? null,
        status: "ready",
        created_by: auth.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(workspaceId, "knowledge") });
      toast.success("Knowledge saved");
    },
    onError: (e: Error) => toast.error(e.message || "Could not save this knowledge entry"),
  });
}

export function useDeleteVoiceKnowledge(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("voice_knowledge_sources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(workspaceId, "knowledge") });
      toast.success("Removed");
    },
    onError: (e: Error) => toast.error(e.message || "Could not remove this entry"),
  });
}

export function useVoiceUsage(workspaceId?: string) {
  return useQuery({
    queryKey: key(workspaceId, "usage"),
    enabled: !!workspaceId,
    queryFn: async () => {
      const periodStart = new Date();
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("voice_usage_events")
        .select("seconds, credits, overage, occurred_at")
        .eq("workspace_id", workspaceId!)
        .gte("occurred_at", periodStart.toISOString());
      if (error) throw error;
      const seconds = (data ?? []).reduce((sum, r) => sum + (r.seconds ?? 0), 0);
      return { seconds, minutes: Math.round((seconds / 60) * 10) / 10, events: data?.length ?? 0 };
    },
  });
}
