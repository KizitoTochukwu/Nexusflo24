import { Link } from "react-router-dom";
import { Zap, Mail, Twitter, Linkedin, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";

const Footer = () => {
  const [email, setEmail] = useState("");

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    toast.success("Subscribed! Your AI nurture flow starts now.");
    setEmail("");
  };

  return (
    <footer className="border-t bg-primary text-primary-foreground">
      <div className="container py-16">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                <Zap className="h-4 w-4 text-accent-foreground" />
              </div>
              <span>NexusFlo24</span>
            </Link>
            <p className="text-sm text-primary-foreground/70">
              Automate your marketing. Convert smarter. Grow faster — with AI.
            </p>
            <div className="flex gap-3">
              {[Twitter, Linkedin, Instagram].map((Icon, i) => (
                <a key={i} href="#" className="rounded-md p-2 transition-colors hover:bg-navy-light">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-accent">Product</h4>
            {["Features", "Pricing", "Dashboard", "Integrations"].map((item) => (
              <Link
                key={item}
                to={`/${item.toLowerCase()}`}
                className="block text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground"
              >
                {item}
              </Link>
            ))}
          </div>

          {/* Company */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-accent">Company</h4>
            {[
              { label: "About", to: "/about" },
              { label: "Contact", to: "/contact" },
              { label: "Privacy Policy", to: "#" },
              { label: "Terms of Service", to: "#" },
            ].map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="block text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Newsletter */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-accent">Stay Updated</h4>
            <p className="text-sm text-primary-foreground/70">
              Get AI marketing tips and product updates.
            </p>
            <form onSubmit={handleNewsletter} className="flex gap-2">
              <Input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-navy-light border-navy-lighter text-primary-foreground placeholder:text-primary-foreground/40"
              />
              <Button type="submit" size="sm" className="bg-accent text-accent-foreground hover:bg-gold-dark whitespace-nowrap">
                Subscribe
              </Button>
            </form>
            <p className="text-xs text-primary-foreground/50">
              <Mail className="mr-1 inline h-3 w-3" />
              support@nexusflo24.com
            </p>
          </div>
        </div>

        <div className="mt-12 border-t border-navy-light pt-6 text-center text-xs text-primary-foreground/50">
          <p>© {new Date().getFullYear()} NexusFlo24. All rights reserved. GDPR-ready · 99.9% uptime</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
