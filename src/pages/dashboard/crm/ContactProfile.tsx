import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Archive, ArchiveRestore, Building2, Mail, Phone, Save } from "lucide-react";
import Seo from "@/components/seo/Seo";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceInvites";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import { useContact, useUpdateContact } from "@/hooks/useContacts";
import { LIFECYCLE_STAGES, CONSENT_STATUSES, lifecycleMeta, consentMeta, scoreBand } from "@/lib/crm/constants";
import ContactQuickActions from "@/components/crm/ContactQuickActions";
import CrmTimeline from "@/components/crm/CrmTimeline";
import CrmNotesPanel from "@/components/crm/CrmNotesPanel";
import CrmFilesPanel from "@/components/crm/CrmFilesPanel";

const COMMS_TYPES = [
  "email_sent", "email_delivered", "email_opened", "email_clicked", "email_bounced", "email_replied",
  "whatsapp_sent", "whatsapp_delivered", "whatsapp_read", "sms_sent", "sms_delivered", "call_logged",
];

const ContactProfile = () => {
  const workspaceId = useWorkspaceId();
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const { canEdit, canManage } = useWorkspaceRole();
  const { data: contact, isLoading, isError, error } = useContact(contactId);
  const { data: members = [] } = useWorkspaceMembers(workspaceId);
  const update = useUpdateContact();
  const [draft, setDraft] = useState<Record<string, string>>({});

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (isError || !contact) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">
          Couldn't load this contact: {(error as any)?.message || "not found"}
        </p>
        <Button variant="outline" className="mt-3" onClick={() => navigate(`/dashboard/${workspaceId}/crm/contacts`)}>
          Back to contacts
        </Button>
      </div>
    );
  }

  const field = (key: string) => draft[key] ?? ((contact as any)[key] ?? "");
  const setField = (key: string, v: string) => setDraft((d) => ({ ...d, [key]: v }));
  const dirty = Object.keys(draft).length > 0;

  const save = async () => {
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(draft)) patch[k] = v === "" ? null : v;
    await update.mutateAsync({ id: contact.id, prev: contact, ...patch } as any);
    setDraft({});
  };

  const ownerLabel = (id: string | null) => {
    if (!id) return "Unassigned";
    const m = (members as any[]).find((x) => x.user_id === id);
    return m?.profile?.full_name || m?.profile?.email || id.slice(0, 8);
  };

  const stage = lifecycleMeta(contact.lifecycle_stage);
  const consent = consentMeta(contact.consent_status);
  const band = scoreBand(contact.score ?? 0);
  const title = contact.full_name || contact.email || "Contact";

  return (
    <div className="space-y-6">
      <Seo title={`${title} | NexusFlo24 CRM`} description="Contact profile, activity timeline, notes and files." noindex />

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/dashboard/${workspaceId}/crm/contacts`}><ArrowLeft className="mr-2 h-4 w-4" /> Contacts</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${stage.color}`}>{stage.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${band.color}`}>Score {contact.score ?? 0} · {band.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${consent.color}`}>{consent.label}</span>
                {contact.archived_at && <Badge variant="outline">Archived</Badge>}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {contact.job_title && <span>{contact.job_title}</span>}
                {contact.company_name && <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{contact.company_name}</span>}
                {contact.email && <a className="inline-flex items-center gap-1 hover:text-foreground" href={`mailto:${contact.email}`}><Mail className="h-3.5 w-3.5" />{contact.email}</a>}
                {contact.phone && <a className="inline-flex items-center gap-1 hover:text-foreground" href={`tel:${contact.phone}`}><Phone className="h-3.5 w-3.5" />{contact.phone}</a>}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Owner: {ownerLabel(contact.owner_user_id)} · Source: {contact.source || "—"} · Created {new Date(contact.created_at).toLocaleDateString()}
              </p>
              {(contact.tags?.length ?? 0) > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {contact.tags.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                </div>
              )}
            </div>

            {canManage && (
              <Button
                variant="outline"
                onClick={() => update.mutate({ id: contact.id, prev: contact, archived_at: contact.archived_at ? null : new Date().toISOString() } as any)}
              >
                {contact.archived_at ? <><ArchiveRestore className="mr-2 h-4 w-4" /> Restore</> : <><Archive className="mr-2 h-4 w-4" /> Archive</>}
              </Button>
            )}
          </div>

          <div className="mt-5 border-t pt-4">
            <ContactQuickActions contact={contact} workspaceId={workspaceId} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3"><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">First name</Label><Input disabled={!canEdit} value={field("first_name")} onChange={(e) => setField("first_name", e.target.value)} /></div>
              <div><Label className="text-xs">Last name</Label><Input disabled={!canEdit} value={field("last_name")} onChange={(e) => setField("last_name", e.target.value)} /></div>
            </div>
            <div><Label className="text-xs">Email</Label><Input disabled={!canEdit} value={field("email")} onChange={(e) => setField("email", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Phone</Label><Input disabled={!canEdit} value={field("phone")} onChange={(e) => setField("phone", e.target.value)} /></div>
              <div><Label className="text-xs">WhatsApp</Label><Input disabled={!canEdit} value={field("whatsapp_number")} onChange={(e) => setField("whatsapp_number", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Company</Label><Input disabled={!canEdit} value={field("company_name")} onChange={(e) => setField("company_name", e.target.value)} /></div>
              <div><Label className="text-xs">Job title</Label><Input disabled={!canEdit} value={field("job_title")} onChange={(e) => setField("job_title", e.target.value)} /></div>
            </div>
            <div>
              <Label className="text-xs">Lifecycle stage</Label>
              <Select disabled={!canEdit} value={field("lifecycle_stage")} onValueChange={(v) => setField("lifecycle_stage", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LIFECYCLE_STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Consent</Label>
              <Select disabled={!canEdit} value={field("consent_status")} onValueChange={(v) => setField("consent_status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONSENT_STATUSES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Owner</Label>
              <Select
                disabled={!canEdit}
                value={draft.owner_user_id ?? contact.owner_user_id ?? "none"}
                onValueChange={(v) => setField("owner_user_id", v === "none" ? "" : v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {(members as any[]).map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>{m.profile?.full_name || m.profile?.email || m.user_id.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {canEdit && (
              <Button className="w-full" disabled={!dirty || update.isPending} onClick={save}>
                <Save className="mr-2 h-4 w-4" /> {update.isPending ? "Saving…" : "Save changes"}
              </Button>
            )}

            {contact.origin_lead_id && (
              <p className="text-xs text-muted-foreground">
                Linked to a lead record —{" "}
                <Link className="underline hover:text-foreground" to={`/dashboard/${workspaceId}/leads`}>open in Leads</Link>
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <Tabs defaultValue="timeline">
              <TabsList className="flex-wrap">
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="comms">Communications</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
              </TabsList>
              <TabsContent value="timeline" className="mt-4">
                <CrmTimeline recordType="contact" recordId={contact.id} />
              </TabsContent>
              <TabsContent value="comms" className="mt-4">
                <CrmTimeline
                  recordType="contact"
                  recordId={contact.id}
                  limitToTypes={COMMS_TYPES}
                  emptyLabel="No emails, SMS, WhatsApp messages or calls logged for this contact yet."
                />
              </TabsContent>
              <TabsContent value="notes" className="mt-4">
                <CrmNotesPanel workspaceId={workspaceId} recordType="contact" recordId={contact.id} canEdit={canEdit} />
              </TabsContent>
              <TabsContent value="files" className="mt-4">
                <CrmFilesPanel workspaceId={workspaceId} recordType="contact" recordId={contact.id} canEdit={canEdit} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContactProfile;
