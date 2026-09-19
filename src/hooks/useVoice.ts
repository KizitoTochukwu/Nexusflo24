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

/** Shows the real times the receptionist would offer a caller today. */
export function useVoiceAvailabilityPreview() {
  return useMutation({
    mutationFn: async ({ bookingPageId, date }: { bookingPageId: string; date: string }) => {
      const { data, error } = await supabase.functions.invoke("booking-availability", {
        body: { booking_page_id: bookingPageId, date },
      });
      if (error) throw error;
      return (data ?? {}) as { slots?: string[]; timezone?: string; duration?: number };
    },
    onError: (e: Error) => toast.error(e.message || "Could not read your diary"),
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

export type VoiceNumberStatus = {
  connected: boolean;
  credentials_found: boolean;
  credentials_source: "workspace" | "platform" | null;
  account_name: string | null;
  live_calling_enabled: boolean;
  gateway_configured?: boolean;
  webhook_url: string;
  status_webhook_url?: string;
  max_numbers: number;
  numbers_in_use: number;
};

export type VoiceAvailableNumber = {
  phone_number: string;
  friendly_name: string;
  locality: string | null;
  region: string | null;
  country: string;
  capabilities: Record<string, boolean>;
};

export type VoiceProviderNumber = {
  sid: string;
  phone_number: string;
  friendly_name: string;
  country: string | null;
  capabilities: Record<string, boolean>;
  already_added: boolean;
};

async function callVoiceNumbers<T>(payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("voice-numbers", { body: payload });
  if (error) {
    const details = (error as { context?: { text?: () => Promise<string> } })?.context?.text
      ? await (error as { context: { text: () => Promise<string> } }).context.text()
      : error.message;
    let message = details;
    try {
      message = JSON.parse(details)?.error ?? details;
    } catch { /* plain text */ }
    throw new Error(message || "Something went wrong");
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

export function useVoiceNumberStatus(workspaceId?: string) {
  return useQuery({
    queryKey: key(workspaceId, "number-status"),
    enabled: !!workspaceId,
    queryFn: () => callVoiceNumbers<VoiceNumberStatus>({ action: "status", workspace_id: workspaceId }),
  });
}

export function useSearchVoiceNumbers(workspaceId?: string) {
  return useMutation({
    mutationFn: (input: { country: string; contains?: string; area_code?: string }) =>
      callVoiceNumbers<{ results: VoiceAvailableNumber[] }>({
        action: "search", workspace_id: workspaceId, ...input,
      }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useProviderVoiceNumbers(workspaceId?: string) {
  return useMutation({
    mutationFn: () =>
      callVoiceNumbers<{ results: VoiceProviderNumber[] }>({
        action: "list_provider_numbers", workspace_id: workspaceId,
      }),
    onError: (e: Error) => toast.error(e.message),
  });
}

function useVoiceNumberAction(workspaceId: string | undefined, successMessage: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      callVoiceNumbers<Record<string, unknown>>({ workspace_id: workspaceId, ...payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(workspaceId, "numbers") });
      qc.invalidateQueries({ queryKey: key(workspaceId, "number-status") });
      toast.success(successMessage);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export const useBuyVoiceNumber = (w?: string) => useVoiceNumberAction(w, "Number added");
export const useImportVoiceNumber = (w?: string) => useVoiceNumberAction(w, "Number added");
export const useAssignVoiceNumber = (w?: string) => useVoiceNumberAction(w, "Assignment saved");
export const useReleaseVoiceNumber = (w?: string) => useVoiceNumberAction(w, "Number removed");
export const useCheckVoiceRouting = (w?: string) => useVoiceNumberAction(w, "Routing checked");



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

/** The caller records already in the CRM, for showing names in the Call Inbox. */
export function useVoiceCallContacts(workspaceId?: string, contactIds: string[] = []) {
  const ids = Array.from(new Set(contactIds.filter(Boolean))).sort();
  return useQuery({
    queryKey: [...key(workspaceId, "call-contacts"), ids.join(",")],
    enabled: !!workspaceId && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, full_name, first_name, last_name, phone, email")
        .in("id", ids);
      if (error) throw error;
      const map: Record<string, { id: string; name: string }> = {};
      for (const c of data ?? []) {
        const name =
          (c.full_name as string) ||
          [c.first_name, c.last_name].filter(Boolean).join(" ") ||
          (c.phone as string) ||
          (c.email as string) ||
          "Contact";
        map[c.id as string] = { id: c.id as string, name };
      }
      return map;
    },
  });
}

/** Creates or refreshes the caller's CRM contact, timeline entry and opportunity. */
export function useSyncVoiceCallToCrm(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (callSessionId: string) => {
      const { data, error } = await supabase.functions.invoke("voice-call-sync", {
        body: { call_session_id: callSessionId },
      });
      if (error) throw error;
      return data as { ok?: boolean; contactId?: string | null; dealId?: string | null; reason?: string };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: key(workspaceId, "calls") });
      qc.invalidateQueries({ queryKey: key(workspaceId, "call-contacts") });
      if (result?.contactId) toast.success("Caller saved to your CRM");
      else if (result?.reason === "number_withheld") toast.error("The caller withheld their number, so no contact could be created");
      else if (result?.reason === "marked_spam") toast.error("This call is marked as spam, so it was not added");
      else toast.error("There was nothing to identify this caller by");
    },
    onError: (e: Error) => toast.error(e.message || "Could not save this caller"),
  });
}

export type VoiceTranscriptTurn = {
  id: string;
  turn_index: number;
  speaker: string;
  content: string;
  started_offset_ms: number | null;
};

export type VoiceCallRecording = {
  id: string;
  storage_path: string;
  duration_seconds: number | null;
  size_bytes: number | null;
  mime_type: string | null;
  retention_expires_at: string | null;
  created_at: string;
};

/** What was said during a call, in order. */
export function useVoiceCallTranscript(callSessionId?: string) {
  return useQuery({
    queryKey: ["voice", "transcript", callSessionId],
    enabled: !!callSessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voice_call_transcripts")
        .select("id, turn_index, speaker, content, started_offset_ms")
        .eq("call_session_id", callSessionId!)
        .order("turn_index", { ascending: true });
      if (error) throw error;
      return (data ?? []) as VoiceTranscriptTurn[];
    },
  });
}

/** The stored recording for a call, if one was kept. */
export function useVoiceCallRecording(callSessionId?: string) {
  return useQuery({
    queryKey: ["voice", "recording", callSessionId],
    enabled: !!callSessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voice_call_recordings")
        .select("id, storage_path, duration_seconds, size_bytes, mime_type, retention_expires_at, created_at")
        .eq("call_session_id", callSessionId!)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as VoiceCallRecording | null;
    },
  });
}

/** A short-lived private link for playing a recording back. */
export function useVoiceRecordingLink() {
  return useMutation({
    mutationFn: async (recordingId: string) => {
      const { data, error } = await supabase.functions.invoke("voice-recording-access", {
        body: { recording_id: recordingId, action: "link" },
      });
      if (error) throw error;
      if (!data?.url) throw new Error(data?.error || "Recording file is unavailable");
      return data.url as string;
    },
    onError: (e: Error) => toast.error(e.message || "Could not open this recording"),
  });
}

/** Permanently removes a recording and its stored audio (workspace admins only). */
export function useDeleteVoiceRecording(callSessionId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recordingId: string) => {
      const { data, error } = await supabase.functions.invoke("voice-recording-access", {
        body: { recording_id: recordingId, action: "delete" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["voice", "recording", callSessionId] });
      toast.success("Recording deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Could not delete this recording"),
  });
}

/** Writes (or rewrites) the summary, intent, sentiment and captured details. */
export function useProcessVoiceCall(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { callSessionId: string; force?: boolean }) => {
      const { data, error } = await supabase.functions.invoke("voice-call-process", {
        body: { call_session_id: input.callSessionId, force: input.force ?? true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { ok: boolean; status: string; summary?: string | null };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: key(workspaceId, "calls") });
      qc.invalidateQueries({ queryKey: key(workspaceId, "call-contacts") });
      if (result?.status === "no_transcript") toast.error("There was nothing said on this call to summarise");
      else if (result?.status === "summary_unavailable") toast.error("The summary service was unavailable — please try again");
      else toast.success("Call summary updated");
    },
    onError: (e: Error) => toast.error(e.message || "Could not summarise this call"),
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

/** Reads a knowledge source into searchable chunks. Sets ready/failed. */
async function processKnowledgeSource(sourceId: string) {
  const { data, error } = await supabase.functions.invoke("voice-knowledge-process", {
    body: { source_id: sourceId },
  });
  if (error) throw error;
  return data as { ok?: boolean; status?: string; error?: string; chunks?: number };
}

export type VoiceKnowledgeInput = {
  title: string;
  content?: string | null;
  url?: string | null;
  storage_path?: string | null;
  source_type: string;
  assistant_id?: string | null;
};

export function useCreateVoiceKnowledge(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: VoiceKnowledgeInput) => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("voice_knowledge_sources")
        .insert({
          workspace_id: workspaceId!,
          title: input.title,
          content: input.content ?? null,
          url: input.url ?? null,
          storage_path: input.storage_path ?? null,
          source_type: input.source_type,
          assistant_id: input.assistant_id ?? null,
          status: "pending",
          created_by: auth.user?.id ?? null,
        })
        .select()
        .maybeSingle();
      if (error) throw error;
      const row = data as VoiceKnowledgeSource;
      const result = await processKnowledgeSource(row.id);
      return { row, result };
    },
    onSuccess: ({ result }) => {
      qc.invalidateQueries({ queryKey: key(workspaceId, "knowledge") });
      if (result?.status === "failed") toast.error(result.error ?? "This source could not be read");
      else toast.success("Knowledge saved and ready");
    },
    onError: (e: Error) => toast.error(e.message || "Could not save this knowledge entry"),
  });
}

