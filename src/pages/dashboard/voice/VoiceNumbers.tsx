import { useState } from "react";
import { Hash, Loader2, PhoneCall, RefreshCw, Search, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import {
  useVoiceNumbers, useVoiceAssistants, useVoiceNumberStatus, useSearchVoiceNumbers,
  useProviderVoiceNumbers, useBuyVoiceNumber, useImportVoiceNumber, useAssignVoiceNumber,
  useReleaseVoiceNumber, useCheckVoiceRouting,
  type VoiceAvailableNumber, type VoiceProviderNumber, type VoicePhoneNumber,
} from "@/hooks/useVoice";
import { VoiceEmptyState, VoiceSetupNotice, VoiceSection } from "@/components/voice/VoicePrimitives";
import { VOICE_PROVIDER_LABEL, VOICE_STARTER_ENTITLEMENT } from "@/lib/voice/constants";

const COUNTRIES = [
  { code: "GB", label: "United Kingdom" },
  { code: "US", label: "United States" },
  { code: "IE", label: "Ireland" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
];

const ROUTING_LABEL: Record<string, string> = {
  not_configured: "Not set up",
  pending: "Waiting on the calling service",
  configured: "Ready",
  error: "Problem — check again",
};

export default function VoiceNumbers() {
  const workspaceId = useWorkspaceId();
  const { data: numbers = [], isLoading } = useVoiceNumbers(workspaceId);
  const { data: assistants = [] } = useVoiceAssistants(workspaceId);
  const { data: status, isLoading: statusLoading } = useVoiceNumberStatus(workspaceId);

  const search = useSearchVoiceNumbers(workspaceId);
  const providerNumbers = useProviderVoiceNumbers(workspaceId);
  const buy = useBuyVoiceNumber(workspaceId);
  const importNumber = useImportVoiceNumber(workspaceId);
  const assign = useAssignVoiceNumber(workspaceId);
  const release = useReleaseVoiceNumber(workspaceId);
  const checkRouting = useCheckVoiceRouting(workspaceId);

  const [addOpen, setAddOpen] = useState(false);
  const [country, setCountry] = useState("GB");
  const [contains, setContains] = useState("");
  const [results, setResults] = useState<VoiceAvailableNumber[]>([]);
  const [existing, setExisting] = useState<VoiceProviderNumber[]>([]);
  const [toRemove, setToRemove] = useState<VoicePhoneNumber | null>(null);
  const [releaseAtProvider, setReleaseAtProvider] = useState(true);

  const connected = !!status?.connected;
  const atLimit = (status?.numbers_in_use ?? numbers.length) >= (status?.max_numbers ?? 1);

  const runSearch = () =>
    search.mutate({ country, contains: contains.trim() || undefined }, { onSuccess: (r) => setResults(r.results ?? []) });

  const openAdd = (open: boolean) => {
    setAddOpen(open);
    if (open) {
      setResults([]);
      setExisting([]);
      providerNumbers.mutate(undefined, { onSuccess: (r) => setExisting(r.results ?? []) });
    }
  };

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Phone Numbers</h1>
          <p className="text-sm text-muted-foreground">The numbers your receptionist answers on.</p>
        </div>
        <Dialog open={addOpen} onOpenChange={openAdd}>
          <DialogTrigger asChild>
            <Button className="rounded-full" disabled={!connected || atLimit}>
              <PhoneCall className="mr-2 h-4 w-4" /> Add a number
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add a phone number</DialogTitle>
              <DialogDescription>
                Find a new number to buy, or use one you already own. Only numbers that can take calls are shown.
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="buy">
              <TabsList>
                <TabsTrigger value="buy">Find a new number</TabsTrigger>
                <TabsTrigger value="existing">Use one I already have</TabsTrigger>
              </TabsList>

              <TabsContent value="buy" className="space-y-3 pt-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1.5">
                    <Label>Country</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="vn-contains">Digits to look for (optional)</Label>
                    <Input id="vn-contains" value={contains} onChange={(e) => setContains(e.target.value)}
                      placeholder="e.g. 2020" className="w-[200px]" />
                  </div>
                  <Button variant="secondary" className="rounded-full" onClick={runSearch} disabled={search.isPending}>
                    {search.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                    Search
                  </Button>
                </div>
                <div className="max-h-72 space-y-2 overflow-y-auto">
                  {results.length === 0 && !search.isPending ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Search to see numbers available right now.
                    </p>
                  ) : results.map((n) => (
                    <div key={n.phone_number} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{n.friendly_name || n.phone_number}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[n.locality, n.region, n.country].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <Button size="sm" className="rounded-full" disabled={buy.isPending}
                        onClick={() => buy.mutate({ action: "buy", phone_number: n.phone_number }, { onSuccess: () => setAddOpen(false) })}>
                        Get this number
                      </Button>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="existing" className="space-y-2 pt-3">
                {providerNumbers.isPending ? (
                  <Skeleton className="h-24 w-full rounded-xl" />
                ) : existing.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No call-capable numbers found on your account.
                  </p>
                ) : (
                  <div className="max-h-72 space-y-2 overflow-y-auto">
                    {existing.map((n) => (
                      <div key={n.sid} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-4 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{n.phone_number}</p>
                          <p className="truncate text-xs text-muted-foreground">{n.friendly_name}</p>
                        </div>
                        <Button size="sm" variant="secondary" className="rounded-full"
                          disabled={n.already_added || importNumber.isPending}
                          onClick={() => importNumber.mutate({ action: "import", provider_sid: n.sid }, { onSuccess: () => setAddOpen(false) })}>
                          {n.already_added ? "Already added" : "Use this number"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <VoiceSetupNotice compact />

      <VoiceSection
        title="Telephone connection"
        description={`Calls are supplied by ${VOICE_PROVIDER_LABEL}.`}
      >
        {statusLoading ? (
          <Skeleton className="h-16 w-full rounded-xl" />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {connected ? `Connected${status?.account_name ? ` — ${status.account_name}` : ""}` : "Not connected"}
              </p>
              <p className="text-xs text-muted-foreground">
                {connected
                  ? status?.credentials_source === "workspace"
                    ? "Using this workspace's own telephone account."
                    : "Using the NexusFlo24 telephone account."
                  : "Add your telephone account details in Settings → Channels before buying a number."}
              </p>
            </div>
            <Badge variant="secondary">
              {status ? `${status.numbers_in_use} of ${status.max_numbers} numbers used` : "—"}
            </Badge>
          </div>
        )}
      </VoiceSection>

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : numbers.length === 0 ? (
        <VoiceEmptyState
          icon={Hash}
          title="No phone numbers yet"
          description={`Numbers are supplied through ${VOICE_PROVIDER_LABEL}, starting with UK numbers. Add one here, then choose which receptionist answers it. Calls start being answered once the calling service is connected.`}
        />
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Answered by</TableHead>
                  <TableHead>Call routing</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {numbers.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell>
                      <p className="font-medium">{n.phone_number}</p>
                      <p className="text-xs capitalize text-muted-foreground">{n.provider}{n.country ? ` · ${n.country}` : ""}</p>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={n.assistant_id ?? "none"}
                        onValueChange={(v) => assign.mutate({ action: "assign", number_id: n.id, assistant_id: v === "none" ? null : v })}
                      >
                        <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nobody yet</SelectItem>
                          {assistants.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ROUTING_LABEL[n.webhook_status] ?? n.webhook_status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="rounded-full"
                        onClick={() => checkRouting.mutate({ action: "check_routing", number_id: n.id })}>
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Check
                      </Button>
                      <Button variant="ghost" size="sm" className="rounded-full text-destructive"
                        onClick={() => { setToRemove(n); setReleaseAtProvider(true); }}>
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <VoiceSection title="What your plan allows" description="Limits are stored per workspace, so they can be changed without a code release.">
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li>{status?.max_numbers ?? VOICE_STARTER_ENTITLEMENT.maxNumbers} phone number</li>
          <li>{VOICE_STARTER_ENTITLEMENT.maxAssistants} active assistant</li>
          <li>{VOICE_STARTER_ENTITLEMENT.maxConcurrentCalls} call at a time</li>
          <li>{VOICE_STARTER_ENTITLEMENT.includedMinutes} included minutes each billing period</li>
        </ul>
      </VoiceSection>

      <AlertDialog open={!!toRemove} onOpenChange={(o) => !o && setToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {toRemove?.phone_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              Your receptionist will stop answering this number. Giving the number up cannot be undone — you may not be able to get it back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="flex items-start gap-2.5 rounded-xl border border-border/60 px-4 py-3 text-sm">
            <Checkbox checked={releaseAtProvider} onCheckedChange={(v) => setReleaseAtProvider(v === true)} className="mt-0.5" />
            <span>
              Give the number up completely
              <span className="block text-xs text-muted-foreground">
                Leave this unticked to keep the number on your telephone account and only remove it from Voice.
              </span>
            </span>
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toRemove) {
                  release.mutate({ action: "release", number_id: toRemove.id, release_at_provider: releaseAtProvider });
                }
                setToRemove(null);
              }}
            >
              Remove number
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
