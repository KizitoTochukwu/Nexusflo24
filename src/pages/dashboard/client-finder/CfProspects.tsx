import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Download, Loader2, MailCheck, Search, Sparkles, Upload, Users } from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import {
  useDiscoverCompanies, useDiscoverContacts, useIcps, useImportProspects, useProspectCompanies,
  useProspectContacts, useProviderConnections, useScoreFit, useUpdateCompanyStatus, useVerifyEmails,
  type ImportRow,
} from "@/hooks/useClientFinder";
import { autoMapHeaders, IMPORT_FIELDS, parseCsv, SAMPLE_CSV, type ImportFieldKey } from "@/lib/clientFinder/csv";
import { downloadCsv } from "@/lib/crm/csv";

export default function CfProspects() {
  const workspaceId = useWorkspaceId();
  const { data: companies = [], isLoading } = useProspectCompanies(workspaceId);
  const { data: contacts = [] } = useProspectContacts(workspaceId);
  const { data: icps = [] } = useIcps(workspaceId);
  const { data: providers = [] } = useProviderConnections(workspaceId);
  const importProspects = useImportProspects(workspaceId);
  const scoreFit = useScoreFit(workspaceId);
  const updateStatus = useUpdateCompanyStatus();
  const discoverCompanies = useDiscoverCompanies(workspaceId);
  const discoverContacts = useDiscoverContacts(workspaceId);
  const verifyEmails = useVerifyEmails(workspaceId);

  const capabilityReady = (capability: string) =>
    (providers as any[]).some((p) => p.capability === capability && p.status === "connected");
  const companyDiscoveryReady = capabilityReady("Company discovery");
  const contactDiscoveryReady = capabilityReady("Contact discovery");
  const verificationReady = capabilityReady("Email verification");

  const fileRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, ImportFieldKey | "">>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [selectedContacts, setSelectedContacts] = useState<Record<string, boolean>>({});
  const [icpId, setIcpId] = useState("");
  const [search, setSearch] = useState("");

  const approvedIcps = icps.filter((i) => i.approval_status === "approved");
  const contactsByCompany = useMemo(() => {
    const m: Record<string, number> = {};
    contacts.forEach((c) => {
      if (c.company_id) m[c.company_id] = (m[c.company_id] ?? 0) + 1;
    });
    return m;
  }, [contacts]);

  const visible = companies.filter((c) =>
    search
      ? `${c.name} ${c.domain ?? ""} ${c.industry ?? ""}`.toLowerCase().includes(search.toLowerCase())
      : true,
  );
  const selectedIds = Object.keys(selected).filter((k) => selected[k]);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length < 2) {
      toast.error("That file has no data rows");
      return;
    }
    setRows(parsed);
    setMapping(autoMapHeaders(parsed[0]));
    setImportOpen(true);
  };

  const handleImport = async () => {
    const [headers, ...body] = rows;
    const hasCompany = Object.values(mapping).includes("company_name");
    if (!hasCompany) {
      toast.error("Map a column to “Company name” before importing");
      return;
    }
    const payload: ImportRow[] = body.map((r) => {
      const obj: any = {};
      headers.forEach((_, i) => {
        const field = mapping[i];
        if (field) obj[field] = r[i]?.trim() ?? "";
      });
      return obj as ImportRow;
    });
    await importProspects.mutateAsync(payload);
    setImportOpen(false);
    setRows([]);
  };

  const handleScore = async () => {
    if (!icpId) {
      toast.error("Choose an approved ideal customer profile");
      return;
    }
    if (selectedIds.length === 0) {
      toast.error("Select at least one company");
      return;
    }
    await scoreFit.mutateAsync({ icp_id: icpId, company_ids: selectedIds.slice(0, 25) });
    setSelected({});
  };

  const handleDiscoverCompanies = async () => {
    if (!icpId) {
      toast.error("Choose an approved ideal customer profile to search with");
      return;
    }
    await discoverCompanies.mutateAsync({ icp_id: icpId, limit: 25 });
  };

  const handleDiscoverContacts = async () => {
    if (selectedIds.length === 0) {
      toast.error("Select at least one company");
      return;
    }
    await discoverContacts.mutateAsync({ company_ids: selectedIds.slice(0, 10), per_company: 3 });
  };

  const selectedContactIds = Object.keys(selectedContacts).filter((k) => selectedContacts[k]);

  const handleVerify = async () => {
    if (selectedContactIds.length === 0) {
      toast.error("Select at least one contact");
      return;
    }
    await verifyEmails.mutateAsync({ contact_ids: selectedContactIds.slice(0, 25) });
    setSelectedContacts({});
  };

  const exportCsv = () => {
    const header = "company_name,domain,industry,country,fit_score,fit_explanation,status\n";
    const body = visible
      .map((c) =>
        [c.name, c.domain, c.industry, c.country, c.fit_score, c.fit_explanation, c.status]
          .map((v) => {
            const s = v == null ? "" : String(v);
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(","),
      )
      .join("\n");
    downloadCsv("client-finder-prospects", header + body);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Where prospects come from</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            {companyDiscoveryReady
              ? "Company discovery runs through Apollo using an approved ideal customer profile. Every record keeps its source and the date it was added, and nothing is invented."
              : "Automated company discovery is not available yet — the Apollo connection has not passed a credential check. Import your own list below; every record keeps its source and the date it was added."}
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            {companyDiscoveryReady && (
              <Button onClick={handleDiscoverCompanies} disabled={discoverCompanies.isPending}>
                {discoverCompanies.isPending
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Search className="mr-2 h-4 w-4" />}
                Find companies with Apollo
              </Button>
            )}
            <Button
              variant={companyDiscoveryReady ? "outline" : "default"}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" /> Import CSV
            </Button>
            <Button variant="outline" onClick={() => downloadCsv("client-finder-template", SAMPLE_CSV)}>
              <Download className="mr-2 h-4 w-4" /> Download template
            </Button>
          </div>
        </CardContent>
      </Card>


      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">
            Companies <span className="text-muted-foreground">({companies.length})</span>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search prospects"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-48"
            />
            <Select value={icpId} onValueChange={setIcpId}>
              <SelectTrigger className="h-9 w-56">
                <SelectValue
                  placeholder={approvedIcps.length ? "Score against profile" : "No approved profile"}
                />
              </SelectTrigger>
              <SelectContent>
                {approvedIcps.map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleScore}
              disabled={scoreFit.isPending || approvedIcps.length === 0}
            >
              {scoreFit.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Score fit ({selectedIds.length})
            </Button>
            {contactDiscoveryReady && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDiscoverContacts}
                disabled={discoverContacts.isPending}
              >
                {discoverContacts.isPending
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Users className="mr-2 h-4 w-4" />}
                Find decision-makers ({selectedIds.length})
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={visible.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Loading prospects…</p>
          ) : visible.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">
              No prospects yet. Import a CSV to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Company</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Contacts</TableHead>
                    <TableHead>Fit</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Checkbox
                          checked={!!selected[c.id]}
                          onCheckedChange={(v) => setSelected({ ...selected, [c.id]: !!v })}
                          aria-label={`Select ${c.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{c.name}</p>
                        {c.domain && <p className="text-xs text-muted-foreground">{c.domain}</p>}
                      </TableCell>
                      <TableCell className="text-sm">{c.industry || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {[c.city, c.country].filter(Boolean).join(", ") || "—"}
                      </TableCell>
                      <TableCell className="text-sm">{contactsByCompany[c.id] ?? 0}</TableCell>
                      <TableCell className="max-w-[280px]">
                        {c.fit_score == null ? (
                          <span className="text-xs text-muted-foreground">Not scored</span>
                        ) : (
                          <div>
                            <Badge variant={c.fit_score >= 70 ? "default" : "secondary"}>{c.fit_score}</Badge>
                            {c.fit_explanation && (
                              <p className="mt-1 text-xs text-muted-foreground">{c.fit_explanation}</p>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.data_source.replace("_", " ")}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={c.status}
                          onValueChange={(v) => updateStatus.mutate({ id: c.id, status: v })}
                        >
                          <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="discovered">Discovered</SelectItem>
                            <SelectItem value="shortlisted">Shortlisted</SelectItem>
                            <SelectItem value="excluded">Excluded</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">
            Decision-makers <span className="text-muted-foreground">({contacts.length})</span>
          </CardTitle>
          {verificationReady && (
            <Button size="sm" variant="outline" onClick={handleVerify} disabled={verifyEmails.isPending}>
              {verifyEmails.isPending
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <MailCheck className="mr-2 h-4 w-4" />}
              Verify emails ({selectedContactIds.length})
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {contacts.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No contacts yet. Include contact columns in your CSV import{contactDiscoveryReady
                ? ", or select companies above and find their decision-makers." : "."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Name</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.slice(0, 100).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Checkbox
                          checked={!!selectedContacts[c.id]}
                          onCheckedChange={(v) => setSelectedContacts({ ...selectedContacts, [c.id]: !!v })}
                          aria-label={`Select ${c.full_name}`}
                          disabled={!c.email}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{c.full_name}</TableCell>
                      <TableCell className="text-sm">{c.job_title || "—"}</TableCell>
                      <TableCell className="text-sm">{c.email || "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            c.email_status === "deliverable" || c.email_status === "verified"
                              ? "default"
                              : c.email_status === "undeliverable"
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {c.email_status.replace("_", " ")}
                        </Badge>
                        {c.email_confidence != null && (
                          <span className="ml-2 text-xs text-muted-foreground">{c.email_confidence}%</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.data_source.replace("_", " ")}
                      </TableCell>

                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Map your CSV columns</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {rows.length > 1 ? `${rows.length - 1} data rows found.` : ""} Company name is required;
            everything else is optional.
          </p>
          <div className="grid gap-3">
            {(rows[0] ?? []).map((h, i) => (
              <div key={`${h}-${i}`} className="grid grid-cols-2 items-center gap-3">
                <Label className="truncate text-sm">{h || `Column ${i + 1}`}</Label>
                <Select
                  value={mapping[i] || "__skip"}
                  onValueChange={(v) =>
                    setMapping({ ...mapping, [i]: v === "__skip" ? "" : (v as ImportFieldKey) })
                  }
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__skip">Skip this column</SelectItem>
                    {IMPORT_FIELDS.map((f) => (
                      <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={importProspects.isPending}>
              {importProspects.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import prospects
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
