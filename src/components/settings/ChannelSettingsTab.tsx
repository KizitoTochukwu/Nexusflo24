import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useWhatsAppConnection } from "@/hooks/useWhatsAppConnection";
import { toast } from "sonner";
import { interpolateText, previewVars } from "@/lib/messaging/interpolate";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApprovedWhatsAppTemplates, useWhatsAppSettings, useUpdateDefaultReengagementTemplate } from "@/hooks/useWhatsAppTemplates";
import { WhatsAppConnectCard } from "@/components/settings/WhatsAppConnectCard";
import {
  Mail, Smartphone, MessageCircle, Loader2, Save, ChevronDown,
  CheckCircle2, XCircle, Unplug, Send, Globe, Copy, RefreshCw,
  Phone, ShieldCheck, ExternalLink, ArrowRight, ArrowLeft, Sparkles,
  Sparkle, Server, KeyRound,
} from "lucide-react";

interface ChannelStatus {
  configured: boolean;
  is_active: boolean;
  masked: Record<string, string>;
  non_secret?: Record<string, string>;
  updated_at: string | null;
}

// ── Resend Domain Verification Panel ──
function ResendDomainPanel({ workspaceId }: { workspaceId: string }) {
  const [domainInput, setDomainInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [domains, setDomains] = useState<any[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<any>(null);
  const [fetching, setFetching] = useState(false);

  const readFunctionPayload = async (response: Response) => {
    try {
      return await response.clone().json();
    } catch {
      try {
        const text = await response.text();
        return text ? { error: text } : {};
      } catch {
        return {};
      }
    }
  };

  const callDomainApi = async (body: Record<string, any>) => {
    const { data: auth } = await supabase.auth.getSession();
    const accessToken = auth.session?.access_token;

    if (!accessToken) {
      throw new Error("Your session has expired. Please sign in again and retry.");
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resend-domain-verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ workspaceId, ...body }),
    });

    const payload = await readFunctionPayload(response);
    const message = payload?.error || payload?.details;

    if (!response.ok) {
      throw new Error(message || `Domain request failed (${response.status})`);
    }

    return payload;
  };

  const fetchDomains = async () => {
    setFetching(true);
    try {
      const res = await callDomainApi({ action: "list" });
      setDomains(res.domains || []);
    } catch { /* ignore */ }
    setFetching(false);
  };

  useEffect(() => { fetchDomains(); }, [workspaceId]);

  const addDomain = async () => {
    if (!domainInput.trim()) return;
    setLoading(true);
    try {
      const res = await callDomainApi({ action: "add", domain: domainInput.trim() });
      toast.success("Domain added! Configure the DNS records below.");
      setSelectedDomain(res.domain);
      setDomainInput("");
      await fetchDomains();
    } catch (err: any) {
      toast.error(err.message || "Failed to add domain");
    }
    setLoading(false);
  };

  const verifyDomain = async (domainId: string) => {
    setLoading(true);
    try {
      const res = await callDomainApi({ action: "verify", domainId });
      if (res?.domain) {
        setSelectedDomain(res.domain);
        if (res.domain.status === "verified") {
          toast.success("Domain verified! ✅");
        } else if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success("Verification check complete. Review DNS records below.");
        }
      } else {
        toast.success("Verification check initiated.");
      }
      await fetchDomains();
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const statusColor = (status: string) => {
    if (status === "verified") return "text-emerald-600";
    if (status === "pending") return "text-amber-600";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-accent" />
        <span className="text-sm font-medium">Domain Verification</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Verify your sending domain for better deliverability. Add DNS records to prove ownership.
      </p>

      {/* Domain list */}
      {domains.length > 0 && (
        <div className="space-y-2">
          {domains.map((d: any) => (
            <div key={d.id} className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="text-sm font-medium">{d.name}</p>
                <p className={`text-xs ${statusColor(d.status)}`}>
                  {d.status === "verified" ? "✓ Verified" : d.status === "pending" ? "⏳ Pending DNS" : d.status}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      const res = await callDomainApi({ action: "status", domainId: d.id });
                      setSelectedDomain(res.domain);
                    } catch (err: any) {
                      toast.error(err.message || "Failed to load DNS records");
                    }
                  }}
                >
                  DNS Records
                </Button>
                {d.status !== "verified" && (
                  <Button variant="outline" size="sm" onClick={() => verifyDomain(d.id)} disabled={loading}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />Verify
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DNS Records for selected domain */}
      {selectedDomain?.records && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-2">
          <p className="text-xs font-medium">Add these DNS records to <strong>{selectedDomain.name}</strong>:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 px-2 text-muted-foreground">Type</th>
                  <th className="text-left py-1 px-2 text-muted-foreground">Name</th>
                  <th className="text-left py-1 px-2 text-muted-foreground">Value</th>
                  <th className="text-left py-1 px-2 text-muted-foreground">Status</th>
                  <th className="py-1 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {selectedDomain.records.map((r: any, i: number) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-1.5 px-2 font-mono">{r.type}</td>
                    <td className="py-1.5 px-2 font-mono text-xs max-w-[150px] truncate">{r.name}</td>
                    <td className="py-1.5 px-2 font-mono text-xs max-w-[200px] truncate">{r.value}</td>
                    <td className={`py-1.5 px-2 ${statusColor(r.status)}`}>{r.status}</td>
                    <td className="py-1.5 px-2">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(r.value)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add new domain */}
      <div className="flex gap-2">
        <Input
          value={domainInput}
          onChange={(e) => setDomainInput(e.target.value)}
          placeholder="yourdomain.com"
          className="max-w-[250px]"
          maxLength={100}
        />
        <Button size="sm" onClick={addDomain} disabled={loading || !domainInput.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Globe className="h-4 w-4 mr-1" />}
          Add Domain
        </Button>
        <Button variant="ghost" size="sm" onClick={fetchDomains} disabled={fetching}>
          <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} />
        </Button>
      </div>
    </div>
  );
}

// ── Twilio Subaccount Panel ──
function TwilioSubaccountPanel({ workspaceId }: { workspaceId: string }) {
  const [provisioning, setProvisioning] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState<any[]>([]);
  const [subaccountSid, setSubaccountSid] = useState<string | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [provisionedNumber, setProvisionedNumber] = useState<string | null>(null);

  const provisionSubaccount = async () => {
    setProvisioning(true);
    try {
      const { data, error } = await supabase.functions.invoke("twilio-provision-subaccount", {
        body: { workspaceId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSubaccountSid(data.subaccount_sid);
      setAvailableNumbers(data.available_numbers || []);
      toast.success(`Subaccount "${data.friendly_name}" created! Choose a phone number below.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to provision subaccount");
    }
    setProvisioning(false);
  };

  const buyNumber = async (phoneNumber: string) => {
    setBuying(phoneNumber);
    try {
      const { data, error } = await supabase.functions.invoke("twilio-buy-number", {
        body: { workspaceId, phoneNumber },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setProvisionedNumber(data.phone_number);
      toast.success(`Number ${data.phone_number} purchased and configured!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to purchase number");
    }
    setBuying(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Phone className="h-4 w-4 text-accent" />
        <span className="text-sm font-medium">Auto-Provision SMS</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Automatically create a dedicated Twilio subaccount for this workspace with its own phone number. Billing is centralized through your master Twilio account.
      </p>

      {provisionedNumber ? (
        <div className="flex items-center gap-2 rounded-md border border-accent/30 bg-accent/5 px-3 py-2">
          <CheckCircle2 className="h-4 w-4 text-accent" />
          <span className="text-sm">Provisioned: <strong className="font-mono">{provisionedNumber}</strong></span>
        </div>
      ) : subaccountSid ? (
        <div className="space-y-2">
          <Badge variant="outline" className="text-xs">Subaccount: {subaccountSid}</Badge>
          {availableNumbers.length > 0 ? (
            <>
              <p className="text-xs text-muted-foreground">Select a phone number to purchase:</p>
              <div className="grid gap-1.5">
                {availableNumbers.map((n) => (
                  <div key={n.phone_number} className="flex items-center justify-between rounded-md border px-3 py-1.5">
                    <div>
                      <span className="font-mono text-sm">{n.phone_number}</span>
                      {n.locality && (
                        <span className="text-xs text-muted-foreground ml-2">{n.locality}, {n.region}</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => buyNumber(n.phone_number)}
                      disabled={buying === n.phone_number}
                    >
                      {buying === n.phone_number ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Purchase"}
                    </Button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No numbers available. Enter your credentials manually below.</p>
          )}
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={provisionSubaccount} disabled={provisioning}>
          {provisioning ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Phone className="h-4 w-4 mr-1" />}
          Provision Subaccount
        </Button>
      )}
    </div>
  );
}

// ── WhatsApp Onboarding Wizard ──
function WhatsAppWizard({ onComplete }: { onComplete: (config: Record<string, string>) => void }) {
  const [step, setStep] = useState(0);
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [verifyToken, setVerifyToken] = useState("");

  const steps = [
    {
      title: "Create a Meta App",
      description: "Go to Meta for Developers and create a new app with 'Business' type.",
      instructions: [
        "Visit developers.facebook.com and log in",
        "Click 'Create App' → select 'Business' type",
        "Give it a name (e.g., 'My Company WhatsApp')",
        "On the app dashboard, find 'WhatsApp' and click 'Set Up'",
      ],
      link: "https://developers.facebook.com/apps/",
    },
    {
      title: "Get Your Access Token",
      description: "Generate a permanent access token from the WhatsApp API Setup page.",
      instructions: [
        "In your Meta App, go to WhatsApp → API Setup",
        "Under 'Temporary access token', click 'Generate'",
        "For production, create a System User token in Business Settings",
        "Copy the access token and paste it below",
      ],
      link: "https://business.facebook.com/settings/system-users",
      field: {
        label: "Access Token",
        value: accessToken,
        onChange: setAccessToken,
        placeholder: "EAAxxxxxxx...",
        type: "password",
      },
    },
    {
      title: "Get Phone Number ID",
      description: "Find your WhatsApp Business phone number ID.",
      instructions: [
        "In WhatsApp → API Setup, find the 'Phone number ID'",
        "It's listed under the phone number you want to use",
        "This is a numeric ID (not the phone number itself)",
        "Copy and paste it below",
      ],
      field: {
        label: "Phone Number ID",
        value: phoneNumberId,
        onChange: setPhoneNumberId,
        placeholder: "123456789012345",
        type: "text",
      },
    },
    {
      title: "Set Up Webhook",
      description: "Configure a verify token and set up the webhook endpoint.",
      instructions: [
        "Create a unique verify token (any random string)",
        "In WhatsApp → Configuration → Webhook, add:",
        `Callback URL: ${window.location.origin}/api/whatsapp-webhook`,
        "Paste your verify token in the 'Verify token' field",
        "Subscribe to: messages, message_deliveries, message_reads",
      ],
      field: {
        label: "Verify Token",
        value: verifyToken,
        onChange: setVerifyToken,
        placeholder: "my-secret-verify-token",
        type: "password",
      },
    },
    {
      title: "All Set!",
      description: "Your WhatsApp Business credentials are ready. Click 'Complete Setup' to save.",
      instructions: [
        "Access Token: " + (accessToken ? "✅ Provided" : "❌ Missing"),
        "Phone Number ID: " + (phoneNumberId ? "✅ Provided" : "❌ Missing"),
        "Verify Token: " + (verifyToken ? "✅ Provided" : "❌ Missing"),
      ],
    },
  ];

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;
  const canProceed = step === 0 || step === 4 || currentStep.field?.value;

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-1">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-accent" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">Step {step + 1}/{steps.length}</Badge>
          <h4 className="text-sm font-semibold">{currentStep.title}</h4>
        </div>
        <p className="text-xs text-muted-foreground">{currentStep.description}</p>
      </div>

      {/* Instructions */}
      <ol className="space-y-1.5 text-xs pl-4">
        {currentStep.instructions.map((inst, i) => (
          <li key={i} className="list-decimal text-foreground/80">{inst}</li>
        ))}
      </ol>

      {/* External link */}
      {currentStep.link && (
        <a href={currentStep.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
          <ExternalLink className="h-3 w-3" />Open in new tab
        </a>
      )}

      {/* Input field */}
      {currentStep.field && (
        <div className="space-y-1">
          <Label className="text-xs">{currentStep.field.label}</Label>
          <Input
            type={currentStep.field.type}
            value={currentStep.field.value}
            onChange={(e) => currentStep.field!.onChange(e.target.value)}
            placeholder={currentStep.field.placeholder}
            maxLength={500}
          />
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />Back
        </Button>
        {isLastStep ? (
          <Button
            size="sm"
            onClick={() => onComplete({ access_token: accessToken, phone_number_id: phoneNumberId, verify_token: verifyToken })}
            disabled={!accessToken || !phoneNumberId || !verifyToken}
          >
            <ShieldCheck className="h-4 w-4 mr-1" />Complete Setup
          </Button>
        ) : (
          <Button size="sm" onClick={() => setStep(step + 1)} disabled={!canProceed}>
            Next<ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ── WhatsApp Re-engagement Template Picker ──
// Lets the workspace pick a default APPROVED Marketing template that the
// backend will auto-send (with the user's text in {{1}}) whenever an
// outbound free-form WhatsApp message lands outside the 24h window.
// This is what makes the channel "feel automatic" — same behavior as
// HubSpot / ManyChat / Wati.
function ReengagementTemplatePicker({ workspaceId }: { workspaceId: string }) {
  const { data: settings, isLoading: settingsLoading } = useWhatsAppSettings(workspaceId);
  const { data: templates = [], isLoading: tplLoading } = useApprovedWhatsAppTemplates(workspaceId);
  const updateMut = useUpdateDefaultReengagementTemplate(workspaceId);

  const currentId = settings?.default_reengagement_template_id || "";
  const marketingTpls = templates.filter((t) => t.category?.toUpperCase() === "MARKETING" || t.category?.toUpperCase() === "UTILITY");

  return (
    <div className="space-y-2 rounded-md border border-accent/30 bg-accent/5 p-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" />
        <Label className="text-sm font-semibold text-foreground">
          Default re-engagement template
        </Label>
        <Badge variant="outline" className="text-[10px] h-4">Auto-recover</Badge>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        WhatsApp blocks free-form text outside the 24h customer-care window.
        When set, we'll automatically send this approved template instead and
        inject your message into the <code className="text-[11px] bg-muted px-1 rounded">{`{{1}}`}</code> body
        variable. Meta charges ~£0.04 per re-engagement conversation.
      </p>

      {settingsLoading || tplLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading templates…
        </div>
      ) : marketingTpls.length === 0 ? (
        <div className="text-xs text-amber-900 bg-amber-50 border border-amber-300/60 rounded p-2">
          No approved Marketing or Utility templates yet. Add one in{" "}
          <strong>Settings → WhatsApp Templates</strong> first, then come back here.
        </div>
      ) : (
        <div className="flex gap-2 items-center">
          <Select
            value={currentId || "none"}
            onValueChange={(v) => updateMut.mutate(v === "none" ? null : v)}
            disabled={updateMut.isPending}
          >
            <SelectTrigger className="flex-1 h-9 text-sm">
              <SelectValue placeholder="Select a template…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— None (let sends fail outside 24h) —</SelectItem>
              {marketingTpls.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} <span className="text-muted-foreground">· {t.language} · {t.variable_count} vars</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {updateMut.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      )}
    </div>
  );
}

// ── Main Component ──
export default function ChannelSettingsTab({ workspaceId }: { workspaceId: string }) {
  const [channels, setChannels] = useState<Record<string, ChannelStatus> | null>(null);
  const [loading, setLoading] = useState(true);

  // Email fields
  const [emailProvider, setEmailProvider] = useState<"resend" | "sendgrid">("resend");
  const [emailApiKey, setEmailApiKey] = useState("");
  const [emailFrom, setEmailFrom] = useState("");
  const [emailFromName, setEmailFromName] = useState("");
  const [emailReplyTo, setEmailReplyTo] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);

  // SMS fields
  const [smsAccountSid, setSmsAccountSid] = useState("");
  const [smsAuthToken, setSmsAuthToken] = useState("");
  const [smsFromNumber, setSmsFromNumber] = useState("");
  const [smsSaving, setSmsSaving] = useState(false);

  // WhatsApp fields
  const [waSaving, setWaSaving] = useState(false);
  const [showWaWizard, setShowWaWizard] = useState(false);
  const [waAccessToken, setWaAccessToken] = useState("");
  const [waPhoneNumberId, setWaPhoneNumberId] = useState("");
  const [waVerifyToken, setWaVerifyToken] = useState("");

  // Test states
  const [emailTestTo, setEmailTestTo] = useState("");
  const [emailTestSending, setEmailTestSending] = useState(false);
  const [smsTestTo, setSmsTestTo] = useState("");
  const [smsTestSending, setSmsTestSending] = useState(false);
  const [waTestTo, setWaTestTo] = useState("");
  const [waTestMsg, setWaTestMsg] = useState("");
  const [waTestSending, setWaTestSending] = useState(false);
  const [disconnectTarget, setDisconnectTarget] = useState<string | null>(null);

  // Live WhatsApp connection (Meta) status — used for the header pill row.
  const { data: waConn } = useWhatsAppConnection(workspaceId);

  // Draft key for unsaved input persistence (per workspace, per browser session).
  const draftKey = `nf24:channelDraft:${workspaceId}`;

  // Restore any unsaved input from the current browser session immediately so
  // returning to this page (or a remount) doesn't wipe in-progress credentials.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (typeof d.emailProvider === "string") setEmailProvider(d.emailProvider === "sendgrid" ? "sendgrid" : "resend");
      if (typeof d.emailApiKey === "string") setEmailApiKey(d.emailApiKey);
      if (typeof d.emailFrom === "string") setEmailFrom(d.emailFrom);
      if (typeof d.emailFromName === "string") setEmailFromName(d.emailFromName);
      if (typeof d.emailReplyTo === "string") setEmailReplyTo(d.emailReplyTo);
      if (typeof d.smsAccountSid === "string") setSmsAccountSid(d.smsAccountSid);
      if (typeof d.smsAuthToken === "string") setSmsAuthToken(d.smsAuthToken);
      if (typeof d.smsFromNumber === "string") setSmsFromNumber(d.smsFromNumber);
      if (typeof d.waAccessToken === "string") setWaAccessToken(d.waAccessToken);
      if (typeof d.waPhoneNumberId === "string") setWaPhoneNumberId(d.waPhoneNumberId);
      if (typeof d.waVerifyToken === "string") setWaVerifyToken(d.waVerifyToken);
    } catch { /* ignore */ }
  }, [draftKey]);

  // Persist a draft snapshot whenever fields change so it survives remounts.
  useEffect(() => {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({
        emailProvider, emailApiKey, emailFrom, emailFromName, emailReplyTo,
        smsAccountSid, smsAuthToken, smsFromNumber,
        waAccessToken, waPhoneNumberId, waVerifyToken,
      }));
    } catch { /* ignore */ }
  }, [draftKey, emailProvider, emailApiKey, emailFrom, emailFromName, emailReplyTo, smsAccountSid, smsAuthToken, smsFromNumber, waAccessToken, waPhoneNumberId, waVerifyToken]);

  const clearChannelDraft = (channel: string) => {
    if (channel === "email") {
      setEmailApiKey("");
    } else if (channel === "sms") {
      setSmsAccountSid(""); setSmsAuthToken("");
    } else if (channel === "whatsapp") {
      setWaAccessToken(""); setWaVerifyToken("");
    }
  };

  useEffect(() => { fetchStatus(); }, [workspaceId]);

  const readFunctionPayload = async (response: Response) => {
    try {
      return await response.clone().json();
    } catch {
      const text = await response.text().catch(() => "");
      return text ? { error: text } : {};
    }
  };

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/channel-settings-get?workspaceId=${workspaceId}`,
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setChannels(data);
        // Hydrate non-secret form fields so they persist across reloads
        const eNS = data?.email?.non_secret || {};
        if (eNS.provider !== undefined) setEmailProvider(eNS.provider === "sendgrid" ? "sendgrid" : "resend");
        if (eNS.from_email !== undefined) setEmailFrom(eNS.from_email || "");
        if (eNS.from_name !== undefined) setEmailFromName(eNS.from_name || "");
        if (eNS.reply_to !== undefined) setEmailReplyTo(eNS.reply_to || "");
        const sNS = data?.sms?.non_secret || {};
        if (sNS.from_number !== undefined) setSmsFromNumber(sNS.from_number || "");
        const wNS = data?.whatsapp_by_provider?.meta?.non_secret || data?.whatsapp?.non_secret || {};
        if (wNS.phone_number_id !== undefined) setWaPhoneNumberId(wNS.phone_number_id || "");
      }
    } catch { /* ignore */ }
    setLoading(false);
  };


  const saveChannel = async (channel: string, config: Record<string, string>, setSaving: (v: boolean) => void) => {
    setSaving(true);
    try {
      const cleanedConfig = Object.fromEntries(
        Object.entries(config).map(([key, value]) => [key, value.trim()])
      );

      if (channel === "sms") {
        const alreadyConfigured = !!channels?.sms?.configured;
        if (cleanedConfig.account_sid && !/^AC[0-9a-fA-F]{32}$/.test(cleanedConfig.account_sid)) {
          throw new Error("Account SID must start with AC and be 34 characters long.");
        }
        if (cleanedConfig.auth_token && !/^[0-9a-fA-F]{32}$/.test(cleanedConfig.auth_token)) {
          throw new Error("Auth Token must be exactly 32 characters from the matching Twilio account.");
        }
        if (!alreadyConfigured && (!cleanedConfig.account_sid || !cleanedConfig.auth_token)) {
          throw new Error("Enter both Account SID and Auth Token.");
        }
        if (!cleanedConfig.from_number) {
          throw new Error("Enter a From Number or Messaging Service SID.");
        }
      }


      const session = (await supabase.auth.getSession()).data.session;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/channel-settings-save`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workspaceId, channel, config: cleanedConfig }),
      });
      const data = await readFunctionPayload(response);
      if (!response.ok) throw new Error(data?.error || `Save failed (${response.status})`);
      if (data?.error) throw new Error(data.error);
      toast.success(`${channel.charAt(0).toUpperCase() + channel.slice(1)} credentials saved.`);
      clearChannelDraft(channel);
      await fetchStatus();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const disconnectChannel = async (channel: string) => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/channel-settings-save`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ workspaceId, channel, disconnect: true }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to disconnect");
      }
      toast.success(`${channel} disconnected.`);
      clearChannelDraft(channel);
      await fetchStatus();
    } catch (err: any) {
      toast.error(err.message || "Failed to disconnect");
    }
  };

  const handleTestEmail = async () => {
    if (!emailTestTo) { toast.error("Enter test email"); return; }
    setEmailTestSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("email-send", {
        body: { workspaceId, to: emailTestTo, subject: "NexusFlo24 Test Email ✅", html: "<h2>Test Email</h2><p>Your custom email integration is working!</p>" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Test email sent!");
    } catch (err: any) { toast.error(err.message || "Failed"); }
    finally { setEmailTestSending(false); }
  };

  const handleTestSms = async () => {
    if (!smsTestTo) { toast.error("Enter test phone"); return; }
    setSmsTestSending(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sms-send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workspaceId, to: smsTestTo.trim(), message: "NexusFlo24 Test SMS ✅ Your custom SMS is working!", preview: true }),
      });
      const data = await readFunctionPayload(response);
      if (!response.ok) throw new Error(data?.error || `SMS test failed (${response.status})`);
      if (data?.error) throw new Error(data.error);
      toast.success("Test SMS sent!");
    } catch (err: any) { toast.error(err.message || "Failed"); }
    finally { setSmsTestSending(false); }
  };

  const handleTestWhatsApp = async () => {
    if (!waTestTo || !waTestMsg) { toast.error("Enter phone and message"); return; }
    setWaTestSending(true);
    setWaTestSubmission(null);
    try {
      // Render any {{first_name}}, {{company}}, etc. with sample values so the
      // test recipient sees real text instead of literal placeholders.
      const renderedBody = interpolateText(waTestMsg, previewVars());
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: { workspaceId, to: waTestTo, type: "text", body: renderedBody, preview: true },
      });
      if (error) throw error;
      // Surface structured failures (window_closed, credential errors, etc.)
      // so workspace admins immediately see WHY a send didn't reach the
      // recipient instead of a generic "delivered" toast.
      if (data?.success === false) {
        if (data.reason === "window_closed") {
          toast.error("24h window closed — recipient must message you first, or send an approved template. Test number unaffected.", { duration: 10000 });
        } else {
          toast.error(data.error || "WhatsApp send failed");
        }
        return;
      }
      if (data?.error) throw new Error(data.error);
      toast.success(`Test WhatsApp sent! ${data?.credentialSource === "workspace" ? "(your credentials)" : "(platform credentials)"}`);
    } catch (err: any) { toast.error(err.message || "Failed"); }
    finally { setWaTestSending(false); }
  };

  const StatusIndicator = ({ ch }: { ch: ChannelStatus | undefined }) => {
    if (!ch?.configured || !ch.is_active) {
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <XCircle className="h-3.5 w-3.5" /> Using platform default
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-600">
        <CheckCircle2 className="h-3.5 w-3.5" /> Workspace sender active
      </span>
    );
  };

  // Pill badge for the page header summary row
  const SummaryPill = ({
    label,
    active,
    activeText,
    inactiveText,
  }: { label: string; active: boolean; activeText: string; inactiveText: string }) => (
    <div className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          active
            ? "inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 font-medium text-emerald-700 border border-emerald-500/20"
            : "inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 font-medium text-muted-foreground border"
        }
      >
        <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
        {active ? activeText : inactiveText}
      </span>
    </div>
  );

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const emailConnected = !!(channels?.email?.configured && channels?.email?.is_active);
  const smsConnected = !!(channels?.sms?.configured && channels?.sms?.is_active);
  const whatsappConnected = !!((waConn?.configured && waConn?.is_active) || (channels?.whatsapp?.configured && channels?.whatsapp?.is_active));
  const senderModeCustom = emailConnected || smsConnected || whatsappConnected;

  // Default-open accordion: first not-configured section so the user
  // immediately sees what still needs setup.
  const defaultOpen =
    !emailConnected ? "email" :
    !smsConnected ? "sms" :
    !whatsappConnected ? "whatsapp" :
    "platform";

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="space-y-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Communication Settings
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Connect email, SMS, WhatsApp, and sender credentials for your workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SummaryPill label="Email" active={emailConnected} activeText="Connected" inactiveText="Not connected" />
          <SummaryPill label="SMS" active={smsConnected} activeText="Connected" inactiveText="Not connected" />
          <SummaryPill label="WhatsApp" active={whatsappConnected} activeText="Connected" inactiveText="Not connected" />
          <SummaryPill
            label="Sender mode"
            active={senderModeCustom}
            activeText="Workspace sender"
            inactiveText="Platform default"
          />
        </div>
      </div>

      {/* ── Bring Your Own Sender banner ────────────────────── */}
      <div className="relative overflow-hidden rounded-xl border border-amber-400/40 bg-gradient-to-br from-amber-50 via-white to-amber-50/40 p-5 shadow-sm">
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-400 to-amber-600" />
        <div className="flex items-start gap-3 pl-2">
          <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <Sparkle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">Bring Your Own Sender</h3>
            <p className="text-xs text-foreground/70 leading-relaxed">
              Connect your own email domain, SMS credentials, or WhatsApp Business number.
              If not configured, NexusFlo24 will use the platform default sending credentials.
            </p>
          </div>
        </div>
      </div>

      {/* ── Channel accordion ───────────────────────────────── */}
      <Accordion type="single" collapsible defaultValue={defaultOpen} className="space-y-3">

        {/* ── Email ─────────────────────────── */}
        <AccordionItem value="email" className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 [&[data-state=open]>div>svg.chev]:rotate-180">
            <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5 text-amber-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">Email</span>
                  {emailConnected ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px]">
                      {(channels?.email?.non_secret?.provider === "sendgrid" ? "SendGrid" : "Resend")} · Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Not connected</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  Send transactional and campaign emails from your verified sending domain.
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 pt-0">
            <div className="space-y-4">
              {channels?.email?.configured && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Active credentials</div>
                  <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {Object.entries(channels.email.masked).map(([k, v]) => (
                      <div key={k} className="flex gap-2"><span className="text-muted-foreground">{k}:</span><span className="font-mono truncate">{v}</span></div>
                    ))}
                  </div>
                </div>
              )}

              {/* Domain verification */}
              {emailProvider === "resend" && <ResendDomainPanel workspaceId={workspaceId} />}

              <Separator />

              {/* Provider + credentials */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Provider</Label>
                  <Select value={emailProvider} onValueChange={(v) => setEmailProvider(v as "resend" | "sendgrid")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resend">Resend</SelectItem>
                      <SelectItem value="sendgrid">SendGrid (Twilio)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{emailProvider === "sendgrid" ? "SendGrid API Key" : "Resend API Key"}</Label>
                  <Input
                    type="password"
                    value={emailApiKey}
                    onChange={(e) => setEmailApiKey(e.target.value)}
                    placeholder={channels?.email?.configured ? "•••••• (leave blank to keep current)" : (emailProvider === "sendgrid" ? "SG.xxxxx" : "re_...")}
                    maxLength={300}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>From Email</Label>
                  <Input value={emailFrom} onChange={(e) => setEmailFrom(e.target.value)} placeholder="hello@yourdomain.com" maxLength={200} />
                </div>
                <div className="space-y-1.5">
                  <Label>From Name</Label>
                  <Input value={emailFromName} onChange={(e) => setEmailFromName(e.target.value)} placeholder="NexusFlo24" maxLength={100} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Reply-To (optional)</Label>
                  <Input value={emailReplyTo} onChange={(e) => setEmailReplyTo(e.target.value)} placeholder="support@yourdomain.com" maxLength={200} />
                </div>
              </div>

              {(() => {
                const savedProvider = (channels?.email?.non_secret?.provider || (channels?.email?.configured ? "resend" : emailProvider)) as "resend" | "sendgrid";
                const providerChanged = channels?.email?.configured && savedProvider !== emailProvider;
                const needsNewKey = providerChanged && !emailApiKey;
                return (
                  <>
                    <p className="text-[11px] text-muted-foreground">
                      {emailProvider === "sendgrid"
                        ? "Use a SendGrid API key (starts with SG.) with Mail Send permission. The From Email must be a verified Single Sender or authenticated domain in SendGrid."
                        : "Use a Resend API key (starts with re_). Verify your sending domain via the panel above for best deliverability."}
                    </p>
                    {providerChanged && (
                      <p className="text-[11px] text-amber-700">
                        Provider changed to <strong>{emailProvider === "sendgrid" ? "SendGrid" : "Resend"}</strong> — paste a new {emailProvider === "sendgrid" ? "SendGrid (SG.…)" : "Resend (re_…)"} API key to save.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button size="sm" onClick={() => saveChannel("email", { provider: emailProvider, api_key: emailApiKey, from_email: emailFrom, from_name: emailFromName, reply_to: emailReplyTo }, setEmailSaving)} disabled={emailSaving || (!emailApiKey && !channels?.email?.configured) || needsNewKey}>
                        {emailSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}Save
                      </Button>
                      {channels?.email?.configured && (
                        <Button variant="outline" size="sm" className="text-destructive border-destructive/40 hover:text-destructive hover:bg-destructive/5" onClick={() => setDisconnectTarget("email")}>
                          <Unplug className="h-4 w-4 mr-1" />Disconnect
                        </Button>
                      )}
                    </div>
                  </>
                );
              })()}

              <Separator />
              <div>
                <div className="text-xs font-medium text-foreground mb-1.5">Send a test email</div>
                <div className="flex flex-wrap gap-2">
                  <Input value={emailTestTo} onChange={(e) => setEmailTestTo(e.target.value)} placeholder="test@example.com" className="max-w-[260px]" maxLength={200} />
                  <Button variant="outline" size="sm" onClick={handleTestEmail} disabled={emailTestSending}>
                    {emailTestSending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}Test
                  </Button>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── SMS ────────────────────────────── */}
        <AccordionItem value="sms" className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30">
            <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <Smartphone className="h-5 w-5 text-amber-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">SMS</span>
                  {smsConnected ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px]">
                      Twilio · Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Not connected</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  Send transactional and bulk SMS through your Twilio account.
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 pt-0">
            <div className="space-y-4">
              {channels?.sms?.configured && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Active credentials</div>
                  <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {Object.entries(channels.sms.masked).map(([k, v]) => (
                      <div key={k} className="flex gap-2"><span className="text-muted-foreground">{k}:</span><span className="font-mono truncate">{v}</span></div>
                    ))}
                  </div>
                </div>
              )}

              <TwilioSubaccountPanel workspaceId={workspaceId} />

              <Separator />

              <p className="text-xs text-muted-foreground">Or enter your own Twilio credentials manually:</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Account SID</Label>
                  <Input type="password" value={smsAccountSid} onChange={(e) => setSmsAccountSid(e.target.value)} placeholder={channels?.sms?.configured ? "•••••• (leave blank to keep current)" : "AC..."} maxLength={100} />
                </div>
                <div className="space-y-1.5">
                  <Label>Auth Token</Label>
                  <Input type="password" value={smsAuthToken} onChange={(e) => setSmsAuthToken(e.target.value)} placeholder={channels?.sms?.configured ? "•••••• (leave blank to keep current)" : "••••••"} maxLength={100} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>From Number / Messaging Service SID</Label>
                  <Input value={smsFromNumber} onChange={(e) => setSmsFromNumber(e.target.value)} placeholder="+15551234567 or MG..." maxLength={50} />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" onClick={() => saveChannel("sms", { account_sid: smsAccountSid, auth_token: smsAuthToken, from_number: smsFromNumber }, setSmsSaving)} disabled={smsSaving || (!smsAccountSid && !channels?.sms?.configured)}>
                  {smsSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}Save
                </Button>
                {channels?.sms?.configured && (
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/40 hover:text-destructive hover:bg-destructive/5" onClick={() => setDisconnectTarget("sms")}>
                    <Unplug className="h-4 w-4 mr-1" />Disconnect
                  </Button>
                )}
              </div>

              <Separator />
              <div>
                <div className="text-xs font-medium text-foreground mb-1.5">Send a test SMS</div>
                <div className="flex flex-wrap gap-2">
                  <Input value={smsTestTo} onChange={(e) => setSmsTestTo(e.target.value)} placeholder="+447517327597" className="max-w-[220px]" maxLength={20} />
                  <Button variant="outline" size="sm" onClick={handleTestSms} disabled={smsTestSending}>
                    {smsTestSending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}Test
                  </Button>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── WhatsApp Business (single card: Meta tabs + advanced manual fallback) ─── */}
        <AccordionItem value="whatsapp" className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30">
            <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <MessageCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">WhatsApp Business</span>
                  {whatsappConnected ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px]">
                      Connected via Meta Cloud API
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Not connected</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  Choose Meta Cloud API (Embedded Signup) or Twilio WhatsApp — one provider per workspace.
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 pt-0">
            <div className="space-y-4">
              {/* Primary WhatsApp connection UI (Meta + Twilio tabs) */}
              <WhatsAppConnectCard workspaceId={workspaceId} />

              {/* Advanced — manual credentials & test (formerly a separate duplicate card) */}
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors px-4 py-3 text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <KeyRound className="h-4 w-4 text-amber-600" />
                      Advanced — manual credentials & test send
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <div className="space-y-4 rounded-lg border bg-card p-4">
                    {channels?.whatsapp?.configured && (
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Manual credentials on file</div>
                        <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          {Object.entries(channels.whatsapp.masked).map(([k, v]) => (
                            <div key={k} className="flex gap-2"><span className="text-muted-foreground">{k}:</span><span className="font-mono truncate">{v}</span></div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Access Token</Label>
                        <Input type="password" value={waAccessToken} onChange={(e) => setWaAccessToken(e.target.value)} placeholder={channels?.whatsapp?.configured ? "•••••• (leave blank to keep current)" : "EAA..."} maxLength={500} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Phone Number ID</Label>
                        <Input value={waPhoneNumberId} onChange={(e) => setWaPhoneNumberId(e.target.value)} placeholder="123456789012345" maxLength={50} />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Verify Token</Label>
                        <Input type="password" value={waVerifyToken} onChange={(e) => setWaVerifyToken(e.target.value)} placeholder={channels?.whatsapp?.configured ? "•••••• (leave blank to keep current)" : "your-verify-token"} maxLength={200} />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => saveChannel("whatsapp", { access_token: waAccessToken, phone_number_id: waPhoneNumberId, verify_token: waVerifyToken }, setWaSaving)} disabled={waSaving || (!waAccessToken && !channels?.whatsapp?.configured)}>
                        {waSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}Save
                      </Button>
                      {channels?.whatsapp?.configured && (
                        <Button variant="outline" size="sm" className="text-destructive border-destructive/40 hover:text-destructive hover:bg-destructive/5" onClick={() => setDisconnectTarget("whatsapp")}>
                          <Unplug className="h-4 w-4 mr-1" />Disconnect
                        </Button>
                      )}
                    </div>

                    <div className="rounded-md border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-900">
                      <strong>Heads up — WhatsApp 24h window:</strong> Free-form text messages
                      only deliver if the recipient has messaged your business in the last 24 hours.
                      Outside that window, an approved template is required.
                    </div>

                    <div>
                      <div className="text-xs font-medium text-foreground mb-1.5">Send a test WhatsApp message</div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input value={waTestTo} onChange={(e) => setWaTestTo(e.target.value)} placeholder="+447517327597" maxLength={20} />
                        <Input value={waTestMsg} onChange={(e) => setWaTestMsg(e.target.value)} placeholder="Hello from NexusFlo24!" maxLength={500} />
                      </div>
                      <Button variant="outline" size="sm" className="mt-2" onClick={handleTestWhatsApp} disabled={waTestSending}>
                        {waTestSending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}Test
                      </Button>
                    </div>

                    <Separator />
                    <ReengagementTemplatePicker workspaceId={workspaceId} />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Platform / Sender Defaults ─────── */}
        <AccordionItem value="platform" className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30">
            <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
              <div className="h-10 w-10 rounded-lg bg-slate-500/10 flex items-center justify-center shrink-0">
                <Server className="h-5 w-5 text-slate-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">Sender Defaults</span>
                  <Badge variant="outline" className="text-[10px]">Platform-managed</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  Fallback credentials NexusFlo24 uses when no workspace sender is configured.
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 pt-0">
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/20 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-xs font-semibold">Email default</span>
                  </div>
                  <p className="text-xs text-muted-foreground">NexusFlo24 platform sender</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Smartphone className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-xs font-semibold">SMS default</span>
                  </div>
                  <p className="text-xs text-muted-foreground">NexusFlo24 Twilio</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-xs font-semibold">WhatsApp default</span>
                  </div>
                  <p className="text-xs text-muted-foreground">NexusFlo24 Meta / Twilio provider</p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                This allows NexusFlo24 to support both platform-managed messaging and Bring Your Own Sender.
                Adding workspace credentials in any channel above will automatically override the platform default for that channel only.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Disconnect dialog */}
      <AlertDialog open={!!disconnectTarget} onOpenChange={(open) => !open && setDisconnectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {disconnectTarget}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your custom {disconnectTarget} credentials. Messages will fall back to platform defaults if available.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (disconnectTarget) {
                  disconnectChannel(disconnectTarget);
                  setDisconnectTarget(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
