import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LIFECYCLE_STAGES, CONSENT_STATUSES } from "@/lib/crm/constants";
import { useCreateContact } from "@/hooks/useContacts";
import { normalizePhoneE164 } from "@/lib/leads/phone";
import { toast } from "sonner";

type Member = { user_id: string; profile?: { full_name?: string | null; email?: string | null } | null };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  members: Member[];
  onCreated?: (id: string) => void;
};

const empty = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  whatsapp_number: "",
  job_title: "",
  company_name: "",
  lifecycle_stage: "lead",
  source: "",
  consent_status: "unknown",
  owner_user_id: "",
  tags: "",
  notes: "",
};

const ContactCreateDrawer = ({ open, onOpenChange, workspaceId, members, onCreated }: Props) => {
  const [form, setForm] = useState({ ...empty });
  const [dirty, setDirty] = useState(false);
  const create = useCreateContact();

  const set = (k: keyof typeof empty, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };

  const close = (next: boolean) => {
    if (!next && dirty && !window.confirm("Discard this contact? Your changes will be lost.")) return;
    if (!next) { setForm({ ...empty }); setDirty(false); }
    onOpenChange(next);
  };

  const submit = async () => {
    if (!form.first_name.trim() && !form.last_name.trim() && !form.email.trim()) {
      toast.error("Enter at least a name or an email address.");
      return;
    }
    let phone: string | null = null;
    if (form.phone.trim()) {
      phone = normalizePhoneE164(form.phone.trim());
      if (!phone) { toast.error("Use international phone format, e.g. +447517327597."); return; }
    }
    let whatsapp: string | null = null;
    if (form.whatsapp_number.trim()) {
      whatsapp = normalizePhoneE164(form.whatsapp_number.trim());
      if (!whatsapp) { toast.error("Use international WhatsApp format, e.g. +447517327597."); return; }
    }

    const created = await create.mutateAsync({
      workspace_id: workspaceId,
      first_name: form.first_name.trim() || null,
      last_name: form.last_name.trim() || null,
      email: form.email.trim() || null,
      phone,
      whatsapp_number: whatsapp,
      job_title: form.job_title.trim() || null,
      company_name: form.company_name.trim() || null,
      lifecycle_stage: form.lifecycle_stage,
      source: form.source.trim() || "Manual entry",
      consent_status: form.consent_status,
      owner_user_id: form.owner_user_id || null,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      notes: form.notes.trim() || null,
    });
    setForm({ ...empty });
    setDirty(false);
    onOpenChange(false);
    onCreated?.(created.id);
  };

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>New contact</SheetTitle>
          <SheetDescription>Add a person to your CRM. Duplicate emails and phone numbers are blocked automatically.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="c-first">First name</Label>
              <Input id="c-first" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="c-last">Last name</Label>
              <Input id="c-last" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
            </div>
          </div>

          <div>
            <Label htmlFor="c-email">Email</Label>
            <Input id="c-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="c-phone">Phone</Label>
              <Input id="c-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+44…" />
            </div>
            <div>
              <Label htmlFor="c-wa">WhatsApp</Label>
              <Input id="c-wa" value={form.whatsapp_number} onChange={(e) => set("whatsapp_number", e.target.value)} placeholder="+44…" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="c-company">Company</Label>
              <Input id="c-company" value={form.company_name} onChange={(e) => set("company_name", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="c-title">Job title</Label>
              <Input id="c-title" value={form.job_title} onChange={(e) => set("job_title", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Lifecycle stage</Label>
              <Select value={form.lifecycle_stage} onValueChange={(v) => set("lifecycle_stage", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LIFECYCLE_STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Owner</Label>
              <Select value={form.owner_user_id || "none"} onValueChange={(v) => set("owner_user_id", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.profile?.full_name || m.profile?.email || m.user_id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="c-source">Source</Label>
              <Input id="c-source" value={form.source} onChange={(e) => set("source", e.target.value)} placeholder="Manual entry" />
            </div>
            <div>
              <Label>Consent</Label>
              <Select value={form.consent_status} onValueChange={(v) => set("consent_status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONSENT_STATUSES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="c-tags">Tags</Label>
            <Input id="c-tags" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="Comma separated" />
          </div>

          <div>
            <Label htmlFor="c-notes">Notes</Label>
            <Textarea id="c-notes" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pb-6">
            <Button variant="outline" onClick={() => close(false)}>Cancel</Button>
            <Button onClick={submit} disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create contact"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ContactCreateDrawer;
