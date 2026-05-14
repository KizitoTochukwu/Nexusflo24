import Layout from "@/components/layout/Layout";
import Seo from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/contexts/AuthContext";
import { useReferrals } from "@/hooks/useReferrals";
import { Copy, Share2, Mail, MessageCircle, Users, MousePointerClick, Gift, Trophy, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const Referral = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: stats, isLoading } = useReferrals();
  const referralCode = user?.id?.slice(0, 8) || "DEMO1234";
  const referralLink = `https://nexusflo24.lovable.app/register?ref=${referralCode}`;
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: "Copied!", description: "Referral link copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Join NexusFlo24 and supercharge your marketing! ${referralLink}`)}`, "_blank");
  };

  const shareEmail = () => {
    window.open(`mailto:?subject=${encodeURIComponent("Try NexusFlo24!")}&body=${encodeURIComponent(`Hey! Check out NexusFlo24 for AI-powered marketing automation: ${referralLink}`)}`, "_blank");
  };

  const statCards = [
    { icon: MousePointerClick, label: "Link Clicks", value: String(stats?.totalClicks ?? 0) },
    { icon: Users, label: "Signups", value: String(stats?.totalSignups ?? 0) },
    { icon: Gift, label: "Credits Earned", value: String(stats?.totalRewardCredits ?? 0) },
  ];

  const steps = [
    { icon: Share2, title: "Share Your Link", desc: "Send your unique referral link to friends and colleagues." },
    { icon: Users, title: "They Sign Up", desc: "When they register using your link, they get a free trial." },
    { icon: Trophy, title: "Earn Rewards", desc: "Get credits and cash rewards for every successful referral." },
  ];

  const faqs = [
    { q: "How does the referral program work?", a: "Share your unique link. When someone signs up and subscribes through your link, you earn rewards — credits toward your NexusFlo24 subscription or cash payouts." },
    { q: "Is there a limit to how many people I can refer?", a: "No! Refer as many people as you like. The more you refer, the more you earn." },
    { q: "When do I receive my reward?", a: "Rewards are credited to your account within 7 days after your referral completes their first billing cycle." },
    { q: "Do my referrals get any benefit?", a: "Yes — they receive an extended 14-day free trial instead of the standard 7-day trial." },
    { q: "Can I track my referrals?", a: "Absolutely. Your referral dashboard shows clicks, signups, and rewards in real time." },
  ];

  return (
    <Layout>
      <Seo
        title="Referral Program – Earn 500 Credits per Signup"
        description="Invite friends to NexusFlo24 and earn 500 messaging credits for every active signup. Track clicks, signups and rewards in real time."
      />
      {/* Hero */}
      <section className="bg-hero py-20 md:py-28 text-center">
        <div className="container max-w-3xl bg-slate-200">
          <h1 className="text-3xl md:text-5xl font-extrabold text-primary-foreground mb-4 animate-fade-up">
            Refer a Friend. <span className="text-gradient-gold">Earn Rewards.</span>
          </h1>
          <p className="text-primary-foreground/80 text-lg md:text-xl mb-8 animate-fade-up animation-delay-200">
            Share NexusFlo24 with your network and get rewarded for every signup. It's a win-win.
          </p>
          <Button size="lg" className="bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold animate-fade-up animation-delay-400" onClick={() => document.getElementById("referral-link")?.scrollIntoView({ behavior: "smooth" })}>
            Start Referring
          </Button>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 bg-surface">
        <div className="container max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <Card key={i} className="text-center shadow-card hover:shadow-card-hover transition-shadow">
                <CardContent className="pt-8 pb-6 flex flex-col items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-accent/10 flex items-center justify-center">
                    <s.icon className="h-7 w-7 text-accent" />
                  </div>
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="text-muted-foreground text-sm">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Referral Link */}
      <section id="referral-link" className="py-16 md:py-24">
        <div className="container max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Your Referral Link</h2>
          {user ? (
            <Card className="shadow-card">
              <CardContent className="pt-6 space-y-4">
                <div className="flex gap-2">
                  <Input value={referralLink} readOnly className="bg-muted font-mono text-sm" />
                  <Button variant="outline" onClick={copyLink}>
                    <Copy className="h-4 w-4 mr-1" /> {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" size="sm" onClick={shareWhatsApp}><MessageCircle className="h-4 w-4 mr-1" /> WhatsApp</Button>
                  <Button variant="outline" size="sm" onClick={shareEmail}><Mail className="h-4 w-4 mr-1" /> Email</Button>
                  <Button variant="outline" size="sm" onClick={() => { navigator.share?.({ title: "NexusFlo24", url: referralLink }); }}><Share2 className="h-4 w-4 mr-1" /> Share</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-card text-center">
              <CardContent className="pt-6">
                <p className="text-muted-foreground mb-4">Log in to generate your unique referral link.</p>
                <Button asChild className="bg-accent text-accent-foreground hover:bg-gold-dark"><a href="/login">Log In</a></Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Tracking Dashboard */}
      {user && (
        <section className="py-16 md:py-24 bg-surface">
          <div className="container max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Your Referral Stats</h2>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="grid grid-cols-3 gap-6">
                {statCards.map((s, i) => (
                  <Card key={i} className="text-center shadow-card">
                    <CardContent className="pt-6 flex flex-col items-center gap-2">
                      <s.icon className="h-8 w-8 text-accent" />
                      <p className="text-2xl font-bold tabular-nums">{s.value}</p>
                      <p className="text-sm text-muted-foreground">{s.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="py-16 md:py-24">
        <div className="container max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger>{f.q}</AccordionTrigger>
                <AccordionContent>{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-hero py-16 text-center">
        <div className="container max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">Ready to Start Earning?</h2>
          <p className="text-primary-foreground/80 mb-6">Share NexusFlo24 and earn rewards with every referral.</p>
          <Button size="lg" className="bg-accent text-accent-foreground hover:bg-gold-dark shadow-gold" onClick={() => document.getElementById("referral-link")?.scrollIntoView({ behavior: "smooth" })}>
            Start Referring Now
          </Button>
        </div>
      </section>
    </Layout>
  );
};

export default Referral;
