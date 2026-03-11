import { Link } from "react-router-dom";
import { ReactNode } from "react";
import { Bot, Zap, TrendingUp, BarChart3 } from "lucide-react";
import logoFull from "@/assets/nexusflo24-logo-full.png";

const features = [
  { icon: Bot, text: "AI-Powered Lead Scoring & Nurturing" },
  { icon: Zap, text: "Smart Campaign Automation" },
  { icon: TrendingUp, text: "Conversion-Optimized Funnels" },
  { icon: BarChart3, text: "Real-Time Analytics Dashboard" },
];

const AuthLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-hero relative overflow-hidden flex-col justify-between p-12">
        {/* Abstract decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute bottom-1/4 -left-16 w-72 h-72 rounded-full bg-navy-lighter/30 blur-2xl" />
          <div className="absolute top-1/2 right-1/4 w-48 h-48 rounded-full bg-accent/5 blur-2xl" />
        </div>

        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center">
            <img src={logoFull} alt="NexusFlo24" className="h-10 w-auto object-contain" />
          </Link>
        </div>

        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h1 className="text-3xl xl:text-4xl font-extrabold leading-tight text-primary-foreground">
              Automate Your Marketing.{" "}
              <span className="text-gradient-gold">Convert Smarter.</span>{" "}
              Grow Faster — with AI.
            </h1>
            <p className="text-lg text-primary-foreground/70 max-w-md leading-relaxed">
              The all-in-one AI marketing platform for lead generation, campaign automation, and conversion optimization.
            </p>
          </div>

          <div className="grid gap-4">
            {features.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl bg-primary-foreground/5 backdrop-blur-sm border border-primary-foreground/10 px-4 py-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/20">
                  <f.icon className="h-4.5 w-4.5 text-accent" />
                </div>
                <span className="text-sm font-medium text-primary-foreground/90">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-primary-foreground/40">
            © {new Date().getFullYear()} NexusFlo24. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-background p-6 sm:p-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
};

export default AuthLayout;
