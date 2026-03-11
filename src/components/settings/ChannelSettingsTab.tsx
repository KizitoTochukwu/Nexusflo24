import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Mail, Smartphone, MessageCircle, Loader2, Save, ChevronDown,
  CheckCircle2, XCircle, Unplug, Send,
} from "lucide-react";

interface ChannelStatus {
  configured: boolean;
  is_active: boolean;
  masked: Record<string, string>;
  updated_at: string | null;
}

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
  const [waAccessToken, setWaAccessToken] = useState("");
  const [waPhoneNumberId, setWaPhoneNumberId] = useState("");
  const [waVerifyToken, setWaVerifyToken] = useState("");
  const [waSaving, setWaSaving] = useState(false);

  // Test states
  const [emailTestTo, setEmailTestTo] = useState("");
  const [emailTestSending, setEmailTestSending] = useState(false);
  const [smsTestTo, setSmsTestTo] = useState("");
  const [smsTestSending, setSmsTestSending] = useState(false);
  const [waTestTo, setWaTestTo] = useState("");
  const [waTestMsg, setWaTestMsg] = useState("");
  const [waTestSending, setWaTestSending] = useState(false);
  const [disconnectTarget, setDisconnectTarget] = useState<string | null>(null);
  useEffect(() => {
    fetchStatus();
  }, [workspaceId]);

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
        setChannels(await res.json());
      }
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
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setEmailTestSending(false);
    }
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
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setSmsTestSending(false);
    }
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
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setWaTestSending(false);
    }
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

      {/* Email Channel */}
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
            <CardContent className="space-y-3 pt-0">
              {channels?.email?.configured && (
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {Object.entries(channels.email.masked).map(([k, v]) => (
                    <p key={k}><span className="font-medium">{k}:</span> {v}</p>
                  ))}
                </div>
              )}
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

      {/* SMS Channel */}
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
            <CardContent className="space-y-3 pt-0">
              {channels?.sms?.configured && (
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {Object.entries(channels.sms.masked).map(([k, v]) => (
                    <p key={k}><span className="font-medium">{k}:</span> {v}</p>
                  ))}
                </div>
              )}
              <Separator />
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

      {/* WhatsApp Channel */}
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
            <CardContent className="space-y-3 pt-0">
              {channels?.whatsapp?.configured && (
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {Object.entries(channels.whatsapp.masked).map(([k, v]) => (
                    <p key={k}><span className="font-medium">{k}:</span> {v}</p>
                  ))}
                </div>
              )}
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
                  <Button variant="outline" size="sm" onClick={() => disconnectChannel("whatsapp")}>
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
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
