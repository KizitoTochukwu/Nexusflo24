import {
  MessageSquareOff,
  Hourglass,
  VideoOff,
  Inbox,
  Compass,
  LayoutTemplate,
  Repeat,
  MessageCircle,
  Users,
  CalendarCheck,
  Sparkles,
} from "lucide-react";
import SectorPage, { type SectorContent } from "@/components/sectors/SectorPage";
import heroAsset from "@/assets/sectors/coaches-hero.png.asset.json";

const content: SectorContent = {
  route: "/coaches-creators",
  seo: {
    title: "NexusFlo24 for Coaches & Creators — Automate Your Sales",
    description:
      "Capture leads, nurture your audience, and book more clients on autopilot. Built for coaches, course creators, and personal brands.",
  },
  hero: {
    eyebrow: "For Coaches & Creators",
    headline: "Automate Your Coaching or Creator Business Without Chasing Leads Manually",
    subheadline:
      "Capture leads, nurture your audience automatically, and convert followers into paying clients using one powerful platform.",
    image: heroAsset.url,
    imageAlt: "Online coach working from a bright studio desk",
  },
  trustStrip: "Built for coaches, course creators, and personal brands",
  painPoints: [
    {
      icon: MessageSquareOff,
      title: "Leads go cold fast",
      description:
        "People sign up for your freebie or webinar — then disappear because no one followed up in time.",
    },
    {
      icon: Hourglass,
      title: "Manual follow-up eats your day",
      description:
        "You spend hours sending the same emails and DMs instead of coaching or creating content.",
    },
    {
      icon: VideoOff,
      title: "Webinar attendees don't convert",
      description:
        "You deliver a great session, but very few register, show up, or book a call afterward.",
    },
    {
      icon: Inbox,
      title: "DMs and inquiries get lost",
      description:
        "Instagram, WhatsApp, email — leads message you everywhere and threads slip through.",
    },
    {
      icon: Compass,
      title: "No structured sales process",
      description:
        "You're guessing what to send next instead of running a proven path from follower to client.",
    },
  ],
  solutions: [
    { pain: "Manually emailing every webinar lead", solution: "Automated email + WhatsApp sequences fire the moment someone opts in" },
    { pain: "Forgetting to follow up with hot prospects", solution: "Smart CRM scores leads and surfaces the ones ready to buy" },
    { pain: "Booking calls back-and-forth over DMs", solution: "Branded booking pages with automated reminders and CRM sync" },
    { pain: "Losing track of where each lead is in your funnel", solution: "Visual sales pipeline shows every prospect's stage at a glance" },
  ],
  features: [
    { icon: LayoutTemplate, title: "Funnel & landing-page builder", description: "Drag-and-drop pages, opt-ins, and thank-you flows that convert — no designer needed." },
    { icon: Repeat, title: "Webinar follow-up automation", description: "Trigger reminders, replay links, and offer sequences automatically after every session." },
    { icon: MessageCircle, title: "Email + WhatsApp nurturing", description: "Mix channels in a single sequence so messages reach your audience where they actually read." },
    { icon: Users, title: "CRM for leads & clients", description: "One contact view with tags, notes, scores, and full conversation history." },
    { icon: CalendarCheck, title: "Booking automation", description: "Public calendar pages, auto reminders, and pipeline updates the moment a call is booked." },
    { icon: Sparkles, title: "AI copy assistant", description: "Generate launch emails, WhatsApp scripts, captions, and ad copy in your voice in seconds." },
  ],
  workflow: {
    title: "From webinar opt-in to paying coaching client",
    steps: [
      { title: "Lead opts into webinar", description: "Branded landing page captures the lead into your CRM." },
      { title: "Email + WhatsApp follow-up", description: "Automated reminders, replay link, and value-first messages." },
      { title: "Books a strategy call", description: "One-click booking from the message, calendar synced automatically." },
      { title: "Enters sales pipeline", description: "Tagged, scored, and assigned a status — ready for your call." },
      { title: "Converts into client", description: "Onboarding sequence kicks in the moment the deal is marked won." },
    ],
  },
  testimonials: [
    { quote: "I went from chasing leads in my DMs to a fully automated funnel. My webinar-to-client rate doubled.", name: "Sarah M.", role: "Mindset Coach" },
    { quote: "The WhatsApp follow-ups alone have paid for the platform 10x over. Leads actually reply.", name: "Daniel R.", role: "Course Creator" },
    { quote: "I finally have a real sales process instead of post-it notes everywhere. Game changer.", name: "Aisha K.", role: "Business Coach" },
  ],
  midCta: {
    headline: "Start Automating Your Coaching Sales",
    sub: "Plug in your funnel today and let NexusFlo24 follow up while you coach.",
    primary: "Start Free Trial",
  },
  faqs: [
    { q: "Do I need technical skills to set this up?", a: "No. Everything is drag-and-drop with ready-made templates for coaches and creators. Most people are live within a day." },
    { q: "Can I automate WhatsApp follow-ups?", a: "Yes. NexusFlo24 connects to WhatsApp so you can send personalised reminders, replay links, and offers automatically." },
    { q: "Will it work with my existing webinar tool?", a: "Yes. You can capture leads via forms, your favourite webinar tool, or our built-in landing pages — all flow into the same CRM." },
    { q: "How quickly can I get started?", a: "Sign up, choose a template, connect your email and WhatsApp, and you can be running your first automation the same day." },
    { q: "Can I track which leads are ready to buy?", a: "Yes. Lead scoring and a visual pipeline surface the prospects most likely to convert so you can focus your energy." },
  ],
  finalCta: {
    headline: "Ready to automate your sales and follow-up?",
    sub: "Capture more leads, nurture them on autopilot, and convert followers into paying clients.",
    primary: "Start Free Trial",
  },
};

export default function CoachesCreators() {
  return <SectorPage content={content} />;
}
