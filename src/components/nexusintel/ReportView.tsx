import type { CompanyIntelligenceReport } from "@/lib/nexusintel/generateReport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success(`${label ?? "Copied"} to clipboard`);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {label ?? "Copy"}
    </Button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">{children}</CardContent>
    </Card>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
      {items.map((i, idx) => (
        <li key={idx}>{i}</li>
      ))}
    </ul>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-semibold">{value}/100</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-accent" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function ReportView({ report }: { report: CompanyIntelligenceReport }) {
  const urgencyVariant =
    report.salesOpportunity.urgency === "High"
      ? "destructive"
      : report.salesOpportunity.urgency === "Medium"
        ? "default"
        : "secondary";

  return (
    <div className="space-y-6">
      {/* Header summary */}
      <Card className="border-accent/40">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">{report.summary.name}</h2>
              <a
                href={`https://${report.summary.website}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-accent hover:underline"
              >
                {report.summary.website}
              </a>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline">{report.summary.industry}</Badge>
                <Badge variant="outline">{report.summary.location}</Badge>
                <Badge variant="outline">{report.summary.size}</Badge>
                <Badge variant={urgencyVariant}>Urgency: {report.salesOpportunity.urgency}</Badge>
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-accent">{report.dealScore.total}</div>
              <div className="text-xs text-muted-foreground">CRM Deal Score</div>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{report.summary.paragraph}</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="opportunity" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="opportunity">Opportunity</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="customer">Customer</TabsTrigger>
          <TabsTrigger value="audit">Website Audit</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
          <TabsTrigger value="tech">Tech Stack</TabsTrigger>
          <TabsTrigger value="dm">Decision-Makers</TabsTrigger>
          <TabsTrigger value="outreach">Outreach</TabsTrigger>
          <TabsTrigger value="followup">Follow-up</TabsTrigger>
          <TabsTrigger value="offer">Offer</TabsTrigger>
          <TabsTrigger value="score">Score</TabsTrigger>
        </TabsList>

        <TabsContent value="opportunity" className="space-y-4">
          <Section title="Sales Opportunity">
            <p><strong>What they need:</strong> {report.salesOpportunity.needs}</p>
            <p><strong>Pain points:</strong></p>
            <Bullets items={report.salesOpportunity.painPoints} />
            <p><strong>What to sell:</strong> {report.salesOpportunity.whatToSell}</p>
            <p><strong>Why:</strong> {report.salesOpportunity.why}</p>
            <p><strong>First move:</strong> {report.salesOpportunity.firstMove}</p>
          </Section>
          <Section title="Lead Generation Opportunities">
            <Bullets items={report.leadGen} />
          </Section>
          <Section title="Automation Opportunities">
            <Bullets items={report.automationOps} />
          </Section>
        </TabsContent>

        <TabsContent value="business" className="space-y-4">
          <Section title="Business Model">
            <p><strong>Revenue model:</strong> {report.businessModel.revenueModel}</p>
            <p><strong>Customer segments:</strong> {report.businessModel.customerSegments}</p>
            <p><strong>Sales cycle:</strong> {report.businessModel.salesCycle}</p>
            <p><strong>Growth opportunities:</strong></p>
            <Bullets items={report.businessModel.growthOpportunities} />
          </Section>
          <Section title="Company Identity">
            <p><strong>Positioning:</strong> {report.identity.brandPositioning}</p>
            <p><strong>Target market:</strong> {report.identity.targetMarket}</p>
            <p><strong>Leadership:</strong> {report.identity.leadership}</p>
            <p><strong>Social:</strong> {report.identity.socialLinks}</p>
            <p><strong>Contact:</strong> {report.identity.contactDetails}</p>
          </Section>
        </TabsContent>

        <TabsContent value="customer" className="space-y-4">
          <Section title="Target Customer Analysis">
            <p><strong>Serves:</strong> {report.targetCustomer.serves}</p>
            <p><strong>Personas:</strong></p>
            <Bullets items={report.targetCustomer.personas} />
            <p><strong>Pain points:</strong></p>
            <Bullets items={report.targetCustomer.painPoints} />
            <p><strong>Buying triggers:</strong></p>
            <Bullets items={report.targetCustomer.buyingTriggers} />
            <p><strong>Likely objections:</strong></p>
            <Bullets items={report.targetCustomer.objections} />
          </Section>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Section title="Website & Funnel Audit">
            <p><strong>Offer:</strong> {report.websiteAudit.offer}</p>
            <p><strong>Audience:</strong> {report.websiteAudit.whoTheyServe}</p>
            <p><strong>Pricing visibility:</strong> {report.websiteAudit.pricingVisibility}</p>
            <p><strong>Strengths:</strong></p>
            <Bullets items={report.websiteAudit.strengths} />
            <p><strong>Weaknesses:</strong></p>
            <Bullets items={report.websiteAudit.weaknesses} />
            <p><strong>Missing CTAs:</strong></p>
            <Bullets items={report.websiteAudit.missingCTAs} />
            <p><strong>Funnel issues:</strong></p>
            <Bullets items={report.websiteAudit.funnelPoints} />
            <p><strong>Messaging issues:</strong></p>
            <Bullets items={report.websiteAudit.messagingIssues} />
            <p><strong>SEO gaps:</strong></p>
            <Bullets items={report.websiteAudit.seoGaps} />
            <p><strong>Landing page recommendations:</strong></p>
            <Bullets items={report.websiteAudit.landingPageRecommendations} />
          </Section>
        </TabsContent>

        <TabsContent value="marketing" className="space-y-4">
          <Section title="Marketing Intelligence">
            <p><strong>Content style:</strong> {report.marketing.contentStyle}</p>
            <p><strong>Lead magnet:</strong> {report.marketing.leadMagnetPresence}</p>
            <p><strong>Email capture:</strong> {report.marketing.emailCaptureStrength}</p>
            <p><strong>Landing page quality:</strong> {report.marketing.landingPageQuality}</p>
            <p><strong>Ad readiness:</strong> {report.marketing.adReadiness}</p>
            <p><strong>Google presence:</strong> {report.marketing.googlePresence}</p>
            <p><strong>Meta Ads:</strong> {report.marketing.metaAds}</p>
            <p><strong>LinkedIn Ads:</strong> {report.marketing.linkedinAds}</p>
            <p><strong>Suggested campaign angles:</strong></p>
            <Bullets items={report.marketing.suggestedCampaignAngles} />
          </Section>
        </TabsContent>

        <TabsContent value="competitors" className="space-y-4">
          <Section title="Competitor Intelligence">
            <p><strong>Competitors:</strong></p>
            <Bullets items={report.competitors.list} />
            <p><strong>What they're doing better:</strong></p>
            <Bullets items={report.competitors.doingBetter} />
            <p><strong>Pricing gap:</strong> {report.competitors.pricingGap}</p>
            <p><strong>Messaging gap:</strong> {report.competitors.messagingGap}</p>
            <p><strong>Positioning gap:</strong> {report.competitors.positioningGap}</p>
            <p><strong>Research checklist:</strong></p>
            <Bullets items={report.competitors.researchChecklist} />
          </Section>
        </TabsContent>

        <TabsContent value="tech" className="space-y-4">
          <Section title="Technology Stack Signals">
            <p><strong>Website:</strong> {report.techStack.website}</p>
            <p><strong>CRM:</strong> {report.techStack.crm}</p>
            <p><strong>Tracking:</strong> {report.techStack.tracking}</p>
            <p><strong>Automation:</strong> {report.techStack.automation}</p>
            <p><strong>Chat:</strong> {report.techStack.chat}</p>
            <p><strong>Analytics:</strong> {report.techStack.analytics}</p>
            <p><strong>Payments:</strong> {report.techStack.payments}</p>
            <p><strong>Email marketing:</strong> {report.techStack.emailMarketing}</p>
            <p><strong>Gaps:</strong></p>
            <Bullets items={report.techStack.gaps} />
          </Section>
        </TabsContent>

        <TabsContent value="dm" className="space-y-4">
          <Section title="Decision-Maker Recommendations">
            <p><strong>Roles to target:</strong></p>
            <Bullets items={report.decisionMakers.roles} />
            <p><strong>Best first contact:</strong> {report.decisionMakers.bestFirstContact}</p>
            <p><strong>Buying committee:</strong> {report.decisionMakers.buyingCommittee}</p>
            <p><strong>LinkedIn (manual verification):</strong></p>
            <Bullets items={report.decisionMakers.linkedinPlaceholders} />
          </Section>
        </TabsContent>

        <TabsContent value="outreach" className="space-y-4">
          <Section title="Cold Email">
            <pre className="whitespace-pre-wrap bg-muted/40 rounded p-4 text-sm">{report.outreach.coldEmail}</pre>
            <CopyButton text={report.outreach.coldEmail} label="Copy email" />
          </Section>
          <Section title="LinkedIn Connection Message">
            <p className="whitespace-pre-wrap">{report.outreach.linkedinConnection}</p>
            <CopyButton text={report.outreach.linkedinConnection} label="Copy LinkedIn message" />
          </Section>
          <Section title="LinkedIn Follow-Up">
            <p className="whitespace-pre-wrap">{report.outreach.linkedinFollowUp}</p>
            <CopyButton text={report.outreach.linkedinFollowUp} label="Copy follow-up" />
          </Section>
          <Section title="WhatsApp Message">
            <p className="whitespace-pre-wrap">{report.outreach.whatsapp}</p>
            <CopyButton text={report.outreach.whatsapp} label="Copy WhatsApp" />
          </Section>
          <Section title="Call Opening Script">
            <p className="whitespace-pre-wrap">{report.outreach.callOpening}</p>
            <CopyButton text={report.outreach.callOpening} label="Copy call script" />
          </Section>
          <Section title="Discovery Call Questions">
            <Bullets items={report.outreach.discoveryQuestions} />
          </Section>
        </TabsContent>

        <TabsContent value="followup" className="space-y-4">
          <Section title="5-Step Follow-Up Sequence">
            <div className="space-y-3">
              {report.followUpSequence.map((s) => (
                <div key={s.day} className="border-l-2 border-accent pl-4">
                  <div className="flex items-center gap-2">
                    <Badge>Day {s.day}</Badge>
                    <Badge variant="outline">{s.channel}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{s.message}</p>
                </div>
              ))}
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="offer" className="space-y-4">
          <Section title="Recommended Offer To Sell">
            <p><strong>Name:</strong> {report.recommendedOffer.name}</p>
            <p><strong>Positioning:</strong> {report.recommendedOffer.positioning}</p>
            <p><strong>Package:</strong> {report.recommendedOffer.package}</p>
            <p><strong>Why it fits:</strong> {report.recommendedOffer.whyItFits}</p>
            <p><strong>First step CTA:</strong> {report.recommendedOffer.firstStepCTA}</p>
          </Section>
        </TabsContent>

        <TabsContent value="score" className="space-y-4">
          <Section title="CRM Deal Score Breakdown">
            <div className="grid sm:grid-cols-2 gap-4">
              <ScoreBar label="Fit" value={report.dealScore.fit} />
              <ScoreBar label="Need" value={report.dealScore.need} />
              <ScoreBar label="Urgency" value={report.dealScore.urgency} />
              <ScoreBar label="Accessibility" value={report.dealScore.accessibility} />
              <ScoreBar label="Revenue potential" value={report.dealScore.revenuePotential} />
              <ScoreBar label="Marketing weakness" value={report.dealScore.marketingWeakness} />
            </div>
            <p className="text-sm text-muted-foreground pt-3">{report.dealScore.explanation}</p>
          </Section>
          <Section title="Recommended Next Actions">
            <Bullets items={report.nextActions} />
          </Section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
