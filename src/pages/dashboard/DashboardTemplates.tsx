import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useTemplates, type TemplateCategory } from "@/hooks/useTemplates";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Mail, Workflow, LayoutTemplate, Lock, Download, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES: { value: TemplateCategory | "all"; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "All", icon: Sparkles },
  { value: "email", label: "Email", icon: Mail },
  { value: "automation", label: "Automation", icon: Workflow },
  { value: "funnel", label: "Funnel", icon: LayoutTemplate },
];

// Placeholder templates shown when DB is empty
const PLACEHOLDER_TEMPLATES = [
  { id: "p1", category: "email" as const, name: "Welcome Drip Sequence", description: "5-email onboarding sequence for new leads with progressive engagement and clear CTAs.", tags: ["onboarding", "drip"], is_premium: false, popularity: 245 },
  { id: "p2", category: "email" as const, name: "Cart Abandonment Recovery", description: "3-step recovery email flow with urgency, social proof, and discount offer.", tags: ["ecommerce", "recovery"], is_premium: false, popularity: 198 },
  { id: "p3", category: "email" as const, name: "Re-engagement Campaign", description: "Win back dormant contacts with a personalized reactivation series.", tags: ["retention", "win-back"], is_premium: true, popularity: 156 },
  { id: "p4", category: "automation" as const, name: "Lead Scoring & Routing", description: "Automatically score leads based on engagement and route hot leads to your sales team.", tags: ["scoring", "routing"], is_premium: false, popularity: 312 },
  { id: "p5", category: "automation" as const, name: "Booking Follow-Up", description: "Send confirmation, reminders, and post-meeting follow-up automatically.", tags: ["bookings", "follow-up"], is_premium: false, popularity: 189 },
  { id: "p6", category: "automation" as const, name: "Multi-Channel Nurture", description: "Coordinate Email + WhatsApp + SMS sequences based on lead behavior.", tags: ["multi-channel", "nurture"], is_premium: true, popularity: 267 },
  { id: "p7", category: "funnel" as const, name: "Webinar Registration", description: "High-converting registration page with countdown timer and social proof.", tags: ["webinar", "events"], is_premium: false, popularity: 178 },
  { id: "p8", category: "funnel" as const, name: "Lead Magnet Download", description: "Opt-in page → thank you → email delivery sequence for digital products.", tags: ["lead-magnet", "download"], is_premium: false, popularity: 234 },
  { id: "p9", category: "funnel" as const, name: "Consultation Booking", description: "Landing page with trust signals, FAQ, and integrated booking calendar.", tags: ["consulting", "booking"], is_premium: true, popularity: 145 },
];

const DashboardTemplates = () => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | "all">("all");
  const { data: dbTemplates = [], isLoading } = useTemplates(
    activeCategory === "all" ? undefined : activeCategory
  );

  const templates = dbTemplates.length > 0 ? dbTemplates : PLACEHOLDER_TEMPLATES;

  const filtered = templates.filter((t) => {
    if (activeCategory !== "all" && t.category !== activeCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.name.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q) || t.tags.some((tag) => tag.toLowerCase().includes(q));
    }
    return true;
  });

  const handleInstall = (templateName: string, isPremium: boolean) => {
    if (isPremium) {
      toast.info("Premium templates require a Pro or Enterprise plan.");
      return;
    }
    toast.success(`"${templateName}" installed! Check your ${templates.find(t => t.name === templateName)?.category || 'items'} list.`);
  };

  const categoryColors: Record<string, string> = {
    email: "bg-blue-100 text-blue-700",
    automation: "bg-purple-100 text-purple-700",
    funnel: "bg-emerald-100 text-emerald-700",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Template Marketplace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse and install pre-built templates to accelerate your marketing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search templates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as any)}>
            <TabsList>
              {CATEGORIES.map((cat) => (
                <TabsTrigger key={cat.value} value={cat.value} className="gap-1.5">
                  <cat.icon className="h-3.5 w-3.5" />
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Search className="h-8 w-8 mb-2 opacity-40" />
            <p className="font-medium">No templates found</p>
            <p className="text-sm mt-1">Try adjusting your search or category filter.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((template) => (
              <Card key={template.id} className="group relative overflow-hidden transition-shadow hover:shadow-card-hover">
                {/* Gradient header strip */}
                <div className={`h-1.5 ${
                  template.category === "email" ? "bg-blue-500" :
                  template.category === "automation" ? "bg-purple-500" : "bg-emerald-500"
                }`} />
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <h3 className="font-semibold text-sm leading-tight truncate">{template.name}</h3>
                      <Badge variant="outline" className={`text-[10px] px-1.5 ${categoryColors[template.category]}`}>
                        {template.category}
                      </Badge>
                    </div>
                    {template.is_premium && (
                      <Badge className="bg-accent/15 text-accent border-accent/25 shrink-0 gap-1">
                        <Lock className="h-2.5 w-2.5" /> Pro
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {template.description}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {template.tags.map((tag) => (
                      <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-muted-foreground">
                      {template.popularity.toLocaleString()} installs
                    </span>
                    <Button
                      size="sm"
                      variant={template.is_premium ? "outline" : "default"}
                      className={!template.is_premium ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}
                      onClick={() => handleInstall(template.name, template.is_premium)}
                    >
                      {template.is_premium ? (
                        <><Lock className="h-3 w-3 mr-1" /> Unlock</>
                      ) : (
                        <><Download className="h-3 w-3 mr-1" /> Install</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardTemplates;
