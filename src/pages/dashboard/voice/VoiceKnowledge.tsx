import { useState } from "react";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import {
  useVoiceKnowledge, useCreateVoiceKnowledge, useDeleteVoiceKnowledge, useVoiceAssistants,
} from "@/hooks/useVoice";
import { VoiceEmptyState, VoiceSetupNotice } from "@/components/voice/VoicePrimitives";

const TYPES = [
  { value: "faq", label: "Question and answer" },
  { value: "business_profile", label: "About the business" },
  { value: "service", label: "Service or product" },
  { value: "policy", label: "Policy" },
  { value: "text", label: "General note" },
];

export default function VoiceKnowledge() {
  const workspaceId = useWorkspaceId();
  const { data: entries = [], isLoading } = useVoiceKnowledge(workspaceId);
  const { data: assistants = [] } = useVoiceAssistants(workspaceId);
  const create = useCreateVoiceKnowledge(workspaceId);
  const remove = useDeleteVoiceKnowledge(workspaceId);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sourceType, setSourceType] = useState("faq");
  const [assistantId, setAssistantId] = useState<string>("all");

  const submit = async () => {
    if (!title.trim() || !content.trim()) return;
    await create.mutateAsync({
      title: title.trim(),
      content: content.trim(),
      source_type: sourceType,
      assistant_id: assistantId === "all" ? null : assistantId,
    });
    setTitle(""); setContent(""); setOpen(false);
  };

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Knowledge</h1>
          <p className="text-sm text-muted-foreground">What your receptionist is allowed to tell callers.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full"><Plus className="mr-1 h-4 w-4" /> Add knowledge</Button>
          </DialogTrigger>
          <DialogContent className="z-[70] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add knowledge</DialogTitle>
              <DialogDescription>Keep answers short and factual — this is read out loud on a call.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="vk-type">Type</Label>
                <Select value={sourceType} onValueChange={setSourceType}>
                  <SelectTrigger id="vk-type"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[70]">
                    {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vk-title">Title or question</Label>
                <Input id="vk-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are your opening hours?" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vk-content">Answer</Label>
                <Textarea id="vk-content" rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder="We are open Monday to Friday, 9am to 5pm." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vk-assistant">Applies to</Label>
                <Select value={assistantId} onValueChange={setAssistantId}>
                  <SelectTrigger id="vk-assistant"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[70]">
                    <SelectItem value="all">All assistants</SelectItem>
                    {assistants.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={!title.trim() || !content.trim() || create.isPending}>
                {create.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <VoiceSetupNotice compact />

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : entries.length === 0 ? (
        <VoiceEmptyState
          icon={BookOpen}
          title="No knowledge added yet"
          description="Add your opening hours, services, prices and common questions. Your receptionist only answers from what you add here."
          action={<Button size="sm" className="rounded-full" onClick={() => setOpen(true)}>Add your first answer</Button>}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {entries.map((e) => (
            <Card key={e.id} className="rounded-2xl">
              <CardContent className="space-y-2 p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{e.title}</p>
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7 shrink-0"
                    aria-label={`Remove ${e.title}`}
                    onClick={() => remove.mutate(e.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
                <p className="line-clamp-3 text-sm text-muted-foreground">{e.content}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">{e.source_type.replace("_", " ")}</Badge>
                  <Badge variant="secondary" className="capitalize">{e.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
