import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import LeadPicker from "@/components/campaigns/LeadPicker";
import { useLeadFolders, useFolderLeadIds } from "@/hooks/useLeadFolders";
import { Folder as FolderIcon, Users, FolderPlus, Upload, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AutomationEmailEditor from "@/components/automations/email-editor/AutomationEmailEditor";
import WhatsAppTemplatePicker, { type WhatsAppTemplateSelection } from "@/components/settings/WhatsAppTemplatePicker";
import { DEFAULT_TEMPLATE_SETTINGS, type TemplateSettings } from "@/components/automations/email-editor/EmailTemplateSettings";
import { SenderProfilePicker } from "@/components/admin/SenderProfilePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  useCreateCampaign, useUpdateCampaign, useGenerateCampaignCopy,
  CAMPAIGN_TYPES, CAMPAIGN_OBJECTIVES, CAMPAIGN_MODES, TRIGGER_TYPES, TONE_OPTIONS,
  type Campaign,
} from "@/hooks/useCampaigns";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Mail, MessageSquare, Phone, Layers, Sparkles, Zap, Radio,
  Loader2, Copy, ChevronRight, ChevronLeft, Clock, AlertTriangle, CheckCircle2, XCircle,
} from "lucide-react";
import { toast } from "sonner";

const channelIcons: Record<string, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  whatsapp: <MessageSquare className="h-4 w-4" />,
  sms: <Phone className="h-4 w-4" />,
  "multi-channel": <Layers className="h-4 w-4" />,
};

const modeIcons: Record<string, React.ReactNode> = {
  broadcast: <Radio className="h-4 w-4" />,
  triggered: <Zap className="h-4 w-4" />,
};

const TOTAL_STEPS = 5;

