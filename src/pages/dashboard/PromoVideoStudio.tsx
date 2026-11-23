import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clapperboard, Download, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Credits per second from the AI Gateway model listing for bytedance/seedance-2.5.
const RATE = { "480p": 0.4112, "720p": 0.9248 } as const;
const MAX_BYTES = 5 * 1024 * 1024;

type Item = { name: string; created_at: string; url: string | null };

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("generate-promo-video", { body });
  if (error) {
    let msg = error.message;
    try { msg = (await (error as any).context?.json())?.error ?? msg; } catch { /* keep */ }
    throw new Error(msg);
  }
  return data;
}

export default function PromoVideoStudio() {
  const workspaceId = useWorkspaceId();
  const { role, isAdmin } = useWorkspaceRole();
  const [mode, setMode] = useState<"promo" | "animate">("promo");
  const [image, setImage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [duration, setDuration] = useState<5 | 10>(5);
  const [resolution, setResolution] = useState<"480p" | "720p">("720p");
  const [aspect, setAspect] = useState<"16:9" | "9:16" | "1:1">("9:16");
  const [audio, setAudio] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const poll = useRef<number | null>(null);

  const loadList = async () => {
    if (!workspaceId) return;
    try { setItems((await call({ action: "list", workspace_id: workspaceId })).items ?? []); }
    catch { /* non-blocking */ }
    finally { setLoadingList(false); }
  };
  useEffect(() => { if (isAdmin) loadList(); return () => { if (poll.current) clearTimeout(poll.current); }; }, [workspaceId, isAdmin]);

  const onFile = (f?: File) => {
    if (!f) return;
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) return toast.error("Use a PNG, JPG or WebP photo.");
    if (f.size > MAX_BYTES) return toast.error("Photo must be under 5 MB.");
    const r = new FileReader();
    r.onload = () => setImage(r.result as string);
    r.readAsDataURL(f);
  };

  const check = async (videoId: string) => {
    try {
      const s = await call({ action: "status", workspace_id: workspaceId, video_id: videoId });
      if (s.status === "completed") { setResult(s.url); setProgress(100); setBusy(false); loadList(); return; }
      if (s.status === "failed") { setError(s.error); setBusy(false); return; }
      setProgress(Math.max(5, s.progress ?? 0));
      poll.current = window.setTimeout(() => check(videoId), 8000);
    } catch (e: any) { setError(e.message); setBusy(false); }
  };

  const generate = async () => {
    if (!image) return toast.error("Upload an image first.");
    if (mode === "promo" && (!name.trim() || desc.trim().length < 5)) return toast.error("Add a product name and short description.");
    setBusy(true); setError(null); setResult(null); setProgress(2);
    try {
      const job = await call({ action: "create", mode, workspace_id: workspaceId, image, product_name: name, description: desc, duration, resolution, aspect_ratio: aspect, generate_audio: audio });
      check(job.video_id);
    } catch (e: any) { setError(e.message); setBusy(false); }
  };

  const cost = (RATE[resolution] * duration).toFixed(1);

  if (role && !isAdmin) {
    return (
      <div className="p-4 md:p-8">
        <Card><CardHeader><CardTitle>AI Video Studio</CardTitle>
          <CardDescription>Only workspace owners and admins can create AI videos. Ask your workspace admin for access.</CardDescription></CardHeader></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground"><Clapperboard className="h-6 w-6 text-primary" /> AI Video Studio</h1>
        <p className="text-muted-foreground">Turn your images into short video clips, or make a product promo video.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{mode === "promo" ? "Your product" : "Your image"}</CardTitle><CardDescription>Clear, well-lit photos work best.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={mode === "animate" ? "default" : "outline"} onClick={() => setMode("animate")}>Animate image</Button>
              <Button type="button" variant={mode === "promo" ? "default" : "outline"} onClick={() => setMode("promo")}>Product promo</Button>
            </div>
            <label className="flex h-48 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted/40 hover:border-primary">
              {image ? <img src={image} alt="Product" className="h-full object-contain" /> :
                <span className="flex flex-col items-center gap-2 text-sm text-muted-foreground"><ImagePlus className="h-8 w-8" />{mode === "promo" ? "Upload product photo" : "Upload an image"}</span>}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
            {mode === "promo" && <div className="space-y-2"><Label>Product name</Label><Input value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="e.g. Glow Vitamin C Serum" /></div>}
            <div className="space-y-2"><Label>{mode === "promo" ? "Short description" : "How should it move? (optional)"}</Label><Textarea value={desc} maxLength={1000} rows={3} onChange={(e) => setDesc(e.target.value)} placeholder="What it is, the mood, and where it's shown — e.g. on a marble bathroom shelf with morning sunlight" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Length</Label>
                <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v) as 5 | 10)}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="5">5 sec</SelectItem><SelectItem value="10">10 sec</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Quality</Label>
                <Select value={resolution} onValueChange={(v) => setResolution(v as any)}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="480p">480p</SelectItem><SelectItem value="720p">720p</SelectItem></SelectContent></Select></div>
              {mode === "promo" ? <div className="space-y-2"><Label>Shape</Label>
                <Select value={aspect} onValueChange={(v) => setAspect(v as any)}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="9:16">Vertical 9:16</SelectItem><SelectItem value="1:1">Square 1:1</SelectItem><SelectItem value="16:9">Wide 16:9</SelectItem></SelectContent></Select></div> : <div className="space-y-2"><Label>Shape</Label><p className="pt-2 text-sm text-muted-foreground">Matches image</p></div>}
            </div>
            <div className="flex items-center justify-between"><Label>Background music</Label><Switch checked={audio} onCheckedChange={setAudio} /></div>
            <p className="text-xs text-muted-foreground">Estimated cost: about {cost} AI credits.</p>
            <Button className="w-full" onClick={generate} disabled={busy || !workspaceId}>
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating video…</> : (mode === "promo" ? "Generate promo video" : "Create video clip")}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Preview</CardTitle><CardDescription>Videos usually take 1–3 minutes.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {busy && <div className="space-y-2"><Progress value={progress} /><p className="text-sm text-muted-foreground">Generating… you can stay on this page.</p></div>}
            {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            {result && <>
              <video src={result} controls autoPlay loop className="w-full rounded-lg bg-muted" />
              <Button asChild variant="outline"><a href={result} download><Download className="mr-2 h-4 w-4" /> Download MP4</a></Button>
            </>}
            {!busy && !result && !error && <p className="py-16 text-center text-sm text-muted-foreground">Your video will appear here.</p>}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Your videos</CardTitle></CardHeader>
        <CardContent>
          {loadingList ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> :
            items.length === 0 ? <p className="text-sm text-muted-foreground">No videos yet.</p> :
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((it) => it.url && <video key={it.name} src={it.url} controls className="w-full rounded-lg bg-muted" />)}
            </div>}
        </CardContent>
      </Card>
    </div>
  );
}
