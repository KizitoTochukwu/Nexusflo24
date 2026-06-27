// Deterministic mock AI report generator for NexusIntel MVP.
// Produces realistic, specific-feeling output from form inputs.

export interface AnalysisInput {
  companyName?: string;
  websiteUrl: string;
  industry?: string;
  location?: string;
  size?: string;
  servicesOffer: string; // What user wants to sell
  targetCustomerType?: string;
  notes?: string;
  depth: "quick" | "standard" | "deep";
  sections: {
    identity: boolean;
    websiteAudit: boolean;
    marketing: boolean;
    leadGen: boolean;
    automation: boolean;
    competitors: boolean;
    techStack: boolean;
    decisionMakers: boolean;
    outreach: boolean;
    followUp: boolean;
    dealScore: boolean;
  };
}

export interface CompanyIntelligenceReport {
  summary: {
    name: string;
    website: string;
    industry: string;
    location: string;
    size: string;
    services: string;
    paragraph: string;
    businessModel: string;
  };
  identity: {
    brandPositioning: string;
    targetMarket: string;
    leadership: string;
    socialLinks: string;
    contactDetails: string;
  };
  businessModel: {
    revenueModel: string;
    customerSegments: string;
    salesCycle: string;
    growthOpportunities: string[];
  };
  targetCustomer: {
    serves: string;
    personas: string[];
    painPoints: string[];
    buyingTriggers: string[];
    objections: string[];
  };
  websiteAudit: {
    offer: string;
    whoTheyServe: string;
    pricingVisibility: string;
    strengths: string[];
    weaknesses: string[];
    missingCTAs: string[];
    funnelPoints: string[];
    messagingIssues: string[];
    seoGaps: string[];
    landingPageRecommendations: string[];
  };
  marketing: {
    contentStyle: string;
    leadMagnetPresence: string;
    emailCaptureStrength: string;
    landingPageQuality: string;
    adReadiness: string;
    googlePresence: string;
    metaAds: string;
    linkedinAds: string;
    suggestedCampaignAngles: string[];
  };
  salesOpportunity: {
    needs: string;
    painPoints: string[];
    whatToSell: string;
    urgency: "Low" | "Medium" | "High";
    why: string;
    firstMove: string;
  };
  competitors: {
    list: string[];
    doingBetter: string[];
    pricingGap: string;
    messagingGap: string;
    positioningGap: string;
    researchChecklist: string[];
  };
  techStack: {
    website: string;
    crm: string;
    tracking: string;
    automation: string;
    chat: string;
    analytics: string;
    payments: string;
    emailMarketing: string;
    gaps: string[];
  };
  decisionMakers: {
    roles: string[];
    bestFirstContact: string;
    buyingCommittee: string;
    linkedinPlaceholders: string[];
  };
  outreach: {
    coldEmail: string;
    linkedinConnection: string;
    linkedinFollowUp: string;
    whatsapp: string;
    callOpening: string;
    discoveryQuestions: string[];
  };
  leadGen: string[];
  automationOps: string[];
  recommendedOffer: {
    name: string;
    positioning: string;
    package: string;
    whyItFits: string;
    firstStepCTA: string;
  };
  followUpSequence: { day: number; channel: string; message: string }[];
  dealScore: {
    total: number;
    fit: number;
    need: number;
    urgency: number;
    accessibility: number;
    revenuePotential: number;
    marketingWeakness: number;
    explanation: string;
  };
  nextActions: string[];
}

