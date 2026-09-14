import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import nexusLogo from "@/assets/nexusflo24-logo-full.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLayout from "@/components/auth/AuthLayout";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let settled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        settled = true;
        setReady(true);
        setChecking(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        settled = true;
        setReady(true);
        setChecking(false);
      } else {
        // Give the recovery token in the URL a moment to establish a session.
        setTimeout(() => {
          if (!settled) setChecking(false);
        }, 2500);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated. You're signed in.");
    navigate("/dashboard", { replace: true });
  };

  return (
    <AuthLayout>
      <div className="mb-6 text-center lg:hidden">
        <Link to="/">
          <img src={nexusLogo} alt="NexusFlo24 Logo" className="h-11 sm:h-12 object-contain mx-auto" />
        </Link>
      </div>

      {checking ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !ready ? (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">This link has expired</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Password reset links can only be used once and expire after a short time. Request a fresh one and we'll
              email it straight away.
            </p>
          </div>
          <Button
            className="w-full h-11 bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold font-semibold"
            onClick={() => navigate("/forgot-password")}
          >
            Request a new link
          </Button>
          <Link to="/login" className="block text-sm font-medium text-accent hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Set a new password</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Choose a strong password of at least 8 characters.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm new password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="w-full h-11 bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold font-semibold"
            >
              {saving ? "Saving…" : "Update password"}
            </Button>
          </form>
        </div>
      )}
    </AuthLayout>
  );
};

export default ResetPassword;
