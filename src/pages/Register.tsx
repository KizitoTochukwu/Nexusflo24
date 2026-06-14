import { Link, useNavigate, useSearchParams } from "react-router-dom";
import nexusLogo from "@/assets/nexusflo24-logo-full.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import AuthLayout from "@/components/auth/AuthLayout";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Mail, Lock, User } from "lucide-react";
import { fbqTrack } from "@/lib/analytics/metaPixel";
import SmsConsentCheckbox from "@/components/forms/SmsConsentCheckbox";
import { SMS_CONSENT_TEXT } from "@/lib/consent/smsConsent";

const Register = () => {
  const [searchParams] = useSearchParams();
  const prefillEmail = searchParams.get("email") || "";
  const refCode = searchParams.get("ref") || "";
  const [form, setForm] = useState({ name: "", email: prefillEmail, password: "" });
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (!agreed) {
      toast.error("Please accept the terms and conditions.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.name },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    localStorage.setItem("nexusflo_new_signup", "true");
    fbqTrack("CompleteRegistration", { method: "email", content_name: "signup" });
    // Track referral if ref code present
    if (refCode) {
      try {
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-referral`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ referralCode: refCode, referredUserId: null }),
          }
        );
      } catch {}
    }
    toast.success("Check your email for a confirmation link!");
    navigate("/login");
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    // Fire pre-redirect since the OAuth flow leaves the SPA before we can confirm success.
    fbqTrack("CompleteRegistration", { method: "google", content_name: "signup_initiated" });
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    setGoogleLoading(false);
    if (error) {
      toast.error("Google sign-up failed. Please try again.");
    }
  };

  return (
    <AuthLayout>
      {/* Mobile logo */}
      <div className="mb-6 text-center lg:hidden">
        <Link to="/">
          <img src={nexusLogo} alt="NexusFlo24 Logo" className="h-9 sm:h-10 object-contain mx-auto" />
        </Link>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Create your account</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Start your 14-day free trial. No credit card required.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full h-11 gap-3 font-medium"
          onClick={handleGoogleSignup}
          disabled={googleLoading}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {googleLoading ? "Connecting…" : "Continue with Google"}
        </Button>

        <div className="relative">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
            or sign up with email
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your name"
                className="pl-10"
                maxLength={100}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@company.com"
                className="pl-10"
                maxLength={255}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min. 6 characters"
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Checkbox
              id="terms"
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed font-normal cursor-pointer">
              I agree to the{" "}
              <Link to="/terms-of-service" className="text-accent hover:underline">Terms of Service</Link>{" "}
              and{" "}
              <Link to="/privacy-policy" className="text-accent hover:underline">Privacy Policy</Link>
            </Label>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold font-semibold"
          >
            {loading ? "Creating account…" : "Create Account"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default Register;
