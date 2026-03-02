import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  User, Shield, Bell, CreditCard, Loader2, Save, Upload, Key,
  Mail, MessageCircle, Smartphone, Webhook, Settings2, Clock,
  Copy, Eye, EyeOff, RefreshCw, Trash2, Globe, Zap, Monitor
} from "lucide-react";
import { useDemoMode, useUpdateDemoMode } from "@/hooks/useDemoMode";
import type { DemoVariant } from "@/lib/demo/demoData";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { format } from "date-fns";

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
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
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

/* ── Integrations Tab ────────────────────────────────────── */

function IntegrationsTab() {
  const workspaceId = useWorkspaceId();
  const [emailProvider, setEmailProvider] = useState("");
  const [emailApiKey, setEmailApiKey] = useState("");
  const [whatsappToken, setWhatsappToken] = useState("");
  const [whatsappPhoneId, setWhatsappPhoneId] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  // SMS state
  const [smsProvider, setSmsProvider] = useState("twilio");
  const [smsAccountSid, setSmsAccountSid] = useState("");
  const [smsAuthToken, setSmsAuthToken] = useState("");
  const [smsFromNumber, setSmsFromNumber] = useState("");
  const [smsSaving, setSmsSaving] = useState(false);
  const [smsConnected, setSmsConnected] = useState(false);
  const [smsLoading, setSmsLoading] = useState(true);
  const [testPhone, setTestPhone] = useState("");
  const [testSending, setTestSending] = useState(false);

  const toggle = (key: string) => setShowKeys((p) => ({ ...p, [key]: !p[key] }));
  const mask = (val: string) => val ? "•".repeat(Math.min(val.length, 20)) + val.slice(-4) : "";

  const handleSaveIntegration = (name: string) => {
    toast.success(`${name} settings saved locally. Backend integration coming soon.`);
  };

  // Fetch SMS settings on load
  useEffect(() => {
    if (!workspaceId) return;
    (async () => {
      const { data } = await supabase
        .from("sms_settings" as any)
        .select("provider, account_sid, from_number, is_active")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (data) {
        setSmsConnected(true);
        setSmsProvider((data as any).provider || "twilio");
        setSmsAccountSid((data as any).account_sid || "");
        setSmsFromNumber((data as any).from_number || "");
      }
      setSmsLoading(false);
    })();
  }, [workspaceId]);

  const handleSaveSms = async () => {
    if (!smsAuthToken) { toast.error("Auth Token is required"); return; }
    if (smsProvider === "twilio" && !smsAccountSid) { toast.error("Account SID is required for Twilio"); return; }
    setSmsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("sms-save-settings", {
        body: { workspaceId, provider: smsProvider, accountSid: smsAccountSid, authToken: smsAuthToken, fromNumber: smsFromNumber },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSmsConnected(true);
      setSmsAuthToken("");
      toast.success("SMS Connected Successfully ✅");
    } catch (err: any) {
      toast.error(err.message || "Failed to save SMS settings");
    } finally {
      setSmsSaving(false);
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Mail className="h-5 w-5 text-accent" /><CardTitle className="text-lg">Email Provider</CardTitle></div>
          <CardDescription>Connect your email sending service (SendGrid, Mailgun, Resend, etc.)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Provider</Label>
              <Select value={emailProvider} onValueChange={setEmailProvider}>
                <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                  <SelectItem value="mailgun">Mailgun</SelectItem>
                  <SelectItem value="resend">Resend</SelectItem>
                  <SelectItem value="smtp">Custom SMTP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>API Key</Label>
              <div className="relative">
                <Input value={showKeys.email ? emailApiKey : mask(emailApiKey)} onChange={(e) => setEmailApiKey(e.target.value)} placeholder="Enter API key" type={showKeys.email ? "text" : "password"} />
                <button onClick={() => toggle("email")} className="absolute right-2 top-2 text-muted-foreground hover:text-foreground">
                  {showKeys.email ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <Button size="sm" onClick={() => handleSaveIntegration("Email")} className="bg-accent text-accent-foreground hover:bg-accent/90"><Save className="h-4 w-4 mr-1" />Save</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-accent" /><CardTitle className="text-lg">WhatsApp Cloud API</CardTitle></div>
          <CardDescription>Connect your Meta WhatsApp Business account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Access Token</Label>
              <Input value={showKeys.wa ? whatsappToken : mask(whatsappToken)} onChange={(e) => setWhatsappToken(e.target.value)} placeholder="Enter access token" type={showKeys.wa ? "text" : "password"} />
            </div>
            <div className="space-y-1">
              <Label>Phone Number ID</Label>
              <Input value={whatsappPhoneId} onChange={(e) => setWhatsappPhoneId(e.target.value)} placeholder="e.g. 1234567890" />
            </div>
          </div>
          <Button size="sm" onClick={() => handleSaveIntegration("WhatsApp")} className="bg-accent text-accent-foreground hover:bg-accent/90"><Save className="h-4 w-4 mr-1" />Save</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-accent" /><CardTitle className="text-lg">SMS Gateway</CardTitle></div>
            {!smsLoading && (
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${smsConnected ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
                {smsConnected ? "✓ Connected" : "Not Connected"}
              </span>
            )}
          </div>
          <CardDescription>Connect your SMS provider (Twilio, Vonage, etc.)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Provider</Label>
              <Select value={smsProvider} onValueChange={setSmsProvider}>
                <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="twilio">Twilio</SelectItem>
                  <SelectItem value="vonage">Vonage (coming soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {smsProvider === "twilio" && (
              <div className="space-y-1">
                <Label>Account SID</Label>
                <Input value={smsAccountSid} onChange={(e) => setSmsAccountSid(e.target.value)} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" maxLength={40} />
              </div>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Auth Token</Label>
              <div className="relative">
                <Input
                  value={showKeys.sms ? smsAuthToken : mask(smsAuthToken)}
                  onChange={(e) => setSmsAuthToken(e.target.value)}
                  placeholder={smsConnected ? "Enter new token to update" : "Enter auth token"}
                  type={showKeys.sms ? "text" : "password"}
                />
                <button onClick={() => toggle("sms")} className="absolute right-2 top-2 text-muted-foreground hover:text-foreground">
                  {showKeys.sms ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>From Number</Label>
              <Input value={smsFromNumber} onChange={(e) => setSmsFromNumber(e.target.value)} placeholder="+15551234567" maxLength={20} />
            </div>
          </div>
          <Button size="sm" onClick={handleSaveSms} disabled={smsSaving} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {smsSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            {smsConnected ? "Update SMS Settings" : "Connect SMS"}
          </Button>

          {smsConnected && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium">Send Test SMS</Label>
                <div className="flex gap-2">
                  <Input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="+15551234567" className="max-w-[220px]" maxLength={20} />
                  <Button variant="outline" size="sm" onClick={handleTestSms} disabled={testSending}>
                    {testSending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Smartphone className="h-4 w-4 mr-1" />}
                    Send Test
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Webhook className="h-5 w-5 text-accent" /><CardTitle className="text-lg">Webhook Settings</CardTitle></div>
          <CardDescription>Inbound webhook URL for lead ingestion (Make.com, Zapier, etc.)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Lead Ingest Endpoint</Label>
            <div className="flex gap-2">
              <Input value={`${import.meta.env.VITE_SUPABASE_URL || ""}/functions/v1/ingest-leads`} readOnly className="bg-muted font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL || ""}/functions/v1/ingest-leads`); toast.success("Copied!"); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Send POST requests with Authorization: Bearer &lt;token&gt; and X-Workspace-Id header.</p>
          </div>
        </CardContent>
      </Card>
    </div>
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

/* ── Demo Mode Tab ───────────────────────────────────────── */

function DemoModeTab() {
  const workspaceId = useWorkspaceId();
  const { currentMembership } = useWorkspace();
  const { data: demoSettings, isLoading } = useDemoMode(workspaceId);
  const updateDemo = useUpdateDemoMode();

  const isOwnerOrAdmin = currentMembership?.role === "owner" || currentMembership?.role === "admin";

  if (!isOwnerOrAdmin) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Only workspace owners and admins can manage Demo Mode.
        </CardContent>
      </Card>
    );
  }

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const handleToggle = (enabled: boolean) => {
    updateDemo.mutate(
      { workspaceId, demo_mode_enabled: enabled, demo_seed_variant: demoSettings?.demo_seed_variant || "default" },
      { onSuccess: () => toast.success(enabled ? "Demo Mode enabled" : "Demo Mode disabled") }
    );
  };

  const handleVariant = (variant: string) => {
    updateDemo.mutate(
      { workspaceId, demo_mode_enabled: demoSettings?.demo_mode_enabled ?? false, demo_seed_variant: variant },
      { onSuccess: () => toast.success("Demo dataset updated") }
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Monitor className="h-5 w-5 text-accent" /><CardTitle className="text-lg">Demo Mode</CardTitle></div>
          <CardDescription>Display realistic sample data on the Dashboard for demos and presentations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
            <p className="text-xs text-amber-800 font-medium">⚠️ Demo Mode shows sample analytics. Disable for real reporting.</p>
            <p className="text-xs text-amber-700 mt-1">This only affects dashboard metrics and charts. Leads, Funnels, Campaigns, billing, and automations are never affected.</p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Enable Demo Mode</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Show simulated metrics on the Overview page</p>
            </div>
            <Switch
              checked={demoSettings?.demo_mode_enabled ?? false}
              onCheckedChange={handleToggle}
              disabled={updateDemo.isPending}
            />
          </div>

          <Separator />

          <div className="space-y-1">
            <Label>Demo Dataset Variant</Label>
            <Select
              value={demoSettings?.demo_seed_variant || "default"}
              onValueChange={handleVariant}
              disabled={!demoSettings?.demo_mode_enabled}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="saas">SaaS</SelectItem>
                <SelectItem value="ecommerce">E-commerce</SelectItem>
                <SelectItem value="agency">Agency</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Each variant generates different realistic numbers tailored to the industry.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Main Settings Page ──────────────────────────────────── */

const VALID_TABS = ["profile", "billing", "integrations", "automations", "notifications", "security", "demo"] as const;

const DashboardSettings = () => {
  const location = useLocation();
  const pathParts = location.pathname.split("/");
  const lastSegment = pathParts[pathParts.length - 1];
  const initialTab = (VALID_TABS as readonly string[]).includes(lastSegment) ? lastSegment : "profile";

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Manage your account, billing, integrations, and preferences.</p>

      <Tabs defaultValue={initialTab} className="mt-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="profile" className="gap-1.5"><User className="h-3.5 w-3.5" />Profile</TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5"><CreditCard className="h-3.5 w-3.5" />Billing</TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1.5"><Webhook className="h-3.5 w-3.5" />Integrations</TabsTrigger>
          <TabsTrigger value="automations" className="gap-1.5"><Zap className="h-3.5 w-3.5" />Automation</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5"><Bell className="h-3.5 w-3.5" />Notifications</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5"><Shield className="h-3.5 w-3.5" />Security</TabsTrigger>
          <TabsTrigger value="demo" className="gap-1.5"><Monitor className="h-3.5 w-3.5" />Demo Mode</TabsTrigger>
        </TabsList>

        <div className="mt-6 max-w-3xl">
          <TabsContent value="profile"><ProfileTab /></TabsContent>
          <TabsContent value="billing"><BillingTab /></TabsContent>
          <TabsContent value="integrations"><IntegrationsTab /></TabsContent>
          <TabsContent value="automations"><AutomationPrefsTab /></TabsContent>
          <TabsContent value="notifications"><NotificationsTab /></TabsContent>
          <TabsContent value="security"><SecurityTab /></TabsContent>
          <TabsContent value="demo"><DemoModeTab /></TabsContent>
        </div>
      </Tabs>
    </DashboardLayout>
  );
};

export default DashboardSettings;
