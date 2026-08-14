export type AdProvider = "meta" | "google" | "linkedin";

export type ProviderMeta = {
  id: AdProvider;
  label: string;
  shortLabel: string;
  blurb: string;
  subChannels: string[];
  /** Permissions requested during authorisation, in plain language. */
  permissions: string[];
  /** Where a campaign lives on the platform. */
  manageLabel: string;
  color: string;
};

export const AD_PROVIDERS: Record<AdProvider, ProviderMeta> = {
  meta: {
    id: "meta",
    label: "Meta Ads",
    shortLabel: "Meta",
    blurb: "Facebook and Instagram campaigns, lead forms and audiences.",
    subChannels: ["Facebook", "Instagram"],
    permissions: [
      "Read your ad accounts, campaigns and performance metrics",
      "Read lead form submissions so leads reach your CRM instantly",
      "Read the Pages and Instagram accounts linked to your business",
    ],
    manageLabel: "View on Meta Ads Manager",
    color: "hsl(213 70% 14%)",
  },
  google: {
    id: "google",
    label: "Google Ads",
    shortLabel: "Google",
    blurb: "Search, Display, Performance Max and YouTube campaigns.",
    subChannels: ["Search", "Display", "Performance Max", "YouTube"],
    permissions: [
      "Read your Google Ads accounts, campaigns and performance metrics",
      "Read lead form extension submissions",
      "Read conversion actions so revenue can be attributed",
    ],
    manageLabel: "View on Google Ads",
    color: "hsl(46 67% 52%)",
  },
  linkedin: {
    id: "linkedin",
    label: "LinkedIn Ads",
    shortLabel: "LinkedIn",
    blurb: "Sponsored content and Lead Gen Forms for B2B pipelines.",
    subChannels: ["Sponsored Content", "Lead Gen Forms", "Message Ads"],
    permissions: [
      "Read your LinkedIn ad accounts, campaigns and performance metrics",
      "Read Lead Gen Form responses",
      "Read the organisations you advertise on behalf of",
    ],
    manageLabel: "View on LinkedIn Campaign Manager",
    color: "hsl(213 50% 25%)",
  },
};

export const AD_PROVIDER_LIST = Object.values(AD_PROVIDERS);

export const CHANNEL_COLORS: Record<AdProvider, string> = {
  meta: "hsl(213 70% 14%)",
  google: "hsl(46 67% 52%)",
  linkedin: "hsl(213 50% 35%)",
};

export const CAMPAIGN_STATUSES = ["active", "paused", "draft", "ended"] as const;
export type AdCampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

/** Plain-language explanation shown in a tooltip beside each metric. */
export const METRIC_TOOLTIPS: Record<string, string> = {
  spend: "Total amount spent across the selected channels and period.",
  impressions: "How many times your ads were shown.",
  clicks: "How many times someone clicked one of your ads.",
  ctr: "Click-through rate — clicks divided by impressions.",
  leads: "People who submitted their details after seeing or clicking an ad.",
  cpl: "Cost per lead — spend divided by the number of leads.",
  qualifiedLeads: "Leads that met your qualification rules in the CRM.",
  cpql: "Cost per qualified lead — spend divided by qualified leads.",
  appointments: "Booked appointments traced back to an ad.",
  revenue: "Revenue from won deals attributed to advertising.",
  roas: "Return on ad spend — attributed revenue divided by spend.",
};

export const ATTRIBUTION_MODELS = [
  { value: "last_touch", label: "Last touch", hint: "All credit to the most recent ad interaction." },
  { value: "first_touch", label: "First touch", hint: "All credit to the very first ad interaction." },
  { value: "linear", label: "Linear", hint: "Credit spread evenly across every recorded touch." },
  { value: "creation_source", label: "Lead creation source", hint: "Credit to the source recorded when the lead was created." },
] as const;

export type AttributionModel = (typeof ATTRIBUTION_MODELS)[number]["value"];
