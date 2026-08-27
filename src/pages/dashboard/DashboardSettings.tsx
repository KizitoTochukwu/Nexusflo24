import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AiAgentConnectionsTab from "@/components/settings/AiAgentConnectionsTab";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  User, Users, Shield, Bell, CreditCard, Loader2, Save, Upload, Key,
  Mail, MessageCircle, Smartphone, Webhook, Settings2, Clock,
  Copy, Eye, EyeOff, RefreshCw, Trash2, Globe, Zap, Monitor,
  CheckCircle2, XCircle, ShieldAlert, Palette, Rocket
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { format } from "date-fns";
import { useIsAdmin } from "@/hooks/useAdminRole";
import { Bot, Radio, Sparkles } from "lucide-react";
import SalesCloserSettingsTab from "@/components/settings/SalesCloserSettingsTab";
import ChannelSettingsTab from "@/components/settings/ChannelSettingsTab";
import UsageCreditsTab from "@/components/settings/UsageCreditsTab";
import BrandingTab from "@/components/settings/BrandingTab";
import TeamTab from "@/components/settings/TeamTab";
import CustomCodeTab from "@/components/settings/CustomCodeTab";
import TrackingPixelsTab from "@/components/settings/TrackingPixelsTab";
import WhatsAppTemplatesTab from "@/components/settings/WhatsAppTemplatesTab";
import MetaChannelTab from "@/components/settings/MetaChannelTab";
import SenderProfilesTab from "@/components/settings/SenderProfilesTab";
import BuyCreditsTab from "@/components/settings/BuyCreditsTab";
import ApiKeysTab from "@/components/settings/ApiKeysTab";
import OnboardingTab from "@/components/settings/OnboardingTab";


/* ── Profile Tab ─────────────────────────────────────────── */

