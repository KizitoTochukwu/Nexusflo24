import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const REPLY_CLASSES = [
  "interested",
  "meeting_request",
  "question",
  "referral",
  "not_now",
  "not_interested",
  "wrong_person",
  "unsubscribe",
  "out_of_office",
  "auto_reply",
  "bounce",
] as const;

export type ReplyClass = (typeof REPLY_CLASSES)[number];

export const REPLY_CLASS_LABELS: Record<ReplyClass, string> = {
  interested: "Interested",
  meeting_request: "Meeting request",
  question: "Question",
  referral: "Referred to someone else",
  not_now: "Not right now",
  not_interested: "Not interested",
  wrong_person: "Wrong person",
  unsubscribe: "Unsubscribe request",
  out_of_office: "Out of office",
  auto_reply: "Automatic reply",
  bounce: "Bounce",
};

export const POSITIVE_CLASSES: ReplyClass[] = ["interested", "meeting_request"];

export interface CfReply {
  id: string;
  workspace_id: string;
  campaign_id: string | null;
  enrolment_id: string | null;
  contact_id: string | null;
  source: string;
  from_email: string;
  subject: string | null;
  body_text: string;
  received_at: string;
  classification: string | null;
  classification_confidence: number | null;
  classification_reason: string | null;
  corrected_classification: string | null;
  corrected_at: string | null;
  handled: boolean;
  crm_synced_at: string | null;
  crm_contact_id: string | null;
  crm_deal_id: string | null;
  created_at: string;
}

export interface CfMailbox {
  id: string;
  provider: string;
  email: string;
  display_name: string | null;
  status: string;
  daily_limit: number;
  last_error: string | null;
  connected_at: string;
  token_expires_at: string | null;
}

export interface CfMailboxStatus {
  providers: Record<string, { configured: boolean; label: string }>;
  mailboxes: CfMailbox[];
  fallback_sender: { configured: boolean; provider: string | null; from_email: string | null };
}

async function callInbox(workspaceId: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("client-finder-inbox", {
    body: { workspace_id: workspaceId, ...payload },
  });
  if (error) {
    const detail = (error as any)?.context?.text ? await (error as any).context.text() : error.message;
    let message = detail;
    try {
      message = JSON.parse(detail)?.error ?? detail;
    } catch { /* plain text */ }
    throw new Error(message || "Request failed");
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
}

async function callMailbox(workspaceId: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("client-finder-mailbox", {
    body: { workspace_id: workspaceId, ...payload },
  });
  if (error) {
    const detail = (error as any)?.context?.text ? await (error as any).context.text() : error.message;
    let message = detail;
    try {
      message = JSON.parse(detail)?.error ?? detail;
    } catch { /* plain text */ }
    throw new Error(message || "Request failed");
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
}

export function useCfReplies(workspaceId?: string, campaignId?: string) {
  return useQuery({
    queryKey: ["cf-replies", workspaceId, campaignId ?? "all"],
    enabled: !!workspaceId,
    queryFn: async () => {
      let query = supabase
        .from("prospecting_replies")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("received_at", { ascending: false })
        .limit(200);
      if (campaignId) query = query.eq("campaign_id", campaignId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as CfReply[];
    },
  });
}

export function useCfReplyActions(workspaceId?: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["cf-replies"] });
    qc.invalidateQueries({ queryKey: ["cf-enrolments"] });
  };

  const logReply = useMutation({
    mutationFn: (payload: {
      from_email: string;
      subject?: string;
      body_text: string;
      campaign_id?: string | null;
      received_at?: string;
    }) => callInbox(workspaceId!, { action: "log_reply", ...payload }),
    onSuccess: (res) => {
      invalidate();
      toast.success(
        res?.matched_enrolment
          ? "Reply saved and matched to the prospect's sequence."
          : "Reply saved. No matching sequence was found for that address.",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const classify = useMutation({
    mutationFn: (replyId: string) => callInbox(workspaceId!, { action: "classify", reply_id: replyId }),
    onSuccess: (res) => {
      invalidate();
      toast.success(`Classified as ${REPLY_CLASS_LABELS[res.classification as ReplyClass] ?? res.classification}.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const correct = useMutation({
    mutationFn: (p: { replyId: string; classification: ReplyClass }) =>
      callInbox(workspaceId!, { action: "correct", reply_id: p.replyId, classification: p.classification }),
    onSuccess: () => {
      invalidate();
      toast.success("Outcome updated. Your correction is stored for review.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setHandled = useMutation({
    mutationFn: (p: { replyId: string; handled: boolean }) =>
      callInbox(workspaceId!, { action: "set_handled", reply_id: p.replyId, handled: p.handled }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const syncCrm = useMutation({
    mutationFn: (replyId: string) => callInbox(workspaceId!, { action: "sync_crm", reply_id: replyId }),
    onSuccess: (res) => {
      invalidate();
      toast.success(
        res?.already
          ? "This reply is already in the CRM."
          : res?.deal_created
            ? "Contact saved and a deal was opened in your pipeline."
            : "Contact saved to the CRM.",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const draftReply = useMutation({
    mutationFn: (replyId: string) => callInbox(workspaceId!, { action: "draft_reply", reply_id: replyId }),
    onError: (e: Error) => toast.error(e.message),
  });

  return { logReply, classify, correct, setHandled, syncCrm, draftReply };
}

export function useCfMailboxStatus(workspaceId?: string) {
  return useQuery({
    queryKey: ["cf-mailboxes", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => (await callMailbox(workspaceId!, { action: "status" })) as CfMailboxStatus,
  });
}

export function useCfMailboxActions(workspaceId?: string) {
  const qc = useQueryClient();

  const startOauth = useMutation({
    mutationFn: (provider: "google" | "microsoft") =>
      callMailbox(workspaceId!, {
        action: "start_oauth",
        provider,
        redirect_uri: `${window.location.origin}/dashboard/${workspaceId}/client-finder/settings`,
      }),
    onSuccess: (res) => {
      if (res?.authorize_url) window.location.href = res.authorize_url;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const completeOauth = useMutation({
    mutationFn: (p: { provider: string; code: string; state: string }) =>
      callMailbox(workspaceId!, { action: "complete_oauth", ...p }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["cf-mailboxes"] });
      toast.success(`${res.email} is now connected for sending.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnect = useMutation({
    mutationFn: (mailboxId: string) => callMailbox(workspaceId!, { action: "disconnect", mailbox_id: mailboxId }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["cf-mailboxes"] });
      qc.invalidateQueries({ queryKey: ["cf-campaigns"] });
      toast.success(
        res?.campaigns_paused
          ? `Mailbox disconnected. ${res.campaigns_paused} campaign(s) were paused.`
          : "Mailbox disconnected.",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { startOauth, completeOauth, disconnect };
}