export default function CreateCampaignDialog({
  editCampaign,
  templateCampaign,
  open: controlledOpen,
  onOpenChange,
}: {
  editCampaign?: Campaign | null;
  templateCampaign?: Campaign | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} = {}) {
  const workspaceId = useWorkspaceId();
  const navigate = useNavigate();
  const isControlled = controlledOpen !== undefined;
  const isEditing = !!editCampaign;
  const isTemplate = !isEditing && !!templateCampaign;
  const sourceCampaign = editCampaign ?? templateCampaign ?? null;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (isControlled) onOpenChange?.(v);
    else setInternalOpen(v);
  };
  const goToLeads = (params?: string) => {
    setOpen(false);
    navigate(`/dashboard/${workspaceId}/leads${params ?? ""}`);
  };
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const generateCopy = useGenerateCampaignCopy();
  const [step, setStep] = useState(1);

  // Step 1
  const [name, setName] = useState("");
  const [type, setType] = useState("email");
  const [objective, setObjective] = useState("broadcast");
  const [campaignMode, setCampaignMode] = useState("broadcast");

  // Step 2 - Triggers (only if triggered mode)
  const [triggerType, setTriggerType] = useState("new_lead");
  const [triggerValue, setTriggerValue] = useState("");
  const [triggerActions, setTriggerActions] = useState<string[]>(["send_message"]);
  const [triggerStatusValue, setTriggerStatusValue] = useState("");
  const [triggerTagValue, setTriggerTagValue] = useState("");

  // Step 3 - Content
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [aiTone, setAiTone] = useState("professional");
  const [aiContext, setAiContext] = useState("");
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiVariants, setAiVariants] = useState<Array<{ subject: string; body: string; cta: string }>>([]);
  const [templateSettings, setTemplateSettings] = useState<TemplateSettings>(DEFAULT_TEMPLATE_SETTINGS);
  const [senderProfileEmail, setSenderProfileEmail] = useState<string | null>(null);
  const [senderProfileWa, setSenderProfileWa] = useState<string | null>(null);
  const [senderProfileSms, setSenderProfileSms] = useState<string | null>(null);

  // Step 3 (WhatsApp only) - Optional approved template for re-engagement (24h window closed)
  const [waTemplateId, setWaTemplateId] = useState<string>("none");
  const [waTemplateSelection, setWaTemplateSelection] = useState<WhatsAppTemplateSelection | null>(null);
  const { data: waTemplates = [] } = useQuery({
    queryKey: ["whatsapp-templates", workspaceId],
    enabled: !!workspaceId && (type === "whatsapp" || type === "multi-channel"),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_templates")
        .select("id, name, language, category, body_preview, variable_count")
        .eq("workspace_id", workspaceId!)
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Step 4 - Fallback
  const [fallbackEnabled, setFallbackEnabled] = useState(false);
  const [fallbackChannel, setFallbackChannel] = useState("sms");
  const [fallbackDelay, setFallbackDelay] = useState("30");
  const [fallbackCondition, setFallbackCondition] = useState("unread");

  // Step 4.5 - Audience Filter (persisted per workspace)
  const audiencePrefsKey = workspaceId ? `nf24:campaign-audience:${workspaceId}` : null;
  const persisted = useMemo(() => {
    if (!audiencePrefsKey) return null;
    try {
      const raw = localStorage.getItem(audiencePrefsKey);
      return raw ? (JSON.parse(raw) as {
        audienceMode?: "filter" | "folder" | "picker";
        selectedFolderId?: string | null;
        selectedLeadIds?: string[];
        audienceStatuses?: string[];
        audienceTags?: string;
        audienceMinScore?: string;
        audienceMaxScore?: string;
      }) : null;
    } catch { return null; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audiencePrefsKey]);

  const [audienceStatuses, setAudienceStatuses] = useState<string[]>(persisted?.audienceStatuses ?? []);
  const [audienceTags, setAudienceTags] = useState(persisted?.audienceTags ?? "");
  const [audienceMinScore, setAudienceMinScore] = useState(persisted?.audienceMinScore ?? "");
  const [audienceMaxScore, setAudienceMaxScore] = useState(persisted?.audienceMaxScore ?? "");

  // Step 5 - Schedule & Lead Selection
  const [scheduleNow, setScheduleNow] = useState(true);
  const [scheduledAt, setScheduledAt] = useState("");
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>(persisted?.selectedLeadIds ?? []);
  const [audienceMode, setAudienceMode] = useState<"filter" | "folder" | "picker">(persisted?.audienceMode ?? "filter");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(persisted?.selectedFolderId ?? null);

  // Persist audience prefs whenever they change
  useEffect(() => {
    if (!audiencePrefsKey) return;
    try {
      localStorage.setItem(audiencePrefsKey, JSON.stringify({
        audienceMode, selectedFolderId, selectedLeadIds,
        audienceStatuses, audienceTags, audienceMinScore, audienceMaxScore,
      }));
    } catch { /* quota / private mode — ignore */ }
  }, [audiencePrefsKey, audienceMode, selectedFolderId, selectedLeadIds,
      audienceStatuses, audienceTags, audienceMinScore, audienceMaxScore]);


  // Folders for "Pick Folder/Group" mode
  const { data: folders = [], isLoading: foldersLoading } = useLeadFolders(workspaceId);
  const { data: folderLeadIds = [] } = useFolderLeadIds(selectedFolderId, workspaceId);
  const selectedFolder = useMemo(
    () => folders.find((f) => f.id === selectedFolderId) || null,
    [folders, selectedFolderId],
  );

  // Required contact field per channel
  const requiredField = useMemo<"email" | "phone" | null>(() => {
    if (type === "email") return "email";
    if (type === "sms" || type === "whatsapp") return "phone";
    return null; // multi-channel: counted as having either
  }, [type]);

  // Eligibility preview: count leads in current audience that have the required contact field
  const { data: eligibility, isFetching: eligibilityLoading } = useQuery({
    queryKey: [
      "campaign-eligibility",
      workspaceId,
      type,
      audienceMode,
      audienceMode === "folder" ? folderLeadIds : null,
      audienceMode === "filter" ? { audienceStatuses, audienceTags, audienceMinScore, audienceMaxScore } : null,
    ],
    enabled:
      !!workspaceId &&
      step === 5 &&
      campaignMode === "broadcast" &&
      (audienceMode === "folder" || audienceMode === "filter"),
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("id, email, phone", { count: "exact" })
        .eq("workspace_id", workspaceId);

      if (audienceMode === "folder") {
        if (!folderLeadIds.length) return { total: 0, eligible: 0 };
        query = query.in("id", folderLeadIds);
      } else {
        if (audienceStatuses.length > 0) query = query.in("status", audienceStatuses);
        if (audienceMinScore) query = query.gte("score", parseInt(audienceMinScore));
        if (audienceMaxScore) query = query.lte("score", parseInt(audienceMaxScore));
        const tagList = audienceTags.split(",").map((t) => t.trim()).filter(Boolean);
        if (tagList.length > 0) query = query.overlaps("tags", tagList);
      }

      const { data, count, error } = await query.limit(10000);
      if (error) throw error;
      const rows = data ?? [];
      const total = count ?? rows.length;
      let eligible = 0;
      for (const r of rows) {
        if (type === "email") { if (r.email) eligible++; }
        else if (type === "sms" || type === "whatsapp") { if (r.phone) eligible++; }
        else { if (r.email || r.phone) eligible++; }
      }
      return { total, eligible };
    },
  });


  // Integration status
  const [integrationStatus, setIntegrationStatus] = useState<{ resend: boolean; twilio: boolean; whatsapp: boolean } | null>(null);
  const [integrationLoading, setIntegrationLoading] = useState(false);
  const [integrationError, setIntegrationError] = useState(false);

  useEffect(() => {
    if (step === 5 && integrationStatus === null && !integrationLoading) {
      setIntegrationLoading(true);
      supabase.functions.invoke("integration-status").then(({ data, error }) => {
        if (error || data?.error) {
          setIntegrationError(true);
        } else {
          setIntegrationStatus(data as { resend: boolean; twilio: boolean; whatsapp: boolean });
        }
        setIntegrationLoading(false);
      });
    }
  }, [step]);

  const reset = (opts: { keepAudience?: boolean } = { keepAudience: true }) => {
    setStep(1); setName(""); setType("email"); setObjective("broadcast");
    setCampaignMode("broadcast"); setTriggerType("new_lead"); setTriggerValue("");
    setTriggerActions(["send_message"]); setSubject(""); setBody("");
    setAiTone("professional"); setAiContext(""); setShowAiPanel(false); setAiVariants([]);
    setTemplateSettings(DEFAULT_TEMPLATE_SETTINGS);
    setFallbackEnabled(false); setFallbackChannel("sms"); setFallbackDelay("30");
    setFallbackCondition("unread");
    setScheduleNow(true); setScheduledAt("");
    if (!opts.keepAudience) {
      setAudienceStatuses([]); setAudienceTags("");
      setAudienceMinScore(""); setAudienceMaxScore("");
      setSelectedLeadIds([]); setAudienceMode("filter"); setSelectedFolderId(null);
      if (audiencePrefsKey) {
        try { localStorage.removeItem(audiencePrefsKey); } catch { /* ignore */ }
      }
    }
  };

  // Pre-fill the editor when opening an existing campaign (edit or use-as-template)
  useEffect(() => {
    if (!open || !sourceCampaign) return;
    const c = sourceCampaign;
    const content = (c.message_content ?? {}) as any;
    const trigger = (c.trigger_config ?? {}) as any;
    const fallback = (c.fallback_settings ?? {}) as any;
    const audience = (c.audience_filter ?? {}) as any;

    setStep(1);
    setName(isTemplate ? `${c.name ?? ""} (Copy)` : (c.name ?? ""));
    setType(c.type ?? "email");
    setObjective(c.objective ?? "broadcast");
    setCampaignMode((c as any).campaign_mode ?? "broadcast");
    setTriggerType(trigger.type ?? "new_lead");
    setTriggerValue(trigger.value ?? "");
    setTriggerActions(Array.isArray(trigger.actions) && trigger.actions.length ? trigger.actions : ["send_message"]);
    setTriggerStatusValue(trigger.status_value ?? "");
    setTriggerTagValue(trigger.tag_value ?? "");
    setSubject(content.subject ?? "");
    setBody(content.body ?? "");
    if (content.templateSettings) setTemplateSettings({ ...DEFAULT_TEMPLATE_SETTINGS, ...content.templateSettings });
    if (content.whatsappTemplate) {
      setWaTemplateSelection(content.whatsappTemplate as WhatsAppTemplateSelection);
      setWaTemplateId(content.whatsappTemplate.id ?? "none");
    }
    setSenderProfileEmail(content.sender_profile_id_email ?? null);
    setSenderProfileWa(content.sender_profile_id_whatsapp ?? null);
    setSenderProfileSms(content.sender_profile_id_sms ?? null);
    setFallbackEnabled(!!fallback.enabled);
    setFallbackChannel(fallback.channel ?? "sms");
    setFallbackDelay(String(fallback.delay_minutes ?? 30));
    setFallbackCondition(fallback.condition ?? "unread");
    setScheduleNow(!c.scheduled_at);
    setScheduledAt(c.scheduled_at ? String(c.scheduled_at).slice(0, 16) : "");
    if (audience.folder_id) {
      setAudienceMode("folder");
      setSelectedFolderId(audience.folder_id);
    } else if (Array.isArray(audience.lead_ids) && audience.lead_ids.length > 0) {
      setAudienceMode("picker");
      setSelectedLeadIds(audience.lead_ids);
    } else {
      setAudienceMode("filter");
    }
    setAudienceStatuses(Array.isArray(audience.statuses) ? audience.statuses : []);
    setAudienceTags(Array.isArray(audience.tags) ? audience.tags.join(", ") : "");
    setAudienceMinScore(audience.min_score != null ? String(audience.min_score) : "");
    setAudienceMaxScore(audience.max_score != null ? String(audience.max_score) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sourceCampaign?.id]);

  const handleGenerateAI = async () => {
    try {
      const result = await generateCopy.mutateAsync({
        channel: type, objective, tone: aiTone, context: aiContext || undefined,
      });
      setAiVariants(result.variants || []);
      toast.success("AI copy generated!");
    } catch {
      // error handled in hook
    }
  };

  const applyVariant = (v: { subject: string; body: string; cta: string }) => {
    setSubject(v.subject);
    // Preserve formatting: append CTA as a button if it looks like a link, otherwise plain text
    let finalBody = v.body;
    if (v.cta) {
      const linkMatch = v.cta.match(/\[(.+?)\]\((.+?)\)/);
      if (linkMatch) {
        finalBody += `\n\n[button:${linkMatch[1]}](${linkMatch[2]})`;
      } else {
        finalBody += `\n\n${v.cta}`;
      }
    }
    setBody(finalBody);
    setShowAiPanel(false);
    toast.success("Copy applied to editor — switch to Preview to see formatted output");
  };

  const handleCreate = async () => {
    // Auto-fill subject for email/multi-channel if blank, so the email leg
    // never fails on a missing subject.
    const finalSubject = ((type === "email" || type === "multi-channel") && !subject.trim())
      ? (name || "Message from NexusFlo24")
      : subject;

    const messageContent = {
      subject: finalSubject,
      body,
      templateSettings: (type === "email" || type === "multi-channel") ? templateSettings : undefined,
      whatsappTemplate: (type === "whatsapp" || type === "multi-channel") && (waTemplateSelection?.contentSid || waTemplateSelection?.id || waTemplateId !== "none")
        ? (() => {
            // Prefer new picker selection (has contentSid + variables).
            if (waTemplateSelection?.id || waTemplateSelection?.contentSid) {
              return {
                id: waTemplateSelection.id,
                name: waTemplateSelection.name,
                language: waTemplateSelection.language,
                contentSid: waTemplateSelection.contentSid,
                contentVariables: waTemplateSelection.contentVariables,
                headerMediaUrl: waTemplateSelection.headerMediaUrl,
              };
            }
            const t = waTemplates.find((x: any) => x.id === waTemplateId);
            return t ? { id: t.id, name: t.name, language: t.language } : undefined;
          })()
        : undefined,
      sender_profile_id_email: senderProfileEmail || undefined,
      sender_profile_id_whatsapp: senderProfileWa || undefined,
      sender_profile_id_sms: senderProfileSms || undefined,
    } as any;

    // Edit mode: update the existing campaign in place — never resend or duplicate.
    if (isEditing && editCampaign) {
      try {
        await updateCampaign.mutateAsync({
          id: editCampaign.id,
          name,
          type,
          objective,
          campaign_mode: campaignMode,
          message_content: messageContent,
          scheduled_at: campaignMode === "broadcast" ? (scheduleNow ? null : scheduledAt || null) : editCampaign.scheduled_at,
          trigger_config: campaignMode === "triggered" ? {
            type: triggerType, value: triggerValue, actions: triggerActions,
          } as any : {} as any,
          fallback_settings: fallbackEnabled ? {
            enabled: true, channel: fallbackChannel,
            delay_minutes: parseInt(fallbackDelay), condition: fallbackCondition,
          } as any : {} as any,
          audience_filter: {
            ...(audienceMode === "picker" && selectedLeadIds.length > 0
              ? { lead_ids: selectedLeadIds }
              : {}),
            ...(audienceMode === "folder" && selectedFolderId && folderLeadIds.length > 0
              ? { folder_id: selectedFolderId, lead_ids: folderLeadIds }
              : {}),
            ...(audienceMode === "filter" && audienceStatuses.length > 0 ? { statuses: audienceStatuses } : {}),
            ...(audienceMode === "filter" && audienceTags.trim() ? { tags: audienceTags.split(",").map(t => t.trim()).filter(Boolean) } : {}),
            ...(audienceMode === "filter" && audienceMinScore ? { min_score: parseInt(audienceMinScore) } : {}),
            ...(audienceMode === "filter" && audienceMaxScore ? { max_score: parseInt(audienceMaxScore) } : {}),
          } as any,
        } as any);
        toast.success("Campaign updated");
      } catch (e: any) {
        toast.error(e?.message || "Failed to update campaign");
        return;
      }
      setOpen(false);
      reset({ keepAudience: false });
      return;
    }

    const campaign = await createCampaign.mutateAsync({
      workspace_id: workspaceId,
      name,
      type,
      objective,
      campaign_mode: campaignMode,
      // Template copies are always saved as drafts — nothing is sent automatically.
      status: isTemplate ? "draft" : campaignMode === "triggered" ? "active" : scheduleNow ? "active" : "scheduled",
      message_content: messageContent,
      scheduled_at: scheduleNow ? null : scheduledAt || null,
      trigger_config: campaignMode === "triggered" ? {
        type: triggerType, value: triggerValue, actions: triggerActions,
      } as any : {} as any,
      fallback_settings: fallbackEnabled ? {
        enabled: true, channel: fallbackChannel,
        delay_minutes: parseInt(fallbackDelay), condition: fallbackCondition,
      } as any : {} as any,
      audience_filter: {
        ...(audienceMode === "picker" && selectedLeadIds.length > 0
          ? { lead_ids: selectedLeadIds }
          : {}),
        ...(audienceMode === "folder" && selectedFolderId && folderLeadIds.length > 0
          ? { folder_id: selectedFolderId, lead_ids: folderLeadIds }
          : {}),
        ...(audienceMode === "filter" && audienceStatuses.length > 0 ? { statuses: audienceStatuses } : {}),
        ...(audienceMode === "filter" && audienceTags.trim() ? { tags: audienceTags.split(",").map(t => t.trim()).filter(Boolean) } : {}),
        ...(audienceMode === "filter" && audienceMinScore ? { min_score: parseInt(audienceMinScore) } : {}),
        ...(audienceMode === "filter" && audienceMaxScore ? { max_score: parseInt(audienceMaxScore) } : {}),
      } as any,
    });

    // Auto-fire broadcast "Send Now" campaigns immediately (never for template copies)
    if (!isTemplate && campaignMode === "broadcast" && scheduleNow && campaign?.id) {
      try {
        const { data, error } = await supabase.functions.invoke("execute-campaign", {
          body: { campaign_id: campaign.id },
        });
        if (error) {
          console.error("Auto-execute error:", error);
          toast.error("Campaign created but failed to send. You can retry from the campaign details.");
        } else {
          const sent = data?.sent ?? 0;
          const failed = data?.failed ?? 0;
          const skippedUnsub = data?.skipped_unsubscribed ?? 0;
          const skippedNoContact = data?.skipped_missing_contact ?? 0;
          const skippedParts: string[] = [];
          if (skippedUnsub > 0) skippedParts.push(`${skippedUnsub} unsubscribed`);
          if (skippedNoContact > 0) skippedParts.push(`${skippedNoContact} missing contact info`);
          const skippedSuffix = skippedParts.length ? ` · Skipped: ${skippedParts.join(", ")}` : "";
          if (sent === 0) {
            toast.error(
              `Campaign delivered 0 messages${failed > 0 ? ` (${failed} failed)` : ""}${skippedSuffix}`,
              { duration: 8000 }
            );
          } else {
            toast.success(
              `Campaign sent! ${sent} delivered${failed > 0 ? `, ${failed} failed` : ""}${skippedSuffix}`
            );
          }
        }
      } catch (err) {
        console.error("Auto-execute error:", err);
        toast.error("Campaign created but failed to send. You can retry from the campaign details.");
      }

    }

    if (isTemplate) {
      toast.success("Campaign copy saved as draft — launch it from the campaigns list when you're ready.");
    }

    setOpen(false);
    reset({ keepAudience: false });
  };

  // Determine actual step to show (skip triggers step in broadcast mode)
  const getVisibleStep = () => {
    if (campaignMode === "broadcast" && step === 2) return -1; // skip
    return step;
  };

  const nextStep = () => {
    if (step === 1 && campaignMode === "broadcast") setStep(3);
    else setStep(step + 1);
  };
  const prevStep = () => {
    if (step === 3 && campaignMode === "broadcast") setStep(1);
    else setStep(step - 1);
  };

  const stepLabel = () => {
    const labels: Record<number, string> = {
      1: "Channel & Mode",
      2: "Automation Triggers",
      3: "Compose Message",
      4: "Fallback Settings",
      5: "Review & Launch",
    };
    return labels[step] || "";
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Create Campaign
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-none w-screen h-screen sm:max-w-none rounded-none p-0 gap-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border bg-background shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">{step}</span>
            {stepLabel()}
          </DialogTitle>
          <div className="flex gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? "bg-accent" : "bg-muted"}`} />
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className={step === 3 ? "max-w-6xl mx-auto" : "max-w-2xl mx-auto"}>

        {/* STEP 1: Channel & Mode */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Campaign Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Summer Sale Blast" />
            </div>
            <div>
              <Label>Channel</Label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {CAMPAIGN_TYPES.map((t) => (
                  <button key={t} onClick={() => setType(t)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                      type === t ? "border-accent bg-accent/10 text-accent-foreground" : "border-border text-muted-foreground hover:border-accent/50"
                    }`}>{channelIcons[t]} {t}</button>
                ))}
              </div>
            </div>
            <div>
              <Label>Campaign Mode</Label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {CAMPAIGN_MODES.map((m) => (
                  <button key={m} onClick={() => setCampaignMode(m)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                      campaignMode === m ? "border-accent bg-accent/10 text-accent-foreground" : "border-border text-muted-foreground hover:border-accent/50"
                    }`}>{modeIcons[m]} {m}</button>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {campaignMode === "broadcast" ? "Send manually or on schedule." : "Automatically triggered by lead events."}
              </p>
            </div>
            <div>
              <Label>Objective</Label>
              <Select value={objective} onValueChange={setObjective}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_OBJECTIVES.map((o) => (
                    <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={nextStep} disabled={!name.trim()} className="w-full gap-2">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* STEP 2: Triggers (only for triggered mode) */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label>Trigger Event</Label>
              <Select value={triggerType} onValueChange={setTriggerType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(triggerType === "score_threshold") && (
              <div>
                <Label>Score Threshold</Label>
                <Input type="number" value={triggerValue} onChange={(e) => setTriggerValue(e.target.value)} placeholder="e.g. 50" />
              </div>
            )}
            {(triggerType === "tag_added" || triggerType === "tag_removed") && (
              <div>
                <Label>Tag Name</Label>
                <Input value={triggerValue} onChange={(e) => setTriggerValue(e.target.value)} placeholder="e.g. hot-lead" />
              </div>
            )}
            <div>
              <Label>Actions when triggered</Label>
              <div className="mt-1 space-y-2">
                {[
                  { value: "send_message", label: "Send campaign message" },
                  { value: "update_status", label: "Update lead status" },
                  { value: "add_tag", label: "Add tag to lead" },
                ].map((a) => (
                  <label key={a.value} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={triggerActions.includes(a.value)}
                      onChange={(e) => {
                        if (e.target.checked) setTriggerActions([...triggerActions, a.value]);
                        else setTriggerActions(triggerActions.filter((x) => x !== a.value));
                      }}
                      className="rounded border-border" />
                    {a.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={prevStep} className="flex-1 gap-2"><ChevronLeft className="h-4 w-4" /> Back</Button>
              <Button onClick={nextStep} className="flex-1 gap-2">Next <ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        {/* STEP 3: Compose */}
        {step === 3 && (
          <div className="space-y-4">
            {/* AI Copy Generator */}
            <div className="rounded-lg border border-accent/40 bg-accent/5 p-3">
              <button onClick={() => setShowAiPanel(!showAiPanel)}
                className="flex w-full items-center justify-between text-sm font-medium text-accent-foreground">
                <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /> AI Copy Generator</span>
                <ChevronRight className={`h-4 w-4 transition-transform ${showAiPanel ? "rotate-90" : ""}`} />
              </button>

              {showAiPanel && (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Tone</Label>
                      <Select value={aiTone} onValueChange={setAiTone}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TONE_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t} className="capitalize text-xs">{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Objective</Label>
                      <Select value={objective} onValueChange={setObjective}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CAMPAIGN_OBJECTIVES.map((o) => (
                            <SelectItem key={o} value={o} className="capitalize text-xs">{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Context (optional)</Label>
                    <Input value={aiContext} onChange={(e) => setAiContext(e.target.value)}
                      placeholder="e.g. 30% off summer collection, target: young professionals"
                      className="h-8 text-xs" />
                  </div>
                  <Button onClick={handleGenerateAI} disabled={generateCopy.isPending}
                    size="sm" className="w-full gap-2">
                    {generateCopy.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {generateCopy.isPending ? "Generating..." : "Generate Copy"}
                  </Button>

                  {aiVariants.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Pick a variant:</p>
                      {aiVariants.map((v, i) => (
                        <button key={i} onClick={() => applyVariant(v)}
                          className="w-full rounded-lg border bg-card p-3 text-left text-xs transition-colors hover:border-accent/50">
                          <p className="font-semibold text-foreground">{v.subject}</p>
                          <p className="mt-1 line-clamp-2 text-muted-foreground">{v.body}</p>
                          <div className="mt-2 flex items-center gap-1 text-accent">
                            <Copy className="h-3 w-3" /> Use this variant
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {(type === "whatsapp" || type === "multi-channel") && workspaceId && (
              <div className="space-y-1">
                <WhatsAppTemplatePicker
                  workspaceId={workspaceId}
                  value={waTemplateSelection}
                  onChange={(v) => {
                    setWaTemplateSelection(v);
                    setWaTemplateId(v?.id ?? "none");
                  }}
                />
                <a
                  href={workspaceId ? `/dashboard/${workspaceId}/settings?tab=wa-templates` : "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-accent hover:underline block"
                >
                  Manage templates →
                </a>
              </div>
            )}

            <AutomationEmailEditor
              isEmail={type === "email" || type === "multi-channel"}
              channel={type === "email" || type === "multi-channel" ? "email" : type === "whatsapp" ? "whatsapp" : "sms"}
              subject={subject}
              onSubjectChange={setSubject}
              message={body}
              onMessageChange={setBody}
              whatsappTemplate={waTemplateSelection}
              templateSettings={templateSettings}
              onTemplateSettingsChange={(type === "email" || type === "multi-channel") ? setTemplateSettings : undefined}
            />
            {workspaceId && (
              <div className="space-y-2 rounded-md border border-border bg-background/40 p-3">
                <p className="text-xs font-medium text-foreground">Sender identity</p>
                {(type === "email" || type === "multi-channel") && (
                  <SenderProfilePicker workspaceId={workspaceId} channel="email" value={senderProfileEmail} onChange={setSenderProfileEmail} label="Email sender" />
                )}
                {(type === "whatsapp" || type === "multi-channel") && (
                  <SenderProfilePicker workspaceId={workspaceId} channel="whatsapp" value={senderProfileWa} onChange={setSenderProfileWa} label="WhatsApp sender" />
                )}
                {(type === "sms" || type === "multi-channel") && (
                  <SenderProfilePicker workspaceId={workspaceId} channel="sms" value={senderProfileSms} onChange={setSenderProfileSms} label="SMS sender" />
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={prevStep} className="flex-1 gap-2"><ChevronLeft className="h-4 w-4" /> Back</Button>
              <Button onClick={nextStep} disabled={!body.trim()} className="flex-1 gap-2">Next <ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        {/* STEP 4: Fallback */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-accent" />
                <div>
                  <p className="text-sm font-medium text-foreground">SMS Fallback Messaging</p>
                  <p className="text-xs text-muted-foreground">Auto-send SMS if primary channel fails</p>
                </div>
              </div>
              <Switch checked={fallbackEnabled} onCheckedChange={setFallbackEnabled} />
            </div>

            {fallbackEnabled && (
              <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                <div>
                  <Label className="text-xs">Fallback Channel</Label>
                  <Select value={fallbackChannel} onValueChange={setFallbackChannel}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Fallback Condition</Label>
                  <Select value={fallbackCondition} onValueChange={setFallbackCondition}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unread">Message unread</SelectItem>
                      <SelectItem value="bounced">Email bounced</SelectItem>
                      <SelectItem value="failed">Delivery failed</SelectItem>
                      <SelectItem value="no_reply">No reply received</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Delay (minutes)
                  </Label>
                  <Input type="number" value={fallbackDelay} onChange={(e) => setFallbackDelay(e.target.value)}
                    min="5" max="1440" className="h-8" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Wait this long before sending fallback (5–1440 min)
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={prevStep} className="flex-1 gap-2"><ChevronLeft className="h-4 w-4" /> Back</Button>
              <Button onClick={nextStep} className="flex-1 gap-2">Next <ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        {/* STEP 4.5 (shown within step 5): Audience Filter */}

        {/* STEP 5: Review & Launch */}
        {step === 5 && (
          <div className="space-y-4">
            {campaignMode === "broadcast" && (
              <div>
                <Label>Delivery</Label>
                <div className="mt-1 flex gap-2">
                  <button onClick={() => setScheduleNow(true)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      scheduleNow ? "border-accent bg-accent/10 text-accent-foreground" : "border-border text-muted-foreground"
                    }`}>Send Now</button>
                  <button onClick={() => setScheduleNow(false)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      !scheduleNow ? "border-accent bg-accent/10 text-accent-foreground" : "border-border text-muted-foreground"
                    }`}>Schedule</button>
                </div>
              </div>
            )}
            {!scheduleNow && campaignMode === "broadcast" && (
              <div>
                <Label>Schedule Date & Time</Label>
                <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
              </div>
            )}

            {/* Audience Selection */}
            {campaignMode === "broadcast" && (
              <div className="space-y-3">
                {/* Toggle between filter, folder, and picker */}
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "filter", label: "Filter by Criteria" },
                    { value: "folder", label: "Pick Folder/Group" },
                    { value: "picker", label: "Pick Specific Leads" },
                  ] as const).map((m) => (
                    <button key={m.value} onClick={() => setAudienceMode(m.value)}
                      className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                        audienceMode === m.value ? "border-accent bg-accent/10 text-accent-foreground" : "border-border text-muted-foreground"
                      }`}>{m.label}</button>
                  ))}
                </div>

                {audienceMode === "picker" && (
                  <LeadPicker
                    channel={type}
                    selectedLeadIds={selectedLeadIds}
                    onSelectionChange={setSelectedLeadIds}
                  />
                )}

                {audienceMode === "folder" && (
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                    <Label className="text-xs flex items-center gap-1.5">
                      <FolderIcon className="h-3.5 w-3.5" /> Choose a folder/group
                    </Label>
                    {foldersLoading ? (
                      <p className="text-xs text-muted-foreground py-1">Loading folders…</p>
                    ) : folders.length === 0 ? (
                      <div className="rounded-md border border-dashed bg-background/50 p-3 text-center space-y-2">
                        <FolderIcon className="h-5 w-5 text-muted-foreground mx-auto" />
                        <p className="text-xs text-muted-foreground">
                          You don't have any folders yet. Folders help group leads (e.g. "Webinar Attendees", "VIP Clients") so you can target them in one click.
                        </p>
                        <div className="flex gap-2 justify-center">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => goToLeads("?newFolder=1")}
                          >
                            <FolderPlus className="h-3.5 w-3.5" /> Create folder
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs gap-1"
                            onClick={() => goToLeads("?import=1")}
                          >
                            <Upload className="h-3.5 w-3.5" /> Import leads
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Select value={selectedFolderId ?? ""} onValueChange={(v) => setSelectedFolderId(v || null)}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select a folder…" />
                          </SelectTrigger>
                          <SelectContent>
                            {folders.map((f) => (
                              <SelectItem key={f.id} value={f.id} className="text-xs">
                                {f.name} ({f.lead_count ?? 0})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedFolder && folderLeadIds.length === 0 && (
                          <div className="rounded-md border border-dashed border-destructive/30 bg-destructive/5 p-2.5 space-y-2">
                            <p className="text-[11px] text-destructive">
                              Folder <span className="font-semibold">"{selectedFolder.name}"</span> has no leads yet.
                            </p>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px] gap-1"
                                onClick={() => goToLeads(`?folder=${selectedFolder.id}`)}
                              >
                                <ArrowUpRight className="h-3 w-3" /> Add leads to folder
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 text-[11px] gap-1"
                                onClick={() => goToLeads(`?import=1&folder=${selectedFolder.id}`)}
                              >
                                <Upload className="h-3 w-3" /> Import to folder
                              </Button>
                            </div>
                          </div>
                        )}
                        {selectedFolder && folderLeadIds.length > 0 && (
                          <p className="text-[11px] text-muted-foreground">
                            {folderLeadIds.length} lead{folderLeadIds.length === 1 ? "" : "s"} in folder.
                          </p>
                        )}
                        {selectedFolder && folderLeadIds.length > 0 && (
                          <ChannelEligibilityBadge
                            channel={type}
                            loading={eligibilityLoading}
                            total={eligibility?.total ?? folderLeadIds.length}
                            eligible={eligibility?.eligible ?? 0}
                          />
                        )}
                      </>
                    )}
                  </div>
                )}

                {audienceMode === "filter" && (
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                    <p className="text-xs font-semibold text-foreground">Audience Filter (optional)</p>
                    <div>
                      <Label className="text-xs">Lead Status</Label>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {["New", "Warm", "Hot", "Qualified", "Converted"].map((s) => (
                          <button key={s} onClick={() => setAudienceStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                            className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                              audienceStatuses.includes(s) ? "border-accent bg-accent/10 text-accent-foreground" : "border-border text-muted-foreground"
                            }`}>{s}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Tags (comma-separated)</Label>
                      <Input value={audienceTags} onChange={(e) => setAudienceTags(e.target.value)}
                        placeholder="e.g. newsletter, vip" className="h-8 text-xs" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Min Score</Label>
                        <Input type="number" value={audienceMinScore} onChange={(e) => setAudienceMinScore(e.target.value)}
                          placeholder="0" className="h-8 text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs">Max Score</Label>
                        <Input type="number" value={audienceMaxScore} onChange={(e) => setAudienceMaxScore(e.target.value)}
                          placeholder="100" className="h-8 text-xs" />
                      </div>
                    </div>
                    <ChannelEligibilityBadge
                      channel={type}
                      loading={eligibilityLoading}
                      total={eligibility?.total ?? 0}
                      eligible={eligibility?.eligible ?? 0}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
              <p className="font-medium text-foreground mb-2">Campaign Summary</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span className="text-muted-foreground">Name</span><span className="font-medium text-foreground">{name}</span>
                <span className="text-muted-foreground">Channel</span><span className="font-medium text-foreground capitalize">{type}</span>
                <span className="text-muted-foreground">Mode</span><span className="font-medium text-foreground capitalize">{campaignMode}</span>
                <span className="text-muted-foreground">Objective</span><span className="font-medium text-foreground capitalize">{objective}</span>
                {campaignMode === "triggered" && (
                  <>
                    <span className="text-muted-foreground">Trigger</span>
                    <span className="font-medium text-foreground">{TRIGGER_TYPES.find(t => t.value === triggerType)?.label}</span>
                  </>
                )}
                {fallbackEnabled && (
                  <>
                    <span className="text-muted-foreground">Fallback</span>
                    <span className="font-medium text-foreground capitalize">{fallbackChannel} after {fallbackDelay}m ({fallbackCondition})</span>
                  </>
                )}
                {campaignMode === "broadcast" && (
                  <>
                    <span className="text-muted-foreground">Audience</span>
                    <span className="font-medium text-foreground">
                      {audienceMode === "folder" && selectedFolder
                        ? `Folder "${selectedFolder.name}" (${folderLeadIds.length})`
                        : audienceMode === "folder"
                          ? "No folder selected"
                          : audienceMode === "picker"
                            ? `${selectedLeadIds.length} selected lead${selectedLeadIds.length === 1 ? "" : "s"}`
                            : "Filter by criteria"}
                    </span>
                  </>
                )}
                <span className="text-muted-foreground">Delivery</span>
                <span className="font-medium text-foreground">
                  {campaignMode === "triggered" ? "Auto (on trigger)" : scheduleNow ? "Immediate" : scheduledAt || "Not set"}
                </span>
              </div>
            </div>

            {/* Integration Status */}
            <div className="rounded-lg border border-dashed border-muted-foreground/30 p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Integration Status</p>
              <div className="grid gap-1 text-xs">
                {([
                  { key: "resend" as const, icon: <Mail className="h-3 w-3" />, label: "Email (Resend)", channels: ["email", "multi-channel"] },
                  { key: "whatsapp" as const, icon: <MessageSquare className="h-3 w-3" />, label: "WhatsApp Cloud API", channels: ["whatsapp", "multi-channel"] },
                  { key: "twilio" as const, icon: <Phone className="h-3 w-3" />, label: "SMS (Twilio)", channels: ["sms", "multi-channel"] },
                ] as const).map((item) => {
                  const isRelevant = (item.channels as readonly string[]).includes(type);
                  const statusBadge = integrationLoading
                    ? <span className="text-muted-foreground text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded flex items-center gap-1"><Loader2 className="h-2.5 w-2.5 animate-spin" /> Checking…</span>
                    : integrationError
                      ? <span className="text-muted-foreground text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded">Status unavailable</span>
                      : integrationStatus?.[item.key]
                        ? <span className="text-green-700 dark:text-green-400 text-[10px] font-medium bg-green-500/10 px-1.5 py-0.5 rounded flex items-center gap-1"><CheckCircle2 className="h-2.5 w-2.5" /> Connected</span>
                        : <span className="text-red-700 dark:text-red-400 text-[10px] font-medium bg-red-500/10 px-1.5 py-0.5 rounded flex items-center gap-1"><XCircle className="h-2.5 w-2.5" /> Not Configured</span>;
                  return (
                    <div key={item.key} className={`flex items-center justify-between ${!isRelevant ? "opacity-40" : ""}`}>
                      <span className="flex items-center gap-1">{item.icon} {item.label}</span>
                      {statusBadge}
                    </div>
                  );
                })}
              </div>
            </div>

            {isTemplate && (
              <div className="flex items-start gap-2 rounded-lg border border-accent/40 bg-accent/5 p-3 text-xs text-foreground">
                <Copy className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  This is a copy of an existing campaign. It will be saved as a <strong>draft</strong> — nothing is sent until you launch it yourself, even if "Send immediately" is selected.
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={prevStep} className="flex-1 gap-2"><ChevronLeft className="h-4 w-4" /> Back</Button>
              <Button
                onClick={handleCreate}
                disabled={
                  createCampaign.isPending || updateCampaign.isPending ||
                  (campaignMode === "broadcast" && audienceMode === "folder" && (!selectedFolderId || folderLeadIds.length === 0))
                }
                className="flex-1"
              >
                {isEditing
                  ? (updateCampaign.isPending ? "Saving..." : "Save Changes")
                  : isTemplate
                    ? (createCampaign.isPending ? "Saving..." : "Save Draft Copy")
                    : createCampaign.isPending ? "Creating..." : campaignMode === "triggered" ? "Activate Automation" : scheduleNow ? "Launch Campaign" : "Schedule Campaign"}
              </Button>
            </div>
          </div>
        )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChannelEligibilityBadge({
  channel, loading, total, eligible,
}: { channel: string; loading: boolean; total: number; eligible: number }) {
  const channelLabel =
    channel === "email" ? "email address"
    : channel === "sms" ? "phone number"
    : channel === "whatsapp" ? "WhatsApp-capable phone"
    : "email or phone";
  const missing = Math.max(0, total - eligible);
  const allEligible = total > 0 && eligible === total;
  const noneEligible = total > 0 && eligible === 0;

  return (
    <div
      className={`mt-1 rounded-md border p-2 text-[11px] flex items-start gap-2 ${
        noneEligible
          ? "border-destructive/40 bg-destructive/5 text-destructive"
          : allEligible
            ? "border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-400"
            : "border-accent/40 bg-accent/5 text-foreground"
      }`}
    >
      <Users className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <div className="leading-snug">
        {loading ? (
          <span className="text-muted-foreground">Checking eligibility…</span>
        ) : total === 0 ? (
          <span className="text-muted-foreground">No leads match this audience.</span>
        ) : (
          <>
            <span className="font-semibold">{eligible}</span> of{" "}
            <span className="font-semibold">{total}</span> lead{total === 1 ? "" : "s"} can receive this {channel} campaign
            <span className="text-muted-foreground"> (have a {channelLabel})</span>
            {missing > 0 && (
              <span className="text-muted-foreground"> · {missing} will be skipped</span>
            )}
            .
          </>
        )}
      </div>
    </div>
  );
}

