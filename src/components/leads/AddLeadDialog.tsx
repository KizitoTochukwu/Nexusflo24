import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { PIPELINE_STAGES, type Lead } from "@/hooks/useLeads";
import { useCreateFolder, type LeadFolder } from "@/hooks/useLeadFolders";

import { normalizePhoneE164 } from "@/lib/leads/phone";

const SOURCES = ["Landing Page", "WhatsApp", "Facebook Ad", "Referral", "Organic", "Other"];
const STATUSES = ["New", "Warm", "Hot", "Won", "Lost"];

const schema = z.object({
  full_name: z.string().trim().max(100).optional(),
  email: z.string().trim().email("Invalid email").max(255).or(z.literal("")).optional(),
  phone: z.string().trim().max(30).optional(),
  source: z.string().default("Organic"),
  status: z.string().default("New"),
  pipeline_stage: z.string().default("new_lead"),
  score: z.coerce.number().min(0).max(100).default(0),
  tags: z.string().optional(),
  notes: z.string().trim().max(2000).optional(),
  folder_id: z.string().optional(),
}).refine((d) => d.full_name || d.email, { message: "Name or email is required", path: ["full_name"] });

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (values: Partial<Lead>, folderId?: string) => void;
  defaultValues?: Partial<Lead>;
  loading?: boolean;
  workspaceId?: string;
  folders?: LeadFolder[];
};

const AddLeadDialog = ({ open, onOpenChange, onSubmit, defaultValues, loading, workspaceId, folders = [] }: Props) => {
  const isEdit = !!defaultValues?.id;
  const createFolder = useCreateFolder();
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const defaultFolder = folders.find((f) => f.is_default);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      source: "Organic",
      status: "New",
      pipeline_stage: "new_lead",
      score: 0,
      tags: "",
      notes: "",
      folder_id: "",
    },
  });

  useEffect(() => {
    if (open && defaultValues) {
      form.reset({
        full_name: defaultValues.full_name || "",
        email: defaultValues.email || "",
        phone: defaultValues.phone || "",
        source: defaultValues.source || "Organic",
        status: defaultValues.status || "New",
        pipeline_stage: defaultValues.pipeline_stage || "new_lead",
        score: defaultValues.score ?? 0,
        tags: defaultValues.tags?.join(", ") || "",
        notes: defaultValues.notes || "",
        folder_id: "",
      });
    } else if (open) {
      form.reset();
    }
  }, [open, defaultValues]);

  const handleSubmit = (values: FormValues) => {
    // Normalize phone to E.164 before submit so dedup works
    let normalizedPhone: string | null = null;
    if (values.phone && values.phone.trim()) {
      normalizedPhone = normalizePhoneE164(values.phone);
      if (!normalizedPhone) {
        form.setError("phone", { message: "Use international format like +447517327597" });
        return;
      }
    }
    const tags = values.tags
      ? values.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];
    // Folder fallback: user-picked → Uncategorized → first folder
    let folderId = values.folder_id && values.folder_id !== "__none__" ? values.folder_id : undefined;
    if (!folderId && folders.length > 0) {
      const uncategorized = folders.find((f) => f.name.trim().toLowerCase() === "uncategorized");
      folderId = (uncategorized || folders[0]).id;
    }
    onSubmit({
      ...(defaultValues?.id ? { id: defaultValues.id } : {}),
      full_name: values.full_name || null,
      email: values.email || null,
      phone: normalizedPhone,
      source: values.source,
      status: values.status,
      pipeline_stage: values.pipeline_stage as any,
      score: values.score,
      tags,
      notes: values.notes || null,
    } as any, folderId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Lead" : "Add Lead"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="full_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input placeholder="Jane Doe" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" placeholder="jane@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input placeholder="+1 555 123 4567" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="source" render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="pipeline_stage" render={({ field }) => (
                <FormItem>
                  <FormLabel>Pipeline Stage</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {PIPELINE_STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="score" render={({ field }) => (
              <FormItem>
                <FormLabel>Score (0–100)</FormLabel>
                <FormControl><Input type="number" min={0} max={100} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="folder_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Assign to Folder</FormLabel>
                <Select
                  onValueChange={(v) => {
                    if (v === "__create__") { setCreatingFolder(true); return; }
                    setCreatingFolder(false);
                    field.onChange(v);
                  }}
                  value={field.value || "__none__"}
                >
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">
                      {defaultFolder ? `${defaultFolder.name} (default)` : "Uncategorized (default)"}
                    </SelectItem>
                    {folders
                      .filter((f) => f.name.trim().toLowerCase() !== "uncategorized" && f.id !== defaultFolder?.id)
                      .map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                      ))}
                    <SelectItem value="__create__">+ Create new folder…</SelectItem>
                  </SelectContent>
                </Select>
                {creatingFolder && (
                  <div className="mt-2 flex gap-2">
                    <Input
                      placeholder="New folder name"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                    />
                    <Button
                      type="button"
                      disabled={!newFolderName.trim() || createFolder.isPending || !workspaceId}
                      onClick={async () => {
                        const created = await createFolder.mutateAsync({
                          name: newFolderName.trim(),
                          workspace_id: workspaceId!,
                        });
                        field.onChange((created as any).id);
                        setNewFolderName("");
                        setCreatingFolder(false);
                      }}
                    >
                      Create
                    </Button>
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="tags" render={({ field }) => (
              <FormItem>
                <FormLabel>Tags (comma-separated)</FormLabel>
                <FormControl><Input placeholder="vip, newsletter, enterprise" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea placeholder="Additional info…" rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {loading ? "Saving…" : isEdit ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddLeadDialog;