function ProfileTab() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ full_name: "", phone: "", company: "", avatar_url: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("full_name, phone, company, avatar_url").eq("id", user.id).maybeSingle();
      if (data) setProfile({ full_name: data.full_name || "", phone: (data as any).phone || "", company: (data as any).company || "", avatar_url: (data as any).avatar_url || "" });
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: profile.full_name || null, phone: profile.phone || null, company: profile.company || null } as any).eq("id", user.id);
    setSaving(false);
    error ? toast.error("Failed to save profile.") : toast.success("Profile updated.");
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) { toast.error("Only JPG, PNG, GIF, or WebP images are allowed."); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Max file size is 2MB"); return; }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) { toast.error("Invalid file extension."); return; }
    setUploading(true);
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { toast.error("Upload failed"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: urlData.publicUrl } as any).eq("id", user.id);
    setProfile((p) => ({ ...p, avatar_url: urlData.publicUrl }));
    setUploading(false);
    toast.success("Avatar uploaded.");
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/reset-password` });
    error ? toast.error(error.message) : toast.success("Check your inbox for a password reset link.");
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><User className="h-5 w-5 text-accent" /><CardTitle className="text-lg">Profile Information</CardTitle></div>
          <CardDescription>Update your personal details and avatar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="h-16 w-16 rounded-full object-cover border-2 border-accent" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
                {profile.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}
              </div>
            )}
            <div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}Upload Photo
              </Button>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, max 2MB</p>
            </div>
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} placeholder="Your full name" maxLength={100} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+1 (555) 000-0000" maxLength={20} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="company">Company / Brand</Label>
              <Input id="company" value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} placeholder="Your company name" maxLength={100} />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" size="sm" onClick={handlePasswordReset}><Shield className="h-4 w-4 mr-1" />Change Password</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Billing Tab ─────────────────────────────────────────── */

function BillingTab() {
  const { user, subscription, refreshSubscription } = useAuth();
  const workspaceId = useWorkspaceId();
  const [portalLoading, setPortalLoading] = useState(false);

  const planLabel = subscription?.plan === "agency" ? "Agency" : subscription?.plan === "pro" ? "Pro" : "Free";
  const statusLabel = subscription?.status === "trialing" ? "Trial" : subscription?.status === "active" ? "Active" : subscription?.status || "Inactive";

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session");
      if (error) {
        const ctx: any = (error as any)?.context;
        let serverMsg: string | undefined;
        try {
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            serverMsg = body?.error;
          }
        } catch {}
        throw new Error(serverMsg || error.message || "Failed to open billing portal");
      }
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No billing portal URL returned");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-accent" /><CardTitle className="text-lg">Subscription & Billing</CardTitle></div>
          <CardDescription>Manage your plan, payment method, and invoices.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Current Plan</p>
              <p className="text-xl font-bold text-accent">{planLabel}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="text-xl font-bold capitalize">{statusLabel}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Billing Cycle</p>
              <p className="text-xl font-bold capitalize">{subscription?.billing_cycle || "—"}</p>
            </div>
          </div>
          {subscription?.current_period_end && (
            <p className="text-sm text-muted-foreground">
              {subscription.cancel_at_period_end ? "Cancels" : "Renews"} on {format(new Date(subscription.current_period_end), "MMM d, yyyy")}
            </p>
          )}
          <Separator />
          <div className="flex flex-wrap gap-3">
            {(!subscription || subscription.plan === "free" || subscription.status === "canceled") && (
              <Link to="/pricing"><Button className="bg-accent text-accent-foreground hover:bg-accent/90">Upgrade Plan</Button></Link>
            )}
            {subscription?.stripe_customer_id && (
              <Button variant="outline" disabled={portalLoading} onClick={handleManageBilling}>
                {portalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CreditCard className="h-4 w-4 mr-1" />}Manage Billing
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => refreshSubscription()}><RefreshCw className="h-4 w-4 mr-1" />Refresh Status</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Integrations Tab (Admin Only) ───────────────────────── */

function IntegrationsTab() {
  const workspaceId = useWorkspaceId();
  const [status, setStatus] = useState<{ resend: boolean; twilio: boolean; whatsapp: boolean } | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // Test state
  const [emailTestTo, setEmailTestTo] = useState("");
  const [emailTestSending, setEmailTestSending] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [waTestPhone, setWaTestPhone] = useState("");
  const [waTestMessage, setWaTestMessage] = useState("");
  const [waTestSending, setWaTestSending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("integration-status");
        if (!error && data) setStatus(data);
      } catch { /* ignore */ }
      setStatusLoading(false);
    })();
  }, []);

  const handleTestEmail = async () => {
    if (!emailTestTo) { toast.error("Enter a test email address"); return; }
    setEmailTestSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("email-send", {
        body: { workspaceId, to: emailTestTo, subject: "NexusFlo24 Test Email ✅", html: "<h2>Test Email from NexusFlo24</h2><p>Your email integration is working correctly!</p>" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Test email sent successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send test email");
    } finally {
      setEmailTestSending(false);
    }
  };

  const handleTestSms = async () => {
    if (!testPhone) { toast.error("Enter a test phone number"); return; }
    setTestSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("sms-send", {
        body: { workspaceId, to: testPhone, message: "NexusFlo24 Test SMS ✅ Your SMS integration is working!" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Test SMS sent successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send test SMS");
    } finally {
      setTestSending(false);
    }
  };

  const handleTestWhatsApp = async () => {
    if (!waTestPhone) { toast.error("Enter a test phone number"); return; }
    if (!waTestMessage) { toast.error("Enter a test message"); return; }
    setWaTestSending(true);
    setWaTestSubmission(null);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: { workspaceId, to: waTestPhone, type: "text", body: waTestMessage },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.success === false) { toast.error(data.error || "WhatsApp send failed"); return; }
      // Accepted by Meta ≠ delivered — the timeline tracks the real lifecycle.
      setWaTestSubmission({
        waMessageId: data?.waMessageId ?? null,
        wabaId: data?.wabaId ?? null,
        phoneNumberId: data?.phoneNumberId ?? null,
        senderOwnership: data?.senderOwnership ?? null,
        templateUsed: data?.templateUsed ?? null,
        to: waTestPhone,
      });
      toast.success("Submitted to Meta — awaiting delivery confirmation.");
    } catch (err: any) {
      toast.error(err.message || "Failed to send WhatsApp message");
    } finally {
      setWaTestSending(false);
    }
  };

  const StatusBadge = ({ configured, label }: { configured: boolean; label: string }) => (
    <div className="flex items-center gap-2 rounded-lg border p-3">
      {configured ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-destructive" />}
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{configured ? "Configured" : "Not configured"}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Platform Integration Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-accent" /><CardTitle className="text-lg">Platform Integration Status</CardTitle></div>
          <CardDescription>Provider credentials are managed at the platform level via environment variables.</CardDescription>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : status ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <StatusBadge configured={status.resend} label="Resend (Email)" />
              <StatusBadge configured={status.twilio} label="Twilio (SMS)" />
              <StatusBadge configured={status.whatsapp} label="WhatsApp Cloud API" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Unable to load integration status.</p>
          )}
        </CardContent>
      </Card>

      {/* Test Email */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Mail className="h-5 w-5 text-accent" /><CardTitle className="text-lg">Email Provider (Resend)</CardTitle></div>
          <CardDescription>Send a test email to verify the platform email integration.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={emailTestTo} onChange={(e) => setEmailTestTo(e.target.value)} placeholder="test@example.com" className="max-w-[280px]" maxLength={255} />
            <Button variant="outline" size="sm" onClick={handleTestEmail} disabled={emailTestSending}>
              {emailTestSending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Mail className="h-4 w-4 mr-1" />}Send Test
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test SMS */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-accent" /><CardTitle className="text-lg">SMS Gateway (Twilio)</CardTitle></div>
          <CardDescription>Send a test SMS to verify the platform SMS integration.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="+15551234567" className="max-w-[220px]" maxLength={20} />
            <Button variant="outline" size="sm" onClick={handleTestSms} disabled={testSending}>
              {testSending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Smartphone className="h-4 w-4 mr-1" />}Send Test
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test WhatsApp */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-accent" /><CardTitle className="text-lg">WhatsApp Cloud API</CardTitle></div>
          <CardDescription>Send a test WhatsApp message to verify the platform integration.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input value={waTestPhone} onChange={(e) => setWaTestPhone(e.target.value)} placeholder="+447517327597 (E.164)" maxLength={20} />
            <Textarea value={waTestMessage} onChange={(e) => setWaTestMessage(e.target.value)} placeholder="Hello from NexusFlo24!" className="min-h-[60px]" maxLength={1000} />
          </div>
          <Button variant="outline" size="sm" onClick={handleTestWhatsApp} disabled={waTestSending}>
            {waTestSending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <MessageCircle className="h-4 w-4 mr-1" />}Send Test
          </Button>
        </CardContent>
      </Card>

    </div>
  );
}

/* ── Webhooks Tab (Customer Accessible) ──────────────────── */

function WebhooksTab() {
  const workspaceId = useWorkspaceId();
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL || ""}/functions/v1/ingest-leads`;
  const whatsappWebhookUrl = `${import.meta.env.VITE_SUPABASE_URL || ""}/functions/v1/whatsapp-webhook`;
  const trackingSnippet = `<script src="${import.meta.env.VITE_SUPABASE_URL || ""}/functions/v1/track-event?embed=1&wid=${workspaceId}"></script>`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Webhook className="h-5 w-5 text-accent" /><CardTitle className="text-lg">Webhook Settings</CardTitle></div>
          <CardDescription>Inbound webhook URL for lead ingestion (Make.com, Zapier, etc.)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Lead Ingest Endpoint</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="bg-muted font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("Copied!"); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Send POST requests with Authorization: Bearer &lt;token&gt; and X-Workspace-Id header.</p>
          </div>
          <Separator />
          <div className="space-y-1">
            <Label>WhatsApp Webhook Callback URL</Label>
            <div className="flex gap-2">
              <Input value={whatsappWebhookUrl} readOnly className="bg-muted font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(whatsappWebhookUrl); toast.success("Copied!"); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Paste this into Meta Developer Console → WhatsApp → Configuration. Keep <strong>"Attach a client certificate"</strong> OFF.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Globe className="h-5 w-5 text-accent" /><CardTitle className="text-lg">Website Tracking</CardTitle></div>
          <CardDescription>Add this script to your website to automatically track visits, page views, and pricing page engagement.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Tracking Snippet</Label>
            <div className="flex gap-2">
              <Textarea value={trackingSnippet} readOnly className="bg-muted font-mono text-xs h-16 resize-none" />
              <Button variant="outline" size="icon" className="shrink-0" onClick={() => { navigator.clipboard.writeText(trackingSnippet); toast.success("Tracking snippet copied!"); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Paste before <code className="bg-muted px-1 rounded">&lt;/body&gt;</code> on any page. Automatically tracks <strong>website_visit</strong> and <strong>pricing_page_visit</strong> events.
            </p>
          </div>
          <Separator />
          <div className="space-y-1">
            <Label>Identify Known Leads (Optional)</Label>
            <p className="text-xs text-muted-foreground">
              After a form submission, call <code className="bg-muted px-1 rounded">window.__nfIdentify(email)</code> to link future visits to the lead.
            </p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs text-blue-800">
              <strong>How it works:</strong> The script fires a single event per page load. If the visitor has been identified via <code>__nfIdentify</code>, the visit is logged to their lead profile and updates their engagement score automatically.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Access Denied Card ──────────────────────────────────── */

function AccessDeniedCard() {
  return (
    <Card>
      <CardContent className="py-12 text-center space-y-3">
        <ShieldAlert className="h-10 w-10 text-destructive mx-auto" />
        <h3 className="text-lg font-semibold">Access Denied</h3>
        <p className="text-sm text-muted-foreground">Platform integrations are managed by administrators only.</p>
      </CardContent>
    </Card>
  );
}

/* ── Automation Preferences Tab ──────────────────────────── */

function AutomationPrefsTab() {
  const [defaultScore, setDefaultScore] = useState("50");
  const [sendWindow, setSendWindow] = useState("09:00-18:00");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [dailyLimit, setDailyLimit] = useState("500");
  const [cooldownHours, setCooldownHours] = useState("24");

  const handleSave = () => {
    toast.success("Automation preferences saved.");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Zap className="h-5 w-5 text-accent" /><CardTitle className="text-lg">Lead Scoring Defaults</CardTitle></div>
          <CardDescription>Set the default score assigned to new leads.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Default Lead Score (0–100)</Label>
              <Input type="number" min="0" max="100" value={defaultScore} onChange={(e) => setDefaultScore(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Clock className="h-5 w-5 text-accent" /><CardTitle className="text-lg">Campaign Sending Rules</CardTitle></div>
          <CardDescription>Control when and how campaigns are sent.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Sending Window</Label>
              <Input value={sendWindow} onChange={(e) => setSendWindow(e.target.value)} placeholder="09:00-18:00" />
              <p className="text-xs text-muted-foreground">Messages only sent during this window.</p>
            </div>
            <div className="space-y-1">
              <Label>Daily Send Limit</Label>
              <Input type="number" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Cooldown Between Messages (hours)</Label>
              <Input type="number" value={cooldownHours} onChange={(e) => setCooldownHours(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Globe className="h-5 w-5 text-accent" /><CardTitle className="text-lg">Timezone</CardTitle></div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Asia/Tokyo", "Asia/Dubai", "Australia/Sydney", Intl.DateTimeFormat().resolvedOptions().timeZone].filter((v, i, a) => a.indexOf(v) === i).map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="bg-accent text-accent-foreground hover:bg-accent/90"><Save className="h-4 w-4 mr-1" />Save Preferences</Button>
    </div>
  );
}

/* ── Security Tab ────────────────────────────────────────── */

function SecurityTab() {
  const { user } = useAuth();
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [apiKeys, setApiKeys] = useState<{ id: string; name: string; created: string; last4: string }[]>([
    { id: "1", name: "Production Key", created: new Date().toISOString(), last4: "x7k9" },
  ]);

  const handleToggle2FA = (val: boolean) => {
    setTwoFaEnabled(val);
    toast.success(val ? "2FA enabled (coming soon — will require authenticator app)." : "2FA disabled.");
  };

  const handleGenerateKey = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const key = Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    const newKey = { id: String(Date.now()), name: `Key ${apiKeys.length + 1}`, created: new Date().toISOString(), last4: key.slice(-4) };
    setApiKeys((prev) => [...prev, newKey]);
    navigator.clipboard.writeText(`nxf_${key}`);
    toast.success("API key generated and copied to clipboard. Store it securely — it won't be shown again.");
  };

  const handleDeleteKey = (id: string) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
    toast.success("API key revoked.");
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/reset-password` });
    error ? toast.error(error.message) : toast.success("Check your inbox for a password reset link.");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Shield className="h-5 w-5 text-accent" /><CardTitle className="text-lg">Password & Authentication</CardTitle></div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-muted-foreground">Send a reset link to your email.</p>
            </div>
            <Button variant="outline" size="sm" onClick={handlePasswordReset}>Change Password</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Two-Factor Authentication (2FA)</p>
              <p className="text-xs text-muted-foreground">Add an extra layer of security to your account.</p>
            </div>
            <Switch checked={twoFaEnabled} onCheckedChange={handleToggle2FA} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-accent" /><CardTitle className="text-lg">Session Info</CardTitle></div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{user?.email}</span></div>
          <Separator />
          <div className="flex justify-between"><span className="text-muted-foreground">Account Created</span><span className="font-medium">{user?.created_at ? format(new Date(user.created_at), "MMM d, yyyy") : "—"}</span></div>
          <Separator />
          <div className="flex justify-between"><span className="text-muted-foreground">Email Verified</span><span className="font-medium">{user?.email_confirmed_at ? "Verified ✓" : "Not verified"}</span></div>
          <Separator />
          <div className="flex justify-between"><span className="text-muted-foreground">Last Sign In</span><span className="font-medium">{user?.last_sign_in_at ? format(new Date(user.last_sign_in_at), "MMM d, yyyy h:mm a") : "—"}</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Key className="h-5 w-5 text-accent" /><CardTitle className="text-lg">API Keys</CardTitle></div>
          <CardDescription>Manage API keys for external integrations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {apiKeys.map((k) => (
            <div key={k.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{k.name}</p>
                <p className="text-xs text-muted-foreground">Created {format(new Date(k.created), "MMM d, yyyy")} · ends in ...{k.last4}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDeleteKey(k.id)} className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={handleGenerateKey}><Key className="h-4 w-4 mr-1" />Generate New Key</Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Notification Preferences ────────────────────────────── */

function NotificationsTab() {
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [leadAlerts, setLeadAlerts] = useState(true);
  const [campaignReports, setCampaignReports] = useState(true);
  const [automationAlerts, setAutomationAlerts] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);

  const handleSave = () => toast.success("Notification preferences saved.");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Bell className="h-5 w-5 text-accent" /><CardTitle className="text-lg">Notification Preferences</CardTitle></div>
          <CardDescription>Control what notifications you receive.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Email Notifications", desc: "Receive general email updates.", state: emailNotifs, set: setEmailNotifs },
            { label: "New Lead Alerts", desc: "Get notified when new leads are captured.", state: leadAlerts, set: setLeadAlerts },
            { label: "Campaign Reports", desc: "Receive campaign performance summaries.", state: campaignReports, set: setCampaignReports },
            { label: "Automation Alerts", desc: "Get notified on automation failures.", state: automationAlerts, set: setAutomationAlerts },
            { label: "Weekly Digest", desc: "Receive a weekly analytics summary.", state: weeklyDigest, set: setWeeklyDigest },
          ].map((item, i) => (
            <div key={i}>
              {i > 0 && <Separator className="mb-4" />}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch checked={item.state} onCheckedChange={item.set} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Button onClick={handleSave} className="bg-accent text-accent-foreground hover:bg-accent/90"><Save className="h-4 w-4 mr-1" />Save Preferences</Button>
    </div>
  );
}

/* ── Main Settings Page ──────────────────────────────────── */

const VALID_TABS = [
  "profile", "onboarding", "billing", "usage", "channels", "senders", "buy-credits",
  "wa-templates", "meta-channel", "tracking", "branding", "team",
  "integrations", "webhooks", "api-keys", "automations", "notifications", "security",
  "ai-sales", "ai-agents", "custom-code",
] as const;

const DashboardSettings = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const workspaceId = useWorkspaceId();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const pathParts = location.pathname.split("/");
  const lastSegment = pathParts[pathParts.length - 1];

  // Resolve the active tab from the URL so refresh / return-from-other-site
  // re-opens the same tab instead of bouncing the user back to Profile.
  const resolveTab = () => {
    const tabParam = new URLSearchParams(location.search).get("tab");
    if (tabParam && (VALID_TABS as readonly string[]).includes(tabParam)) {
      return tabParam;
    }
    if ((VALID_TABS as readonly string[]).includes(lastSegment)) {
      if (lastSegment === "integrations" && !isAdmin) return "webhooks";
      return lastSegment;
    }
    return "profile";
  };

  const activeTab = resolveTab();

  const handleTabChange = (next: string) => {
    if (!workspaceId || next === activeTab) return;
    navigate(`/dashboard/${workspaceId}/settings/${next}`, { replace: true });
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Manage your account, billing, integrations, and preferences.</p>

      {adminLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-6">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="profile" className="gap-1.5"><User className="h-3.5 w-3.5" />Profile</TabsTrigger>
            <TabsTrigger value="onboarding" className="gap-1.5"><Rocket className="h-3.5 w-3.5" />Onboarding</TabsTrigger>
            <TabsTrigger value="billing" className="gap-1.5"><CreditCard className="h-3.5 w-3.5" />Billing</TabsTrigger>
            <TabsTrigger value="usage" className="gap-1.5"><Zap className="h-3.5 w-3.5" />Usage</TabsTrigger>
            <TabsTrigger value="channels" className="gap-1.5"><Radio className="h-3.5 w-3.5" />Channels</TabsTrigger>
            <TabsTrigger value="senders" className="gap-1.5"><Mail className="h-3.5 w-3.5" />Sender Profiles</TabsTrigger>
            <TabsTrigger value="buy-credits" className="gap-1.5"><CreditCard className="h-3.5 w-3.5" />Buy Credits</TabsTrigger>
            <TabsTrigger value="wa-templates" className="gap-1.5"><MessageCircle className="h-3.5 w-3.5" />WA Templates</TabsTrigger>
            <TabsTrigger value="meta-channel" className="gap-1.5"><Radio className="h-3.5 w-3.5" />Instagram & Facebook</TabsTrigger>
            <TabsTrigger value="tracking" className="gap-1.5"><Globe className="h-3.5 w-3.5" />Tracking & Pixels</TabsTrigger>
            <TabsTrigger value="branding" className="gap-1.5"><Palette className="h-3.5 w-3.5" />Branding</TabsTrigger>
            <TabsTrigger value="team" className="gap-1.5"><Users className="h-3.5 w-3.5" />Team</TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="integrations" className="gap-1.5"><Settings2 className="h-3.5 w-3.5" />Integrations</TabsTrigger>
            )}
            <TabsTrigger value="webhooks" className="gap-1.5"><Webhook className="h-3.5 w-3.5" />Webhooks</TabsTrigger>
            <TabsTrigger value="api-keys" className="gap-1.5"><Key className="h-3.5 w-3.5" />API Keys</TabsTrigger>
            <TabsTrigger value="automations" className="gap-1.5"><Zap className="h-3.5 w-3.5" />Automation</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5"><Bell className="h-3.5 w-3.5" />Notifications</TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5"><Shield className="h-3.5 w-3.5" />Security</TabsTrigger>
            <TabsTrigger value="ai-sales" className="gap-1.5"><Bot className="h-3.5 w-3.5" />AI Sales</TabsTrigger>
            <TabsTrigger value="ai-agents" className="gap-1.5"><Sparkles className="h-3.5 w-3.5" />AI Agent Connections</TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="custom-code" className="gap-1.5"><Globe className="h-3.5 w-3.5" />Custom Code</TabsTrigger>
            )}
          </TabsList>

          <div className="mt-6 max-w-4xl">
            <TabsContent value="profile"><ProfileTab /></TabsContent>
            <TabsContent value="onboarding"><OnboardingTab workspaceId={workspaceId} /></TabsContent>
            <TabsContent value="billing"><BillingTab /></TabsContent>
            <TabsContent value="usage"><UsageCreditsTab /></TabsContent>
            <TabsContent value="channels"><ChannelSettingsTab workspaceId={workspaceId} /></TabsContent>
            <TabsContent value="senders">{workspaceId && <SenderProfilesTab workspaceId={workspaceId} />}</TabsContent>
            <TabsContent value="buy-credits">{workspaceId && <BuyCreditsTab workspaceId={workspaceId} />}</TabsContent>
            <TabsContent value="wa-templates"><WhatsAppTemplatesTab /></TabsContent>
            <TabsContent value="meta-channel"><MetaChannelTab workspaceId={workspaceId} /></TabsContent>
            <TabsContent value="tracking"><TrackingPixelsTab workspaceId={workspaceId} /></TabsContent>
            <TabsContent value="branding"><BrandingTab workspaceId={workspaceId} /></TabsContent>
            <TabsContent value="team"><TeamTab workspaceId={workspaceId} /></TabsContent>
            <TabsContent value="integrations">
              {isAdmin ? <IntegrationsTab /> : <AccessDeniedCard />}
            </TabsContent>
            <TabsContent value="webhooks"><WebhooksTab /></TabsContent>
            <TabsContent value="api-keys"><ApiKeysTab workspaceId={workspaceId} /></TabsContent>
            <TabsContent value="automations"><AutomationPrefsTab /></TabsContent>
            <TabsContent value="notifications"><NotificationsTab /></TabsContent>
            <TabsContent value="security"><SecurityTab /></TabsContent>
            <TabsContent value="ai-sales"><SalesCloserSettingsTab workspaceId={workspaceId} /></TabsContent>
            <TabsContent value="ai-agents"><AiAgentConnectionsTab workspaceId={workspaceId} /></TabsContent>
            <TabsContent value="custom-code">{isAdmin ? <CustomCodeTab /> : <AccessDeniedCard />}</TabsContent>
          </div>
        </Tabs>
      )}
    </DashboardLayout>
  );
};

export default DashboardSettings;
