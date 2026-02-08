import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const Register = () => {
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    toast.success("Account created! Welcome to NexusFlo24.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-card">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-xl font-bold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-primary">Nexus</span>
            <span className="text-gradient-gold">Flo24</span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Start Your Free Trial</h1>
          <p className="mt-1 text-sm text-muted-foreground">14 days free. No credit card required.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" maxLength={100} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" maxLength={255} />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min. 6 characters" />
          </div>
          <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold">
            Create Account
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-accent hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
