import { Link } from "react-router-dom";
import { useState } from "react";
import nexusLogo from "@/assets/nexusflo24-logo-full.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLayout from "@/components/auth/AuthLayout";
import { supabase } from "@/integrations/supabase/client";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error && !/user not found/i.test(error.message)) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  };

  return (
    <AuthLayout>
      <div className="mb-6 text-center lg:hidden">
        <Link to="/">
          <img src={nexusLogo} alt="NexusFlo24 Logo" className="h-11 sm:h-12 object-contain mx-auto" />
        </Link>
      </div>

      {sent ? (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
            <CheckCircle2 className="h-7 w-7 text-accent" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Check your inbox</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              If an account exists for <span className="font-medium text-foreground">{email}</span>, we've sent a link to
              reset your password. The link expires shortly, so use it soon.
            </p>
          </div>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-11"
              onClick={() => setSent(false)}
            >
              Use a different email
            </Button>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-accent hover:underline"
            >
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Forgot your password?</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Enter your email and we'll send you a link to set a new one.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold font-semibold"
            >
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link to="/login" className="font-semibold text-accent hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;
