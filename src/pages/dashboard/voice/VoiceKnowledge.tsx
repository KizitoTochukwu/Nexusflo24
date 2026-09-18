import { useMemo, useRef, useState } from "react";
import {
  BookOpen, FileText, Globe, HelpCircle, Plus, RefreshCw, Search, Trash2, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import {
  useVoiceKnowledge, useCreateVoiceKnowledge, useUpdateVoiceKnowledge, useDeleteVoiceKnowledge,
  useRetryVoiceKnowledge, useUploadVoiceKnowledgeDocument, useVoiceKnowledgeSearch,
  useVoiceUnansweredQuestions, useResolveUnansweredQuestion, useVoiceAssistants,
  type VoiceKnowledgeSource, type VoiceKnowledgeMatch,
} from "@/hooks/useVoice";
import { VoiceEmptyState, VoiceSetupNotice, VoiceSection } from "@/components/voice/VoicePrimitives";
import { toast } from "sonner";

const TYPES = [
  { value: "faq", label: "Question and answer", hint: "The best format — one question, one short spoken answer." },
  { value: "business_profile", label: "About the business", hint: "Who you are, where you are, how you work." },
  { value: "service", label: "Service or product", hint: "What it includes, who it suits, what it costs." },
  { value: "policy", label: "Policy", hint: "Cancellations, refunds, guarantees." },
  { value: "text", label: "General note", hint: "Anything else the receptionist may say." },
  { value: "url", label: "Web page", hint: "We read the page text once and save it here." },
  { value: "document", label: "Uploaded file", hint: "Plain text, Markdown or CSV." },
];

const TYPE_LABEL = (t: string) => TYPES.find((x) => x.value === t)?.label ?? t.replace("_", " ");

const STATUS_TONE: Record<string, string> = {
  ready: "bg-primary/10 text-primary",
  pending: "bg-muted text-muted-foreground",
  processing: "bg-accent/15 text-accent-foreground",
  failed: "bg-destructive/10 text-destructive",
  disabled: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  ready: "In use",
  pending: "Waiting",
  processing: "Reading…",
  failed: "Could not read",
  disabled: "Switched off",
};

export default function VoiceKnowledge() {
  const workspaceId = useWorkspaceId();
  const { data: entries = [], isLoading } = useVoiceKnowledge(workspaceId);
  const { data: assistants = [] } = useVoiceAssistants(workspaceId);
  const { data: questions = [] } = useVoiceUnansweredQuestions(workspaceId);

  const create = useCreateVoiceKnowledge(workspaceId);
  const update = useUpdateVoiceKnowledge(workspaceId);
  const remove = useDeleteVoiceKnowledge(workspaceId);
  const retry = useRetryVoiceKnowledge(workspaceId);
  const upload = useUploadVoiceKnowledgeDocument(workspaceId);
  const search = useVoiceKnowledgeSearch(workspaceId);
  const resolve = useResolveUnansweredQuestion(workspaceId);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VoiceKnowledgeSource | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sourceType, setSourceType] = useState("faq");
  const [assistantId, setAssistantId] = useState<string>("all");
  const fileRef = useRef<HTMLInputElement>(null);

  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [testQuery, setTestQuery] = useState("");
  const [matches, setMatches] = useState<VoiceKnowledgeMatch[] | null>(null);

  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});

  const pendingQuestions = questions.filter((q) => q.status === "pending");

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return entries.filter((e) => {
      if (typeFilter !== "all" && e.source_type !== typeFilter) return false;
      if (!needle) return true;
      return `${e.title} ${e.content ?? ""} ${e.url ?? ""}`.toLowerCase().includes(needle);
    });
  }, [entries, filter, typeFilter]);

  const resetForm = () => {
    setEditing(null); setTitle(""); setContent(""); setUrl(""); setFile(null);
    setSourceType("faq"); setAssistantId("all");
  };

  const openNew = () => { resetForm(); setOpen(true); };

  const openEdit = (entry: VoiceKnowledgeSource) => {
    setEditing(entry);
    setTitle(entry.title);
    setContent(entry.content ?? "");
    setUrl(entry.url ?? "");
    setSourceType(entry.source_type);
    setAssistantId(entry.assistant_id ?? "all");
    setFile(null);
    setOpen(true);
  };

  const canSubmit =
    title.trim().length > 0 &&
    (sourceType === "url"
      ? /^https?:\/\/\S+/i.test(url.trim())
      : sourceType === "document"
        ? !!file || !!editing
        : content.trim().length > 0);

  const submit = async () => {
    if (!canSubmit) return;
    const assigned = assistantId === "all" ? null : assistantId;
    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          title: title.trim(),
          content: sourceType === "url" || sourceType === "document" ? editing.content : content.trim(),
          url: sourceType === "url" ? url.trim() : null,
          assistant_id: assigned,
        });
      } else {
        let storagePath: string | null = null;
        if (sourceType === "document" && file) storagePath = await upload.mutateAsync(file);
        await create.mutateAsync({
          title: title.trim(),
          content: sourceType === "url" || sourceType === "document" ? null : content.trim(),
          url: sourceType === "url" ? url.trim() : null,
          storage_path: storagePath,
          source_type: sourceType,
          assistant_id: assigned,
        });
      }
      setOpen(false);
      resetForm();
    } catch {
      /* the hooks surface the message */
    }
  };

  const runTest = async () => {
    if (!testQuery.trim()) return;
    const result = await search.mutateAsync({ query: testQuery.trim() });
    setMatches(result);
  };

  const busy = create.isPending || update.isPending || upload.isPending;

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Knowledge</h1>
          <p className="text-sm text-muted-foreground">What your receptionist is allowed to tell callers.</p>
        </div>
        <Button size="sm" className="rounded-full" onClick={openNew}>
          <Plus className="mr-1 h-4 w-4" /> Add knowledge
        </Button>
      </div>

      <VoiceSetupNotice compact />

      <Tabs defaultValue="sources" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sources">Answers ({entries.length})</TabsTrigger>
          <TabsTrigger value="questions">
            Unanswered questions{pendingQuestions.length > 0 ? ` (${pendingQuestions.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="space-y-4">
          <VoiceSection
            title="Try a caller's question"
            description="See exactly what your receptionist would find. It only ever answers from what is listed below."
          >
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Input
                  className="max-w-sm"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") runTest(); }}
                  placeholder="What are your opening hours?"
                  aria-label="Test question"
                />
                <Button size="sm" variant="secondary" className="rounded-full" onClick={runTest} disabled={search.isPending}>
                  <Search className="mr-1 h-4 w-4" /> {search.isPending ? "Looking…" : "Try it"}
                </Button>
              </div>
              {matches !== null && (
                matches.length === 0 ? (
                  <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                    Nothing matched — on a real call it would say it doesn't know and offer to have someone follow up.
                    Add an answer for this question.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {matches.map((m) => (
                      <div key={m.chunk_id} className="rounded-xl border p-3">
                        <p className="text-sm font-medium">{m.source_title}</p>
                        <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{m.content}</p>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </VoiceSection>

          <div className="flex flex-wrap gap-2">
            <Input
              className="max-w-xs"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search your knowledge"
              aria-label="Search knowledge"
            />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-10 w-52" aria-label="Filter by type"><SelectValue /></SelectTrigger>
              <SelectContent className="z-[70]">
                <SelectItem value="all">All types</SelectItem>
                {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <Skeleton className="h-40 w-full rounded-2xl" />
          ) : entries.length === 0 ? (
            <VoiceEmptyState
              icon={BookOpen}
              title="No knowledge added yet"
              description="Add your opening hours, services, prices and common questions. Your receptionist only answers from what you add here."
              action={<Button size="sm" className="rounded-full" onClick={openNew}>Add your first answer</Button>}
            />
          ) : visible.length === 0 ? (
            <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nothing matches that search.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {visible.map((e) => (
                <Card key={e.id} className="rounded-2xl">
                  <CardContent className="space-y-2 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <button className="min-w-0 text-left" onClick={() => openEdit(e)}>
                        <p className="truncate font-medium">{e.title}</p>
                      </button>
                      <div className="flex shrink-0 items-center gap-1">
                        {e.status === "failed" && (
                          <Button
                            size="icon" variant="ghost" className="h-7 w-7" aria-label={`Try reading ${e.title} again`}
                            disabled={retry.isPending} onClick={() => retry.mutate(e.id)}
                          >
                            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        )}
                        <Button
                          size="icon" variant="ghost" className="h-7 w-7" aria-label={`Remove ${e.title}`}
                          onClick={() => remove.mutate(e.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>

                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {e.source_type === "url" && !e.content ? e.url : e.content || "No wording saved yet."}
                    </p>
                    {e.status === "failed" && e.error_message && (
                      <p className="text-xs text-destructive">{e.error_message}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="gap-1">
                        {e.source_type === "url" ? <Globe className="h-3 w-3" />
                          : e.source_type === "document" ? <FileText className="h-3 w-3" />
                          : <HelpCircle className="h-3 w-3" />}
                        {TYPE_LABEL(e.source_type)}
                      </Badge>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_TONE[e.status] ?? "bg-muted"}`}>
                        {STATUS_LABEL[e.status] ?? e.status}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {e.assistant_id
                          ? assistants.find((a) => a.id === e.assistant_id)?.name ?? "One assistant"
                          : "All assistants"}
                      </span>
                      <Button
                        size="sm" variant="ghost" className="ml-auto h-7 rounded-full text-xs"
                        onClick={() =>
                          update.mutate({
                            id: e.id,
                            status: e.status === "disabled" ? "pending" : "disabled",
                            reprocess: e.status === "disabled",
                          })
                        }
                      >
                        {e.status === "disabled" ? "Switch on" : "Switch off"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="questions" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Questions callers asked that your receptionist could not answer. Write the answer and it joins your knowledge.
          </p>
          {questions.length === 0 ? (
            <VoiceEmptyState
              icon={HelpCircle}
              title="Nothing waiting"
              description="Once calls start, anything your receptionist could not answer appears here for you to approve."
            />
          ) : (
            <div className="space-y-3">
              {questions.map((q) => (
                <Card key={q.id} className="rounded-2xl">
                  <CardContent className="space-y-3 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-medium">{q.question}</p>
                      <Badge variant="secondary" className="capitalize">{q.status}</Badge>
                    </div>
                    {q.status === "pending" ? (
                      <>
                        <Textarea
                          rows={3}
                          value={answerDrafts[q.id] ?? q.suggested_answer ?? ""}
                          onChange={(ev) => setAnswerDrafts((d) => ({ ...d, [q.id]: ev.target.value }))}
                          placeholder="Write the answer the receptionist should give."
                          aria-label={`Answer for ${q.question}`}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm" className="rounded-full" disabled={resolve.isPending}
                            onClick={() => {
                              const answer = (answerDrafts[q.id] ?? q.suggested_answer ?? "").trim();
                              if (!answer) { toast.error("Write the answer first"); return; }
                              resolve.mutate({ id: q.id, action: "approve", answer });
                            }}
                          >
                            Add this answer
                          </Button>
                          <Button
                            size="sm" variant="ghost" className="rounded-full" disabled={resolve.isPending}
                            onClick={() => resolve.mutate({ id: q.id, action: "dismiss" })}
                          >
                            Dismiss
                          </Button>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">Handled.</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="z-[70] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit knowledge" : "Add knowledge"}</DialogTitle>
            <DialogDescription>Keep answers short and factual — this is read out loud on a call.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="vk-type">Type</Label>
              <Select value={sourceType} onValueChange={setSourceType} disabled={!!editing}>
                <SelectTrigger id="vk-type"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[70]">
                  {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{TYPES.find((t) => t.value === sourceType)?.hint}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vk-title">Title or question</Label>
              <Input id="vk-title" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="What are your opening hours?" />
            </div>

            {sourceType === "url" ? (
              <div className="space-y-1.5">
                <Label htmlFor="vk-url">Web page address</Label>
                <Input id="vk-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/services" />
                <p className="text-xs text-muted-foreground">We read the page once and save the wording here. Re-read it any time.</p>
              </div>
            ) : sourceType === "document" ? (
              <div className="space-y-1.5">
                <Label>File</Label>
                <input
                  ref={fileRef} type="file" className="hidden"
                  accept=".txt,.md,.markdown,.csv,.json,.html,.htm,.vtt"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <Button type="button" variant="secondary" className="w-full rounded-xl" onClick={() => fileRef.current?.click()}>
                  <Upload className="mr-1 h-4 w-4" /> {file ? file.name : editing ? "Replace file" : "Choose a file"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Plain text, Markdown, CSV or a saved web page. PDFs and Word files aren't readable yet — paste the wording instead.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="vk-content">Answer</Label>
                <Textarea id="vk-content" rows={5} value={content} onChange={(e) => setContent(e.target.value)}
                  placeholder="We are open Monday to Friday, 9am to 5pm." />
              </div>
            )}

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
            <Button variant="ghost" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={submit} disabled={!canSubmit || busy}>
              {busy ? "Saving…" : editing ? "Save changes" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
