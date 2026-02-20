import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { User, Shield, Bell, CreditCard, Loader2, Save } from "lucide-react";
import { format } from "date-fns";

interface ProfileData {
  full_name: string;
  phone: string;
  company: string;
}

const DashboardProfileSettings = () => {
  const { user, subscription } = useAuth();
  const [profile, setProfile] = useState<ProfileData>({ full_name: "", phone: "", company: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailNotifs, setEmailNotifs] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, company")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setProfile({
          full_name: data.full_name || "",
          phone: (data as any).phone || "",
          company: (data as any).company || "",
        });
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name || null,
        phone: profile.phone || null,
        company: profile.company || null,
      } as any)
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: "Failed to save profile.", variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Your profile has been updated." });
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email sent", description: "Check your inbox for a password reset link." });
    }
  };

  const planLabel = subscription?.plan
    ? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)
    : "Free";

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold">Profile Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your personal information and account preferences.</p>

        {loading ? (
          <div className="mt-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="mt-8 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2"><User className="h-5 w-5 text-accent" /><CardTitle className="text-lg">Profile Information</CardTitle></div>
                <CardDescription>Update your personal details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
                    {profile.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Profile Photo</p>
                    <p className="text-xs text-muted-foreground">Avatar upload coming soon.</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-1">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} placeholder="Your full name" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+1 (555) 000-0000" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="company">Company / Brand Name</Label>
                  <Input id="company" value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} placeholder="Your company name" />
                </div>
                <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-accent" /><CardTitle className="text-lg">Account Information</CardTitle></div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Current Plan</span><span className="font-medium">{planLabel}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Account Created</span><span className="font-medium">{user?.created_at ? format(new Date(user.created_at), "MMM d, yyyy") : "—"}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Email Verified</span><span className="font-medium">{user?.email_confirmed_at ? "Verified ✓" : "Not verified"}</span></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2"><Shield className="h-5 w-5 text-accent" /><CardTitle className="text-lg">Security</CardTitle></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Password</p>
                    <p className="text-xs text-muted-foreground">Send a password reset link to your email.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handlePasswordReset}>Change Password</Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2"><Bell className="h-4 w-4 text-muted-foreground" /><p className="text-sm font-medium">Email Notifications</p></div>
                    <p className="text-xs text-muted-foreground">Receive email updates about your account.</p>
                  </div>
                  <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardProfileSettings;
