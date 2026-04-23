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
import { toast } from "sonner";
import {
  Mail, Smartphone, MessageCircle, Loader2, Save, ChevronDown,
  CheckCircle2, XCircle, Unplug, Send, Globe, Copy, RefreshCw,
  Phone, ShieldCheck, ExternalLink, ArrowRight, ArrowLeft,
} from "lucide-react";

interface ChannelStatus {
  configured: boolean;
  is_active: boolean;
  masked: Record<string, string>;
  updated_at: string | null;
}

// ── Resend Domain Verification Panel ──
function ResendDomainPanel({ workspaceId }: { workspaceId: string }) {
  const [domainInput, setDomainInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [domains, setDomains] = useState<any[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<any>(null);
  const [fetching, setFetching] = useState(false);

  const callDomainApi = async (body: Record<string, any>) => {
    const { data, error } = await supabase.functions.invoke("resend-domain-verify", { body: { workspaceId, ...body } });
    if (error) {
      // FunctionsHttpError hides the response body — extract it manually
      const ctx = (error as any)?.context;
      if (ctx && typeof ctx.json === "function") {
        try {
          const errBody = await ctx.json();
          const msg = errBody?.error || errBody?.details || error.message;
          throw new Error(msg);
        } catch (parseErr: any) {
          if (parseErr?.message && parseErr.message !== error.message) throw parseErr;
        }
      }
      throw new Error(error.message || "Domain request failed");
    }
    if (data?.error) throw new Error(data.error);
    return data;
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
      await callDomainApi({ action: "verify", domainId });
      toast.success("Verification check initiated. Refreshing status...");
      // Wait a moment then fetch status
      setTimeout(async () => {
        const res = await callDomainApi({ action: "status", domainId });
        setSelectedDomain(res.domain);
        await fetchDomains();
        setLoading(false);
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
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
                    const res = await callDomainApi({ action: "status", domainId: d.id });
                    setSelectedDomain(res.domain);
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

// ── Main Component ──
export default function ChannelSettingsTab({ workspaceId }: { workspaceId: string }) {
  const [channels, setChannels] = useState<Record<string, ChannelStatus> | null>(null);
  const [loading, setLoading] = useState(true);

  // Email fields
  const [emailApiKey, setEmailApiKey] = useState("");
  const [emailFrom, setEmailFrom] = useState("");
  const [emailFromName, setEmailFromName] = useState("");
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

  useEffect(() => { fetchStatus(); }, [workspaceId]);

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
      if (res.ok) setChannels(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  const saveChannel = async (channel: string, config: Record<string, string>, setSaving: (v: boolean) => void) => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("channel-settings-save", {
        body: { workspaceId, channel, config },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${channel.charAt(0).toUpperCase() + channel.slice(1)} credentials saved.`);
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
      const { data, error } = await supabase.functions.invoke("sms-send", {
        body: { workspaceId, to: smsTestTo, message: "NexusFlo24 Test SMS ✅ Your custom SMS is working!" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Test SMS sent!");
    } catch (err: any) { toast.error(err.message || "Failed"); }
    finally { setSmsTestSending(false); }
  };

  const handleTestWhatsApp = async () => {
    if (!waTestTo || !waTestMsg) { toast.error("Enter phone and message"); return; }
    setWaTestSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: { workspaceId, to: waTestTo, type: "text", body: waTestMsg },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Test WhatsApp sent!");
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
      <span className="flex items-center gap-1 text-xs text-accent">
        <CheckCircle2 className="h-3.5 w-3.5" /> Custom credentials active
      </span>
    );
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
        <p className="text-xs text-foreground/80">
          <strong>Bring Your Own Sender:</strong> Connect your own Email domain, SMS credentials, or WhatsApp Business number.
          If not configured, the platform default credentials are used.
        </p>
      </div>

      {/* ─── Email Channel ─── */}
      <Collapsible>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-accent" />
                  <div>
                    <CardTitle className="text-base">Email (Resend)</CardTitle>
                    <StatusIndicator ch={channels?.email} />
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {channels?.email?.configured && (
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {Object.entries(channels.email.masked).map(([k, v]) => (
                    <p key={k}><span className="font-medium">{k}:</span> {v}</p>
                  ))}
                </div>
              )}

              {/* Resend Domain Verification */}
              <ResendDomainPanel workspaceId={workspaceId} />

              <Separator />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Resend API Key</Label>
                  <Input type="password" value={emailApiKey} onChange={(e) => setEmailApiKey(e.target.value)} placeholder="re_..." maxLength={200} />
                </div>
                <div className="space-y-1">
                  <Label>From Email</Label>
                  <Input value={emailFrom} onChange={(e) => setEmailFrom(e.target.value)} placeholder="hello@yourdomain.com" maxLength={200} />
                </div>
                <div className="space-y-1">
                  <Label>From Name</Label>
                  <Input value={emailFromName} onChange={(e) => setEmailFromName(e.target.value)} placeholder="Your Brand" maxLength={100} />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={() => saveChannel("email", { provider: "resend", api_key: emailApiKey, from_email: emailFrom, from_name: emailFromName }, setEmailSaving)} disabled={emailSaving || !emailApiKey}>
                  {emailSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}Save
                </Button>
                {channels?.email?.configured && (
                  <Button variant="outline" size="sm" onClick={() => setDisconnectTarget("email")}>
                    <Unplug className="h-4 w-4 mr-1" />Disconnect
                  </Button>
                )}
              </div>
              <Separator />
              <div className="flex gap-2">
                <Input value={emailTestTo} onChange={(e) => setEmailTestTo(e.target.value)} placeholder="test@example.com" className="max-w-[250px]" maxLength={200} />
                <Button variant="outline" size="sm" onClick={handleTestEmail} disabled={emailTestSending}>
                  {emailTestSending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}Test
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ─── SMS Channel ─── */}
      <Collapsible>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-accent" />
                  <div>
                    <CardTitle className="text-base">SMS (Twilio)</CardTitle>
                    <StatusIndicator ch={channels?.sms} />
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {channels?.sms?.configured && (
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {Object.entries(channels.sms.masked).map(([k, v]) => (
                    <p key={k}><span className="font-medium">{k}:</span> {v}</p>
                  ))}
                </div>
              )}

              {/* Twilio Subaccount Provisioning */}
              <TwilioSubaccountPanel workspaceId={workspaceId} />

              <Separator />
              <p className="text-xs text-muted-foreground">Or enter your own Twilio credentials manually:</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Account SID</Label>
                  <Input type="password" value={smsAccountSid} onChange={(e) => setSmsAccountSid(e.target.value)} placeholder="AC..." maxLength={100} />
                </div>
                <div className="space-y-1">
                  <Label>Auth Token</Label>
                  <Input type="password" value={smsAuthToken} onChange={(e) => setSmsAuthToken(e.target.value)} placeholder="••••••" maxLength={100} />
                </div>
                <div className="space-y-1">
                  <Label>From Number / Messaging Service SID</Label>
                  <Input value={smsFromNumber} onChange={(e) => setSmsFromNumber(e.target.value)} placeholder="+15551234567 or MG..." maxLength={50} />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={() => saveChannel("sms", { account_sid: smsAccountSid, auth_token: smsAuthToken, from_number: smsFromNumber }, setSmsSaving)} disabled={smsSaving || !smsAccountSid}>
                  {smsSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}Save
                </Button>
                {channels?.sms?.configured && (
                  <Button variant="outline" size="sm" onClick={() => setDisconnectTarget("sms")}>
                    <Unplug className="h-4 w-4 mr-1" />Disconnect
                  </Button>
                )}
              </div>
              <Separator />
              <div className="flex gap-2">
                <Input value={smsTestTo} onChange={(e) => setSmsTestTo(e.target.value)} placeholder="+447517327597" className="max-w-[200px]" maxLength={20} />
                <Button variant="outline" size="sm" onClick={handleTestSms} disabled={smsTestSending}>
                  {smsTestSending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}Test
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ─── WhatsApp Channel ─── */}
      <Collapsible>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-accent" />
                  <div>
                    <CardTitle className="text-base">WhatsApp Business</CardTitle>
                    <StatusIndicator ch={channels?.whatsapp} />
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {channels?.whatsapp?.configured && (
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {Object.entries(channels.whatsapp.masked).map(([k, v]) => (
                    <p key={k}><span className="font-medium">{k}:</span> {v}</p>
                  ))}
                </div>
              )}

              {!channels?.whatsapp?.configured && !showWaWizard ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    New to WhatsApp Cloud API? Use our guided wizard to walk you through the setup step-by-step.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setShowWaWizard(true)}>
                      <ShieldCheck className="h-4 w-4 mr-1" />Guided Setup Wizard
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowWaWizard(false)}>
                      Manual Setup
                    </Button>
                  </div>
                </div>
              ) : showWaWizard ? (
                <>
                  <WhatsAppWizard
                    onComplete={async (config) => {
                      await saveChannel("whatsapp", config, setWaSaving);
                      setShowWaWizard(false);
                    }}
                  />
                  <Button variant="ghost" size="sm" onClick={() => setShowWaWizard(false)}>
                    Switch to Manual Setup
                  </Button>
                </>
              ) : null}

              {/* Manual fields (shown when wizard is off or already configured) */}
              {(!showWaWizard || channels?.whatsapp?.configured) && (
                <>
                  <Separator />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Access Token</Label>
                      <Input type="password" value={waAccessToken} onChange={(e) => setWaAccessToken(e.target.value)} placeholder="EAA..." maxLength={500} />
                    </div>
                    <div className="space-y-1">
                      <Label>Phone Number ID</Label>
                      <Input value={waPhoneNumberId} onChange={(e) => setWaPhoneNumberId(e.target.value)} placeholder="123456789012345" maxLength={50} />
                    </div>
                    <div className="space-y-1">
                      <Label>Verify Token</Label>
                      <Input type="password" value={waVerifyToken} onChange={(e) => setWaVerifyToken(e.target.value)} placeholder="your-verify-token" maxLength={200} />
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" onClick={() => saveChannel("whatsapp", { access_token: waAccessToken, phone_number_id: waPhoneNumberId, verify_token: waVerifyToken }, setWaSaving)} disabled={waSaving || !waAccessToken}>
                      {waSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}Save
                    </Button>
                    {channels?.whatsapp?.configured && (
                      <Button variant="outline" size="sm" onClick={() => setDisconnectTarget("whatsapp")}>
                        <Unplug className="h-4 w-4 mr-1" />Disconnect
                      </Button>
                    )}
                  </div>
                  <Separator />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input value={waTestTo} onChange={(e) => setWaTestTo(e.target.value)} placeholder="+447517327597" maxLength={20} />
                    <Input value={waTestMsg} onChange={(e) => setWaTestMsg(e.target.value)} placeholder="Hello from NexusFlo24!" maxLength={500} />
                  </div>
                  <Button variant="outline" size="sm" onClick={handleTestWhatsApp} disabled={waTestSending}>
                    {waTestSending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}Test
                  </Button>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

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
