import { useState } from "react";
import { Bot, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import {
  useVoiceAssistants, useCreateVoiceAssistant, useUpdateVoiceAssistant,
} from "@/hooks/useVoice";
import { VoiceEmptyState, VoiceSetupNotice, VoiceStatusBadge } from "@/components/voice/VoicePrimitives";
import { VOICE_ASSISTANT_STATUSES } from "@/lib/voice/constants";

export default function VoiceAssistants() {
  const workspaceId = useWorkspaceId();
  const { data: assistants = [], isLoading } = useVoiceAssistants(workspaceId);
  const create = useCreateVoiceAssistant(workspaceId);
  const update = useUpdateVoiceAssistant(workspaceId);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [greeting, setGreeting] = useState("");
  const [persona, setPersona] = useState("");

  const submit = async () => {
    if (!name.trim()) return;
    await create.mutateAsync({ name: name.trim(), greeting: greeting.trim(), persona: persona.trim() });
    setName(""); setGreeting(""); setPersona(""); setOpen(false);
  };

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Assistants</h1>
          <p className="text-sm text-muted-foreground">How your receptionist greets callers and what it can do.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full"><Plus className="mr-1 h-4 w-4" /> New assistant</Button>
          </DialogTrigger>
          <DialogContent className="z-[70] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create an assistant</DialogTitle>
              <DialogDescription>It starts as a draft. Nothing is answered until live calling is connected.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="va-name">Name</Label>
                <Input id="va-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Front desk receptionist" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="va-greeting">Greeting</Label>
                <Textarea id="va-greeting" value={greeting} onChange={(e) => setGreeting(e.target.value)} rows={2}
                  placeholder="Thanks for calling NexusFlo24, how can I help today?" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="va-persona">Tone and style</Label>
                <Textarea id="va-persona" value={persona} onChange={(e) => setPersona(e.target.value)} rows={3}
                  placeholder="Warm, efficient, British English. Confirm details back to the caller." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={!name.trim() || create.isPending}>
                {create.isPending ? "Creating…" : "Create assistant"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <VoiceSetupNotice compact />

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : assistants.length === 0 ? (
        <VoiceEmptyState
          icon={Bot}
          title="No assistants yet"
          description="Create a receptionist, give it a greeting and a tone of voice, then add your knowledge so it can answer real questions."
          action={<Button size="sm" className="rounded-full" onClick={() => setOpen(true)}>Create your first assistant</Button>}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {assistants.map((a) => (
            <Card key={a.id} className="rounded-2xl">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{a.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {a.greeting || "No greeting set yet."}
                    </p>
                  </div>
                  <VoiceStatusBadge status={a.status} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {a.language} · {a.timezone}
                    {a.published_version ? ` · version ${a.published_version}` : " · not published"}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full"
                    onClick={() => navigate(`/dashboard/${workspaceId}/voice/assistants/${a.id}`)}
                  >
                    Set up <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>

              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