export function useUpdateVoiceKnowledge(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reprocess = true, ...patch }: Partial<VoiceKnowledgeSource> & { id: string; reprocess?: boolean }) => {
      const { error } = await supabase.from("voice_knowledge_sources").update(patch).eq("id", id);
      if (error) throw error;
      if (reprocess) await processKnowledgeSource(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(workspaceId, "knowledge") });
      toast.success("Knowledge updated");
    },
    onError: (e: Error) => toast.error(e.message || "Could not update this entry"),
  });
}

export function useRetryVoiceKnowledge(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => processKnowledgeSource(id),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: key(workspaceId, "knowledge") });
      if (result?.status === "failed") toast.error(result.error ?? "Still could not read this source");
      else toast.success("Source read successfully");
    },
    onError: (e: Error) => toast.error(e.message || "Could not read this source"),
  });
}

/** Uploads a document into the private voice-knowledge area. */
export function useUploadVoiceKnowledgeDocument(workspaceId?: string) {
  return useMutation({
    mutationFn: async (file: File) => {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "document.txt";
      const path = `${workspaceId}/knowledge/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
      const { error } = await supabase.storage.from("voice-knowledge").upload(path, file, { upsert: false });
      if (error) throw error;
      return path;
    },
    onError: (e: Error) => toast.error(e.message || "Could not upload that file"),
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

export type VoiceKnowledgeMatch = {
  source_id: string;
  source_title: string;
  source_type: string;
  chunk_id: string;
  content: string;
  rank: number;
};

/** What the receptionist would find for a caller's question. */
export function useVoiceKnowledgeSearch(workspaceId?: string) {
  return useMutation({
    mutationFn: async ({ query, assistantId }: { query: string; assistantId?: string | null }) => {
      const { data, error } = await supabase.rpc("voice_search_knowledge", {
        _workspace_id: workspaceId!,
        _query: query,
        _assistant_id: assistantId ?? null,
        _limit: 5,
      });
      if (error) throw error;
      return (data ?? []) as VoiceKnowledgeMatch[];
    },
    onError: (e: Error) => toast.error(e.message || "Could not run that search"),
  });
}

export type VoiceUnansweredQuestion = {
  id: string;
  workspace_id: string;
  assistant_id: string | null;
  call_session_id: string | null;
  question: string;
  suggested_answer: string | null;
  status: string;
  created_at: string;
};

export function useVoiceUnansweredQuestions(workspaceId?: string) {
  return useQuery({
    queryKey: key(workspaceId, "unanswered"),
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voice_unanswered_questions")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VoiceUnansweredQuestion[];
    },
  });
}

/** Approving turns the question into a published answer; dismissing clears it. */
export function useResolveUnansweredQuestion(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; action: "approve" | "dismiss"; answer?: string; assistantId?: string | null }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (input.action === "approve") {
        const { data: q, error: loadError } = await supabase
          .from("voice_unanswered_questions")
          .select("*")
          .eq("id", input.id)
          .maybeSingle();
        if (loadError) throw loadError;
        if (!q) throw new Error("That question is no longer in the queue");
        const { data: created, error: insertError } = await supabase
          .from("voice_knowledge_sources")
          .insert({
            workspace_id: workspaceId!,
            title: q.question,
            content: input.answer ?? "",
            source_type: "faq",
            assistant_id: input.assistantId ?? q.assistant_id ?? null,
            status: "pending",
            created_by: auth.user?.id ?? null,
          })
          .select()
          .maybeSingle();
        if (insertError) throw insertError;
        if (created) await processKnowledgeSource((created as VoiceKnowledgeSource).id);
      }
      const { error } = await supabase
        .from("voice_unanswered_questions")
        .update({
          status: input.action === "approve" ? "approved" : "dismissed",
          resolved_by: auth.user?.id ?? null,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: key(workspaceId, "unanswered") });
      qc.invalidateQueries({ queryKey: key(workspaceId, "knowledge") });
      toast.success(vars.action === "approve" ? "Answer added to your knowledge" : "Question dismissed");
    },
    onError: (e: Error) => toast.error(e.message || "Could not update that question"),
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