function domainFromUrl(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function nameFromDomain(domain: string): string {
  const base = domain.split(".")[0];
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

export function generateCompanyIntelligenceReport(
  input: AnalysisInput,
): CompanyIntelligenceReport {
  const domain = domainFromUrl(input.websiteUrl);
  const name = input.companyName?.trim() || nameFromDomain(domain);
  const industry = input.industry?.trim() || "Professional Services";
  const location = input.location?.trim() || "United Kingdom";
  const size = input.size?.trim() || "11–50 employees";
  const offer = input.servicesOffer.trim();
  const seed = hash(domain + offer);

  const urgency = pick<"Low" | "Medium" | "High">(["Medium", "High", "Medium"], seed);

  const fit = 65 + (seed % 25);
  const need = 60 + ((seed >> 1) % 30);
  const urg = urgency === "High" ? 85 : urgency === "Medium" ? 65 : 40;
  const accessibility = 55 + ((seed >> 2) % 35);
  const revenuePotential = 60 + ((seed >> 3) % 35);
  const marketingWeakness = 60 + ((seed >> 4) % 35);
  const total = Math.round(
    (fit + need + urg + accessibility + revenuePotential + marketingWeakness) / 6,
  );

  return {
    summary: {
      name,
      website: domain,
      industry,
      location,
      size,
      services: `Primary services centred on ${industry.toLowerCase()} delivery for B2B and SMB customers.`,
      paragraph: `${name} is a ${size.toLowerCase()} ${industry.toLowerCase()} business based in ${location}. Their public website (${domain}) positions them around delivery quality and client outcomes, with the majority of revenue likely coming from recurring service engagements and project-based work. Based on visible positioning, they sit in a competitive mid-market segment where messaging clarity, lead capture, and follow-up speed are the biggest differentiators.`,
      businessModel: `${name} appears to operate a services-led model, monetising through retainers, project fees, and upsell into adjacent services. There is room to layer in productised offers and recurring revenue.`,
    },
    identity: {
      brandPositioning: `${name} positions itself as a trusted ${industry.toLowerCase()} partner — practical, results-focused, relationship-led.`,
      targetMarket: `Likely targets SMB and mid-market clients in ${location} who value senior delivery and outcome accountability.`,
      leadership: "Founder/CEO publicly listed (manual verification required).",
      socialLinks: "LinkedIn company page, X/Twitter, and possibly YouTube — verify manually.",
      contactDetails: `Contact form, email, and phone likely listed on ${domain}/contact.`,
    },
    businessModel: {
      revenueModel: "Services + retainers + project fees, with potential for productised offers.",
      customerSegments: `SMBs and mid-market ${industry.toLowerCase()} buyers; some enterprise pilots.`,
      salesCycle: "Estimated 2–6 weeks for SMB engagements, longer for enterprise.",
      growthOpportunities: [
        "Launch a productised lead-gen offer with fixed scope and pricing.",
        "Build a 5-step nurture sequence to convert top-of-funnel traffic.",
        "Add WhatsApp + SMS follow-up to lift speed-to-lead.",
        "Introduce tiered pricing to capture price-sensitive buyers.",
      ],
    },
    targetCustomer: {
      serves: input.targetCustomerType?.trim() || `B2B buyers in ${industry.toLowerCase()} who need predictable results.`,
      personas: ["Founder / Owner-Operator", "Head of Marketing", "Operations Director"],
      painPoints: [
        "Inconsistent lead flow",
        "Manual follow-up that loses warm leads",
        "Unclear ROI on current marketing spend",
        "Tooling sprawl without integrated reporting",
      ],
      buyingTriggers: [
        "Missed monthly revenue targets",
        "New hire in marketing or sales leadership",
        "Funding round or expansion push",
        "Loss of a major account",
      ],
      objections: [
        "We've tried agencies before",
        "Internal team is already doing it",
        "Budget is committed elsewhere this quarter",
      ],
    },
    websiteAudit: {
      offer: "Offer is described but not packaged — pricing and outcomes need clearer framing.",
      whoTheyServe: "Audience is referenced but not segmented; persona-led pages would lift conversion.",
      pricingVisibility: "No public pricing — consider a 'Starts from' anchor to qualify leads.",
      strengths: [
        "Clear brand identity and consistent visuals",
        "Service descriptions present",
        "Social proof visible above the fold",
      ],
      weaknesses: [
        "Weak primary CTA hierarchy",
        "No lead magnet or value exchange",
        "Slow mobile load on key landing pages",
        "Generic testimonials without measurable outcomes",
      ],
      missingCTAs: [
        "Sticky 'Book a Call' CTA",
        "Exit-intent capture",
        "Inline CTAs on blog/content pages",
      ],
      funnelPoints: [
        "No segmentation by buyer type",
        "Contact form is the only conversion path",
        "No thank-you / nurture sequence triggered post-submit",
      ],
      messagingIssues: [
        "Headline talks about features not outcomes",
        "No quantified results in hero",
        "Service pages read like brochures",
      ],
      seoGaps: [
        "Thin meta descriptions on service pages",
        "No schema markup for organisation/services",
        "Limited internal linking from blog to service pages",
      ],
      landingPageRecommendations: [
        "Build a dedicated 'free audit' landing page",
        "Add a 3-step explainer above the fold",
        "Insert a credibility row (logos, numbers, awards)",
        "Add an FAQ block that handles top 5 objections",
      ],
    },
    marketing: {
      contentStyle: "Functional and informative; lacks strong point of view.",
      leadMagnetPresence: "No visible downloadable lead magnet.",
      emailCaptureStrength: "Footer-only newsletter signup — low intent capture.",
      landingPageQuality: "General homepage and service pages; no campaign-specific pages.",
      adReadiness: "Site is not yet conversion-optimised for paid traffic.",
      googlePresence: "Likely ranking for branded terms; weak on commercial-intent keywords.",
      metaAds: "No active Meta ads detected (verify in Ad Library).",
      linkedinAds: "No visible LinkedIn ad activity (verify manually).",
      suggestedCampaignAngles: [
        "Lead-gen guarantee: 'X qualified meetings in 60 days or we work free'",
        "Audit campaign: free 20-minute teardown of their current funnel",
        "Case study angle: 'How {peer} added £Xk MRR in 90 days'",
      ],
    },
    salesOpportunity: {
      needs: `Faster lead flow, tighter follow-up, and stronger conversion from the traffic ${name} already attracts.`,
      painPoints: [
        "Manual lead handling losing 30–50% of warm interest",
        "No automated nurture across email/WhatsApp/SMS",
        "No clear pipeline reporting",
      ],
      whatToSell: offer,
      urgency,
      why: `${name} shows the classic profile of a growth-ready business with marketing gaps that ${offer.toLowerCase()} directly fixes. Their visible weaknesses align with the outcomes you sell.`,
      firstMove: `Send a personalised audit of one page on ${domain} plus a 3-line "what I'd change" loom-style note.`,
    },
    competitors: {
      list: ["Local competitor A", "Regional competitor B", "National player C"],
      doingBetter: [
        "Tighter offer packaging and pricing transparency",
        "Stronger case-study library with quantified outcomes",
        "Multi-channel follow-up automation",
      ],
      pricingGap: "Competitors anchor with 'starts from' pricing; absence here forces every conversation cold.",
      messagingGap: "Competitors lead with outcomes and proof; site leads with services.",
      positioningGap: "Opportunity to own a specific vertical or use-case niche.",
      researchChecklist: [
        "Pull 3 competitor homepages and compare hero messaging",
        "Check Meta Ad Library for active competitor creatives",
        "Audit 3 competitor pricing pages",
        "Review 3 competitor case studies for outcome framing",
      ],
    },
    techStack: {
      website: "Likely WordPress or Webflow (verify via tech-stack scanner).",
      crm: "Unclear — could be HubSpot free, Pipedrive, or spreadsheet-based.",
      tracking: "Google Analytics likely; Meta Pixel not confirmed.",
      automation: "No visible automation platform — strong NexusFlo24 fit.",
      chat: "No live chat or AI assistant detected.",
      analytics: "Likely GA4 only; no funnel-level analytics.",
      payments: "Stripe likely for any transactional flows.",
      emailMarketing: "Possibly Mailchimp or ActiveCampaign at low usage.",
      gaps: [
        "No marketing automation",
        "No WhatsApp/SMS integration",
        "No conversion tracking on key actions",
        "No CRM-to-marketing handoff",
      ],
    },
    decisionMakers: {
      roles: ["CEO / Founder", "Marketing Manager", "Sales Director", "Head of Growth", "Operations Manager"],
      bestFirstContact: "Marketing Manager or Head of Growth — operationally close to the problem and able to champion internally.",
      buyingCommittee: "2–4 people: champion + budget owner + technical sign-off.",
      linkedinPlaceholders: [
        "linkedin.com/in/{verify-marketing-lead}",
        "linkedin.com/in/{verify-founder}",
      ],
    },
    outreach: {
      coldEmail: `Subject: Quick idea for ${name}

Hi {first name},

I had a look at ${domain} and one thing jumped out: your hero is doing the brand job well, but the next-step CTA is buried, so a chunk of warm traffic is likely dropping off before they convert.

I work with ${industry.toLowerCase()} businesses to fix exactly that — usually a 20–35% lift in qualified enquiries within the first 60 days using ${offer.toLowerCase()}.

Worth a 15-minute call this week to walk you through what I'd change?

— {your name}`,
      linkedinConnection: `Hi {first name}, came across ${name} while researching ${industry.toLowerCase()} businesses in ${location}. Liked your positioning — would love to connect.`,
      linkedinFollowUp: `Thanks for connecting, {first name}. Quick reason I reached out: I help ${industry.toLowerCase()} teams like ${name} convert more of the traffic they already have using ${offer.toLowerCase()}. I spotted 2–3 specific things on ${domain} that would likely move the needle — happy to send them over, no pitch. Want me to drop them in here?`,
      whatsapp: `Hi {first name}, this is {your name} — I sent over a quick note about ${name}'s site. I put together a 2-minute teardown of one page on ${domain} with 3 changes that should lift conversion. Want me to send it across?`,
      callOpening: `Hi {first name}, {your name} here — I'll keep this short. I had a look at ${domain} and saw a couple of conversion gaps that are probably costing ${name} qualified enquiries every month. I wanted 90 seconds to share what I noticed and see if it's worth a longer chat. Fair?`,
      discoveryQuestions: [
        `What's the single biggest growth blocker for ${name} right now?`,
        "How are leads currently captured and followed up?",
        "What's working in your marketing — and what isn't?",
        "Who handles follow-up, and how fast does it happen?",
        "If we doubled your qualified pipeline in 90 days, what would that change?",
        "What's the budget window for solving this?",
        "Who else needs to be in the room for a decision?",
      ],
    },
    leadGen: [
      "Add a high-intent lead magnet (audit, calculator, or checklist)",
      "Build a campaign-specific landing page with a single CTA",
      "Launch a paid search campaign on commercial-intent keywords",
      "Run a LinkedIn Ads test with 2 audience segments",
      "Add exit-intent and scroll-triggered capture on top pages",
      "Implement CRM tagging for source attribution",
    ],
    automationOps: [
      "Auto-enrol new leads in a 5-step nurture sequence",
      "Speed-to-lead WhatsApp reply within 60 seconds",
      "Lead scoring with hot-lead alerts to sales",
      "Calendar-booking automation with reminders",
      "AI chatbot to qualify off-hours traffic",
      "Sales notification workflow on key page visits",
      "Weekly automated reporting to leadership",
    ],
    recommendedOffer: {
      name: `${offer} — 90-Day Growth Sprint`,
      positioning: `Position ${offer.toLowerCase()} as a fixed-scope, outcome-led engagement that pays for itself inside the first 90 days.`,
      package: "Discovery + Build (weeks 1–3) → Launch (week 4) → Optimise (weeks 5–12) with weekly check-ins.",
      whyItFits: `${name} has the audience and the offer — the gap is conversion and follow-up. ${offer} closes that gap directly.`,
      firstStepCTA: "Free 20-minute Growth Audit + written 3-page recommendation.",
    },
    followUpSequence: [
      { day: 1, channel: "Email", message: `Personalised audit of ${domain} + 3 specific changes that would lift conversion.` },
      { day: 3, channel: "LinkedIn", message: "Share a relevant case study or insight that mirrors their situation." },
      { day: 7, channel: "Email", message: "Value-led follow-up: a quick benchmark vs 3 peers in their segment." },
      { day: 14, channel: "WhatsApp", message: "Soft check-in: 'Did the audit land? Happy to walk through it on a quick call.'" },
      { day: 21, channel: "Email", message: "Final value-led close: clear call-to-action and easy opt-out language." },
    ],
    dealScore: {
      total,
      fit,
      need,
      urgency: urg,
      accessibility,
      revenuePotential,
      marketingWeakness,
      explanation: `${name} scores ${total}/100 because they show clear fit for ${offer.toLowerCase()} (${fit}), measurable need (${need}), and ${urgency.toLowerCase()} urgency (${urg}). Accessibility (${accessibility}) and revenue potential (${revenuePotential}) are strong, with visible marketing weakness (${marketingWeakness}) making the value proposition easy to communicate.`,
    },
    nextActions: [
      "Save to CRM and tag as 'Good Fit'",
      "Send personalised cold email today",
      "Connect with the Marketing Manager on LinkedIn",
      "Create a 3-day follow-up task",
      "Export report to PDF for internal review",
      "Generate a tailored proposal",
    ],
  };
}

// ===== Future-ready placeholder integrations (typed; throw if called) =====

const notConfigured = (name: string) => {
  throw new Error(`${name} is not yet configured. Connect the integration to enable this feature.`);
};

export async function fetchWebsiteContent(_websiteUrl: string): Promise<string> {
  notConfigured("fetchWebsiteContent");
  return "";
}
export async function analyseWithOpenAI(_companyData: unknown): Promise<unknown> {
  notConfigured("analyseWithOpenAI");
}
export async function fetchGoogleAdsInsights(_companyName: string): Promise<unknown> {
  notConfigured("fetchGoogleAdsInsights");
}
export async function fetchMetaAdsInsights(_companyName: string): Promise<unknown> {
  notConfigured("fetchMetaAdsInsights");
}
export async function fetchLinkedInAdsInsights(_companyName: string): Promise<unknown> {
  notConfigured("fetchLinkedInAdsInsights");
}
export async function detectTechStack(_websiteUrl: string): Promise<unknown> {
  notConfigured("detectTechStack");
}
export async function exportToGoogleSheets(_report: unknown): Promise<void> {
  notConfigured("exportToGoogleSheets");
}
export async function createGoogleDocReport(_report: unknown): Promise<void> {
  notConfigured("createGoogleDocReport");
}
export async function generatePDFReport(_report: unknown): Promise<void> {
  notConfigured("generatePDFReport");
}
export async function sendEmailDraft(_report: unknown): Promise<void> {
  notConfigured("sendEmailDraft");
}
export async function pushToNexusFlo24CRM(_company: unknown, _report: unknown): Promise<void> {
  notConfigured("pushToNexusFlo24CRM");
}
