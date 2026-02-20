import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useCreateCampaign, CAMPAIGN_TYPES, CAMPAIGN_OBJECTIVES } from "@/hooks/useCampaigns";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { Plus, Mail, MessageSquare, Phone, Layers, Sparkles } from "lucide-react";

const channelIcons: Record<string, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  whatsapp: <MessageSquare className="h-4 w-4" />,
  sms: <Phone className="h-4 w-4" />,
  "multi-channel": <Layers className="h-4 w-4" />,
};

export default function CreateCampaignDialog() {
  const workspaceId = useWorkspaceId();
  const createCampaign = useCreateCampaign();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);

  const [name, setName] = useState("");
  const [type, setType] = useState("email");
  const [objective, setObjective] = useState("broadcast");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scheduleNow, setScheduleNow] = useState(true);
  const [scheduledAt, setScheduledAt] = useState("");

  const reset = () => {
    setStep(1);
    setName("");
    setType("email");
    setObjective("broadcast");
    setSubject("");
    setBody("");
    setScheduleNow(true);
    setScheduledAt("");
  };

  const handleCreate = async () => {
    await createCampaign.mutateAsync({
      workspace_id: workspaceId,
      name,
      type,
      objective,
      status: scheduleNow ? "active" : "scheduled",
      message_content: { subject, body } as any,
      scheduled_at: scheduleNow ? null : scheduledAt || null,
      audience_filter: {} as any,
    });
    setOpen(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Create Campaign
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Campaign — Step {step} of 3</DialogTitle>
        </DialogHeader>

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
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                      type === t
                        ? "border-accent bg-accent/10 text-accent-foreground"
                        : "border-border text-muted-foreground hover:border-accent/50"
                    }`}
                  >
                    {channelIcons[t]} {t}
                  </button>
                ))}
              </div>
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
            <Button onClick={() => setStep(2)} disabled={!name.trim()} className="w-full">Next</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-dashed border-accent/40 bg-accent/5 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-accent-foreground">
                <Sparkles className="h-4 w-4 text-accent" /> AI Copy Assistant
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                AI-powered copywriting will be available here. For now, compose your message below.
              </p>
            </div>
            <div>
              <Label>Subject / Title</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Don't miss our summer deals!" />
            </div>
            <div>
              <Label>Message Body</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your campaign message..." rows={5} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
              <Button onClick={() => setStep(3)} disabled={!body.trim()} className="flex-1">Next</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <Label>Audience</Label>
              <p className="text-sm text-muted-foreground">All leads in this workspace (audience filtering coming soon).</p>
            </div>
            <div>
              <Label>Delivery</Label>
              <div className="mt-1 flex gap-2">
                <button
                  onClick={() => setScheduleNow(true)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    scheduleNow ? "border-accent bg-accent/10 text-accent-foreground" : "border-border text-muted-foreground"
                  }`}
                >
                  Send Now
                </button>
                <button
                  onClick={() => setScheduleNow(false)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    !scheduleNow ? "border-accent bg-accent/10 text-accent-foreground" : "border-border text-muted-foreground"
                  }`}
                >
                  Schedule
                </button>
              </div>
            </div>
            {!scheduleNow && (
              <div>
                <Label>Schedule Date & Time</Label>
                <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
              </div>
            )}
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium text-foreground">Summary</p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                <li><span className="font-medium text-foreground">Name:</span> {name}</li>
                <li><span className="font-medium text-foreground">Channel:</span> {type}</li>
                <li><span className="font-medium text-foreground">Objective:</span> {objective}</li>
                <li><span className="font-medium text-foreground">Delivery:</span> {scheduleNow ? "Immediate" : scheduledAt || "Not set"}</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
              <Button onClick={handleCreate} disabled={createCampaign.isPending} className="flex-1">
                {createCampaign.isPending ? "Creating..." : scheduleNow ? "Launch Campaign" : "Schedule Campaign"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
