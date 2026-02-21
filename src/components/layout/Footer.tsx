import { Link } from "react-router-dom";
import { Mail, Facebook, Linkedin, Instagram, Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { useCaptureLead } from "@/hooks/useCaptureLead";

const Footer = () => {
  const [email, setEmail] = useState("");
  const { capture, loading, success } = useCaptureLead();

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    try {
      await capture({
        email,
        source: "Newsletter",
        tags: ["website-signup", "newsletter"],
        notes: "Signed up via footer newsletter form.",
        formId: "footer-newsletter",
        page: window.location.pathname,
      });
      toast.success("You're in — check your inbox!");
      setEmail("");
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <footer className="border-t bg-primary text-primary-foreground">
      <div className="container py-16">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold">
              <img src={logo} alt="NexusFlo24 Logo" className="h-8 w-8 rounded-lg object-cover" />
              <span>NexusFlo24</span>
            </Link>
            <p className="text-sm text-primary-foreground/70">
              Automate your marketing. Convert smarter. Grow faster — with AI.
            </p>
            <div className="flex gap-3">
              {[
                { Icon: Facebook, href: "https://www.facebook.com/nexusflo24", label: "Facebook" },
                { Icon: Instagram, href: "https://www.instagram.com/nexusflo24", label: "Instagram" },
                { Icon: Linkedin, href: "https://linkedin.com/company/nexusflo24", label: "LinkedIn" },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="rounded-md p-2 transition-all hover:bg-navy-light hover:text-accent hover:-translate-y-0.5"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-accent">Product</h4>
            {["Features", "Pricing", "Dashboard", "Integrations"].map((item) => (
              <Link key={item} to={`/${item.toLowerCase()}`} className="block text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
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
            ].map((item) => (
              <Link key={item.label} to={item.to} className="block text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                {item.label}
              </Link>
            ))}
          </div>

          {/* Legal (replaces Newsletter column at md, add Newsletter below legal at lg) */}
        </div>

        {/* Legal Links Row */}
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-primary-foreground/70">
          {[
            { label: "Privacy Policy", to: "/privacy-policy" },
            { label: "Terms of Service", to: "/terms-of-service" },
            { label: "Cookies", to: "/cookie-policy" },
            { label: "Refund Policy", to: "/refund-policy" },
            { label: "Security", to: "/security" },
            { label: "Acceptable Use", to: "/acceptable-use" },
            { label: "DPA", to: "/data-processing-addendum" },
            { label: "Disclaimer", to: "/disclaimer" },
            { label: "Anti-Spam", to: "/anti-spam-policy" },
            { label: "GDPR Rights", to: "/gdpr-rights" },
          ].map((item) => (
            <Link key={item.label} to={item.to} className="transition-colors hover:text-primary-foreground">
              {item.label}
            </Link>
          ))}

          {/* Newsletter */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-accent">Stay Updated</h4>
            <p className="text-sm text-primary-foreground/70">
              Get AI marketing tips and product updates.
            </p>
            {success ? (
              <p className="text-sm font-semibold text-gold">✓ Subscribed! Your AI nurture flow starts now.</p>
            ) : (
              <form onSubmit={handleNewsletter} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-navy-light border-navy-lighter text-primary-foreground placeholder:text-primary-foreground/40"
                />
                <Button type="submit" size="sm" disabled={loading} className="bg-accent text-accent-foreground hover:bg-gold-dark whitespace-nowrap">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Subscribe"}
                </Button>
              </form>
            )}
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
