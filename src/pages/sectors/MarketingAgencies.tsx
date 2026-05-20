import {
  Layers,
  SearchX,
  Workflow,
  Clock,
  BarChart3,
  Users2,
  GitBranch,
  Megaphone,
  PieChart,
  Tags,
  UserCog,
} from "lucide-react";
import SectorPage, { type SectorContent } from "@/components/sectors/SectorPage";
import heroImg from "@/assets/sectors/agencies-hero.jpg";

const content: SectorContent = {
  route: "/marketing-agencies",
  seo: {
    title: "NexusFlo24 for Marketing Agencies — One Platform for Clients",
    description:
      "Centralise CRM, automate client campaigns, and report results in one place. Built for marketing agencies that need to scale without chaos.",
  },
  hero: {
    eyebrow: "For Marketing Agencies",
    headline: "Manage Leads, Automations, and Client Campaigns From One Platform",
    subheadline:
      "NexusFlo24 helps agencies centralise CRM, automate follow-ups, and scale campaigns without juggling scattered tools.",
    image: heroImg,
    imageAlt: "Marketing agency team reviewing campaign analytics together",
  },
  trustStrip: "Built for performance agencies, growth studios, and consultancies",
  painPoints: [
    {
      icon: Layers,
      title: "Stack of disconnected tools",
      description:
        "Different CRM, email, automation, and reporting tools per client — and none of them talk to each other.",
    },
    {
      icon: SearchX,
      title: "Poor lead tracking",
      description:
        "You can't tell which ad, channel, or workflow actually produced the paying customer.",
    },
    {
      icon: Workflow,
      title: "Manual campaign management",
      description:
        "Every launch needs hours of copy-paste, list uploads, and Slack updates across the team.",
    },
    {
      icon: Clock,
      title: "Slow client follow-up",
      description:
        "Leads sit in spreadsheets for hours before anyone reaches out — and conversion drops.",
    },
    {
      icon: BarChart3,
      title: "Reporting is a nightmare",
      description:
        "Compiling weekly client reports means exporting CSVs from five dashboards and praying numbers match.",
    },
  ],
  solutions: [
    { pain: "5 tools per client and no single source of truth", solution: "One workspace per client with shared CRM, automations, and analytics" },
    { pain: "Manually moving leads between sales reps", solution: "Auto-assignment and round-robin routing on capture" },
    { pain: "Rebuilding the same nurture flow for every client", solution: "Reusable automation templates clone across workspaces in seconds" },
    { pain: "Patching together weekly client reports", solution: "Live analytics dashboard with exportable, white-label-ready views" },
  ],
  features: [
    { icon: Users2, title: "Multi-client CRM workflows", description: "Separate workspaces per client with role-based access and clean data isolation." },
    { icon: GitBranch, title: "Visual automation builder", description: "Triggers, conditions, delays, and multi-channel actions — drag, drop, ship." },
    { icon: Megaphone, title: "Campaign management", description: "Email, WhatsApp, and SMS campaigns with scheduling, throttling, and A/B variants." },
    { icon: PieChart, title: "Analytics dashboard", description: "Funnel, channel, and campaign performance in one live view per client." },
    { icon: Tags, title: "Lead segmentation", description: "Smart lists by tag, behaviour, source, or score — used everywhere automatically." },
    { icon: UserCog, title: "Team collaboration", description: "Assign leads, leave notes, and track activity across reps and account managers." },
  ],
  workflow: {
    title: "From paid ad click to closed client deal",
    steps: [
      { title: "Lead captured from ad", description: "UTM-tracked landing page or form pushes the lead straight into the client's CRM." },
      { title: "Automated nurture workflow", description: "Multi-channel sequence fires email, WhatsApp, and SMS in the right order." },
      { title: "Tagged by behaviour", description: "Opens, clicks, and visits update scores and apply segmentation tags." },
      { title: "Assigned to sales rep", description: "Hot leads auto-route to the right rep with full conversation context." },
      { title: "Converted into client", description: "Pipeline updates, analytics refresh, and the client sees ROI in real time." },
    ],
  },
  testimonials: [
    { quote: "We replaced four tools per client account. Onboarding new clients is twice as fast now.", name: "Marcus T.", role: "Founder, Performance Agency" },
    { quote: "The white-label analytics let us send branded reports without exporting a single CSV.", name: "Elena V.", role: "Head of Operations" },
    { quote: "Automation templates mean we ship a new client funnel in a day, not a week.", name: "Jordan P.", role: "Growth Strategist" },
  ],
  midCta: {
    headline: "Scale Your Agency With Automation",
    sub: "Centralise your stack, ship campaigns faster, and prove ROI without the spreadsheet circus.",
    primary: "Start Free Trial",
  },
  faqs: [
    { q: "Can I manage multiple clients in one account?", a: "Yes. Each client gets a separate workspace with isolated data, branding, and team access — managed from a single login." },
    { q: "Do I need technical skills?", a: "No. The automation builder is fully visual and ships with agency-ready templates you can clone across clients." },
    { q: "Can I white-label dashboards and reports?", a: "Yes. Custom branding and white-label options are available on agency plans for client-facing views and reports." },
    { q: "How does team collaboration work?", a: "Invite team members, assign leads, leave internal notes, and track activity. Roles control what each person can see and do." },
    { q: "How quickly can I migrate clients in?", a: "Most agencies import leads, set up their first automations, and run a live campaign within their first week." },
  ],
  finalCta: {
    headline: "Ready to automate your sales and follow-up?",
    sub: "Run every client campaign from one premium platform — and finally scale without burning out your team.",
    primary: "Start Free Trial",
  },
};

export default function MarketingAgencies() {
  return <SectorPage content={content} />;
}
