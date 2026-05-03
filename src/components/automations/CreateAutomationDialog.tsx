import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useCreateAutomation, TRIGGER_OPTIONS } from "@/hooks/useAutomations";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useFunnels } from "@/hooks/useFunnels";
import { useForms } from "@/hooks/useForms";
import { useLeadFolders } from "@/hooks/useLeadFolders";
import AutomationStepEditor, { type StepData } from "./AutomationStepEditor";
import ExitCriteriaEditor from "./ExitCriteriaEditor";
import { getDefaultExitCriteria, type ExitCriterion } from "@/lib/automations/exitCriteria";
import { AUTOMATION_TAG_OPTIONS } from "@/lib/automations/tagOptions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SOCIAL_TRIGGERS = ["instagram_comment", "instagram_dm", "facebook_comment", "facebook_dm"] as const;
type SocialTrigger = typeof SOCIAL_TRIGGERS[number];
const isSocialTrigger = (t: string): t is SocialTrigger => (SOCIAL_TRIGGERS as readonly string[]).includes(t);

export default function CreateAutomationDialog() {
  const [open, setOpen] = useState(false);
  const workspaceId = useWorkspaceId();
  const createAutomation = useCreateAutomation();
  const { data: funnels } = useFunnels(workspaceId);
  const { data: folders } = useLeadFolders(workspaceId);
  const { data: forms } = useForms(workspaceId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState("new_lead");
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>("all");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("any");
  const [tagValue, setTagValue] = useState<string>("");
  const [selectedFormId, setSelectedFormId] = useState<string>("any");
  const [steps, setSteps] = useState<StepData[]>([]);
  const [exitCriteria, setExitCriteria] = useState<ExitCriterion[]>(() => getDefaultExitCriteria("new_lead"));

  // Social trigger config
  const [socialKeyword, setSocialKeyword] = useState("");
  const [socialMatchMode, setSocialMatchMode] = useState<"contains" | "exact" | "starts_with">("contains");
  const [socialPostId, setSocialPostId] = useState("");

  const reset = () => {
    setName("");
    setDescription("");
    setTriggerType("new_lead");
    setSelectedFunnelId("all");
    setSelectedFolderId("any");
    setTagValue("");
    setSelectedFormId("any");
    setSteps([]);
    setExitCriteria(getDefaultExitCriteria("new_lead"));
    setSocialKeyword("");
    setSocialMatchMode("contains");
    setSocialPostId("");
  };

  // When the user picks a different trigger type, refresh suggested defaults
  // — but only if they haven't customised the list yet.
  const handleTriggerChange = (next: string) => {
    setTriggerType(next);
    setExitCriteria((prev) => {
      const prevDefaults = getDefaultExitCriteria(triggerType);
      const isStillDefault =
        prev.length === prevDefaults.length &&
        prev.every((c, i) => JSON.stringify(c) === JSON.stringify(prevDefaults[i]));
      return isStillDefault ? getDefaultExitCriteria(next) : prev;
    });
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    const triggerConfig: Record<string, unknown> = {};
    if (triggerType === "lead_added_to_folder") {
      if (selectedFolderId !== "any") triggerConfig.folder_id = selectedFolderId;
    } else if (triggerType === "lead_tagged") {
      if (tagValue.trim()) triggerConfig.tag = tagValue.trim();
    } else if (triggerType === "form_submitted") {
      if (selectedFormId !== "any") triggerConfig.form_id = selectedFormId;
      if (selectedFunnelId !== "all") triggerConfig.funnel_id = selectedFunnelId;
    } else if (isSocialTrigger(triggerType)) {
      if (!socialKeyword.trim()) {
        toast.error("Please enter a keyword (e.g. START)");
        return;
      }
      triggerConfig.keyword = socialKeyword.trim();
      triggerConfig.match_mode = socialMatchMode;
      if (socialPostId.trim()) triggerConfig.post_id = socialPostId.trim();
      triggerConfig.platform = triggerType.startsWith("instagram") ? "instagram" : "facebook";
      triggerConfig.trigger_source = triggerType.endsWith("_dm") ? "dm" : "comment";
    } else if (selectedFunnelId !== "all") {
      triggerConfig.funnel_id = selectedFunnelId;
    }
    createAutomation.mutate(
      {
        workspace_id: workspaceId,
        name: name.trim(),
        description: description.trim(),
        trigger_type: triggerType,
        trigger_config: triggerConfig,
        exit_criteria: exitCriteria,
        steps,
      },
      {
        onSuccess: async (created: any) => {
          // For social triggers, also write a row in social_keyword_triggers so the webhook can route inbound events.
          if (isSocialTrigger(triggerType) && created?.id && workspaceId) {
            const platform = triggerType.startsWith("instagram") ? "instagram" : "facebook";
            const trigger_source = triggerType.endsWith("_dm") ? "dm" : "comment";
            const { error: kwErr } = await supabase.from("social_keyword_triggers").insert({
              workspace_id: workspaceId,
              automation_id: created.id,
              platform,
              trigger_source,
              keyword: socialKeyword.trim(),
              match_mode: socialMatchMode,
              post_id: socialPostId.trim() || null,
              is_active: true,
            });
            if (kwErr) {
              toast.error("Automation created but keyword binding failed: " + kwErr.message);
            }
          }
          reset();
          setOpen(false);
        },
      }
    );
  };

  const showFolderPicker = triggerType === "lead_added_to_folder";
  const showTagInput = triggerType === "lead_tagged";
  const showSocialConfig = isSocialTrigger(triggerType);
  const showFormPicker = triggerType === "form_submitted";
  const showFunnelScope = !showFolderPicker && !showTagInput && !showSocialConfig && !showFormPicker;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Create Automation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Automation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium text-foreground">Name</label>
            <Input placeholder="e.g. Welcome new leads" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Description</label>
            <Textarea placeholder="What does this automation do?" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Trigger</label>
            <Select value={triggerType} onValueChange={handleTriggerChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRIGGER_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showFolderPicker && (
            <div>
              <label className="text-sm font-medium text-foreground">Scope to folder</label>
              <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                <SelectTrigger><SelectValue placeholder="Any folder" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any folder</SelectItem>
                  {(folders ?? []).map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Fires when a lead is added to this folder (manual move, CSV import, or auto-routing).
              </p>
            </div>
          )}

          {showTagInput && (
            <div>
              <label className="text-sm font-medium text-foreground">Tag</label>
              <Select value={tagValue} onValueChange={setTagValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tag (or leave blank for any)" />
                </SelectTrigger>
                <SelectContent>
                  {AUTOMATION_TAG_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Fires whenever this exact tag is added to a lead. Leave blank to match any tag.
              </p>
            </div>
          )}

          {showSocialConfig && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                Fires when a {triggerType.startsWith("instagram") ? "Instagram" : "Facebook"} {triggerType.endsWith("_dm") ? "DM" : "comment"} matches your keyword.
                Make sure you've connected your Meta account in <strong>Settings → Instagram & Facebook</strong>.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-foreground">Keyword</label>
                  <Input placeholder="e.g. START" value={socialKeyword} onChange={(e) => setSocialKeyword(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Match mode</label>
                  <Select value={socialMatchMode} onValueChange={(v) => setSocialMatchMode(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contains">Contains keyword</SelectItem>
                      <SelectItem value="exact">Exact match</SelectItem>
                      <SelectItem value="starts_with">Starts with keyword</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {triggerType.endsWith("_comment") && (
                <div>
                  <label className="text-sm font-medium text-foreground">Specific post ID (optional)</label>
                  <Input placeholder="Leave blank to match any post" value={socialPostId} onChange={(e) => setSocialPostId(e.target.value)} />
                  <p className="text-xs text-muted-foreground mt-1">
                    Get the post ID from the post URL or via Meta Graph API. Leave blank to fire on comments to any of your posts.
                  </p>
                </div>
              )}
            </div>
          )}

          {showFunnelScope && (
            <div>
              <label className="text-sm font-medium text-foreground">Scope to funnel (optional)</label>
              <Select value={selectedFunnelId} onValueChange={setSelectedFunnelId}>
                <SelectTrigger><SelectValue placeholder="All funnels" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All funnels (global)</SelectItem>
                  {(funnels ?? []).map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedFunnelId === "all" ? "Triggers for leads from any source" : "Only triggers for leads from this funnel"}
              </p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Workflow Steps</label>
            <AutomationStepEditor steps={steps} onChange={setSteps} triggerType={triggerType} />
          </div>

          <ExitCriteriaEditor
            value={exitCriteria}
            onChange={setExitCriteria}
            triggerType={triggerType}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => { reset(); setOpen(false); }}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!name.trim() || createAutomation.isPending}>
            {createAutomation.isPending ? "Creating…" : "Create Automation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

