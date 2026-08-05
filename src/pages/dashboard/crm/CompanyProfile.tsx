import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Archive, ArchiveRestore, Building2, ExternalLink, Globe, Mail, Phone, Save, Users } from "lucide-react";
import Seo from "@/components/seo/Seo";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceInvites";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import { useCompany, useUpdateCompany, useCompanyContacts, useLinkContactsToCompany } from "@/hooks/useCompanies";
import { useContacts } from "@/hooks/useContacts";
import { COMPANY_SIZE_BANDS, INDUSTRIES, LIFECYCLE_STAGES, lifecycleMeta, scoreBand } from "@/lib/crm/constants";
import CrmTimeline from "@/components/crm/CrmTimeline";
import CrmNotesPanel from "@/components/crm/CrmNotesPanel";
import CrmFilesPanel from "@/components/crm/CrmFilesPanel";
import CrmTasksPanel from "@/components/crm/CrmTasksPanel";

const CompanyProfile = () => {
  const workspaceId = useWorkspaceId();
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { canEdit, canManage } = useWorkspaceRole();

  const { data: company, isLoading, isError, error } = useCompany(companyId);
  const { data: members = [] } = useWorkspaceMembers(workspaceId);
  const { data: contacts = [], isLoading: contactsLoading } = useCompanyContacts(companyId);
  const update = useUpdateCompany();
  const link = useLinkContactsToCompany();

  const [form, setForm] = useState<Record<string, any>>({});
  const [linkSearch, setLinkSearch] = useState("");
  const { data: linkResults } = useContacts(workspaceId, { search: linkSearch, pageSize: 8 });

  useEffect(() => {
    if (company) setForm({ ...company });
  }, [company]);

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
        Couldn't load this company: {(error as any)?.message || "unknown error"}
      </div>
    );
  }
  if (isLoading || !company) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }

  const stage = lifecycleMeta(company.lifecycle_stage);
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const save = () =>
    update.mutate({
      id: company.id,
      prev: company,
      name: form.name,
      domain: form.domain || null,
      website: form.website || null,
      industry: form.industry || null,
      size_band: form.size_band || null,
      annual_revenue: form.annual_revenue ? Number(form.annual_revenue) : null,
      email: form.email || null,
      phone: form.phone || null,
      linkedin_url: form.linkedin_url || null,
      address_line1: form.address_line1 || null,
      city: form.city || null,
      state: form.state || null,
      postal_code: form.postal_code || null,
      country: form.country || null,
      description: form.description || null,
      lifecycle_stage: form.lifecycle_stage,
      owner_user_id: form.owner_user_id || null,
    });

  const unlinkedResults = (linkResults?.rows ?? []).filter((c) => c.company_id !== company.id);

  return (
    <div className="space-y-6">
      <Seo title={`${company.name} | NexusFlo24 CRM`} description={`Account profile, contacts and activity history for ${company.name}.`} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard/${workspaceId}/crm/companies`)} aria-label="Back to companies">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary" className={stage.color}>{stage.label}</Badge>
                {company.industry && <span>{company.industry}</span>}
                {company.size_band && <span>· {company.size_band} employees</span>}
                {company.archived_at && <Badge variant="outline">Archived</Badge>}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {company.website && (
            <Button variant="outline" asChild>
              <a href={company.website} target="_blank" rel="noreferrer noopener">
                <Globe className="mr-2 h-4 w-4" /> Website <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          )}
          {canManage && (
            <Button
              variant="outline"
              onClick={() => update.mutate({ id: company.id, prev: company, archived_at: company.archived_at ? null : new Date().toISOString() })}
            >
              {company.archived_at ? <><ArchiveRestore className="mr-2 h-4 w-4" /> Restore</> : <><Archive className="mr-2 h-4 w-4" /> Archive</>}
            </Button>
          )}
          <Button onClick={save} disabled={!canEdit || update.isPending}>
            <Save className="mr-2 h-4 w-4" /> {update.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Tabs defaultValue="contacts">
          <TabsList>
            <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
            <TabsTrigger value="timeline">Activity</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="mt-4 space-y-4">
            {canEdit && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Link an existing contact</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <Input
                    placeholder="Search contacts by name or email…"
                    value={linkSearch}
                    onChange={(e) => setLinkSearch(e.target.value)}
                    aria-label="Search contacts to link"
                  />
                  {linkSearch.trim().length > 1 && (
                    <div className="max-h-56 space-y-1 overflow-y-auto">
                      {unlinkedResults.length === 0 ? (
                        <p className="p-2 text-sm text-muted-foreground">No matching contacts.</p>
                      ) : unlinkedResults.map((c) => (
                        <div key={c.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                          <div>
                            <p className="font-medium">{c.full_name || c.email || "Unnamed"}</p>
                            <p className="text-xs text-muted-foreground">{c.email || c.phone || "—"}</p>
                          </div>
                          <Button size="sm" variant="outline" disabled={link.isPending}
                            onClick={() => link.mutate({ contactIds: [c.id], company })}>
                            Link
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {contactsLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : contacts.length === 0 ? (
              <div className="rounded-lg border border-dashed p-10 text-center">
                <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No contacts are linked to this company yet.</p>
              </div>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Job title</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead className="w-[90px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          <Link className="hover:underline" to={`/dashboard/${workspaceId}/crm/contacts/${c.id}`}>
                            {c.full_name || c.email || "Unnamed"}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{c.job_title || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={scoreBand(c.score ?? 0).color}>{c.score ?? 0}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {canEdit && (
                            <Button size="sm" variant="ghost" disabled={link.isPending}
                              onClick={() => link.mutate({ contactIds: [c.id], company: null })}>
                              Unlink
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <CrmTimeline recordType="company" recordId={company.id} emptyLabel="No activity recorded for this account yet." />
          </TabsContent>
          <TabsContent value="notes" className="mt-4">
            <CrmNotesPanel workspaceId={workspaceId} recordType="company" recordId={company.id} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="files" className="mt-4">
            <CrmFilesPanel workspaceId={workspaceId} recordType="company" recordId={company.id} canEdit={canEdit} />
          </TabsContent>
          <TabsContent value="tasks" className="mt-4">
            <CrmTasksPanel workspaceId={workspaceId} link={{ company_id: company.id }} canEdit={canEdit} />
          </TabsContent>
        </Tabs>

        <Card className="h-fit">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Company details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="f-name">Name</Label>
              <Input id="f-name" value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} disabled={!canEdit} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="f-domain">Domain</Label>
                <Input id="f-domain" value={form.domain ?? ""} onChange={(e) => set("domain", e.target.value)} disabled={!canEdit} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-website">Website</Label>
                <Input id="f-website" value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} disabled={!canEdit} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Industry</Label>
              <Select value={form.industry ?? ""} onValueChange={(v) => set("industry", v)} disabled={!canEdit}>
                <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                <SelectContent>{INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Size</Label>
                <Select value={form.size_band ?? ""} onValueChange={(v) => set("size_band", v)} disabled={!canEdit}>
                  <SelectTrigger><SelectValue placeholder="Size" /></SelectTrigger>
                  <SelectContent>{COMPANY_SIZE_BANDS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-rev">Annual revenue</Label>
                <Input id="f-rev" type="number" value={form.annual_revenue ?? ""} onChange={(e) => set("annual_revenue", e.target.value)} disabled={!canEdit} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Lifecycle stage</Label>
              <Select value={form.lifecycle_stage ?? "lead"} onValueChange={(v) => set("lifecycle_stage", v)} disabled={!canEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LIFECYCLE_STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Select value={form.owner_user_id ?? ""} onValueChange={(v) => set("owner_user_id", v)} disabled={!canEdit}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {(members as any[]).map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || m.email || m.user_id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="f-email"><Mail className="mr-1 inline h-3 w-3" />Email</Label>
                <Input id="f-email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} disabled={!canEdit} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-phone"><Phone className="mr-1 inline h-3 w-3" />Phone</Label>
                <Input id="f-phone" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} disabled={!canEdit} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-addr">Address</Label>
              <Input id="f-addr" value={form.address_line1 ?? ""} onChange={(e) => set("address_line1", e.target.value)} disabled={!canEdit} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="f-city">City</Label>
                <Input id="f-city" value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} disabled={!canEdit} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-country">Country</Label>
                <Input id="f-country" value={form.country ?? ""} onChange={(e) => set("country", e.target.value)} disabled={!canEdit} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-desc">Description</Label>
              <Textarea id="f-desc" rows={3} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} disabled={!canEdit} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompanyProfile;
