import {
  PhoneOff,
  Bell,
  TrendingDown,
  Keyboard,
  UserMinus,
  FileText,
  MessageCircle,
  CalendarClock,
  Send,
  LineChart,
  Zap,
} from "lucide-react";
import SectorPage, { type SectorContent } from "@/components/sectors/SectorPage";
import heroImg from "@/assets/sectors/smb-hero.jpg";

const content: SectorContent = {
  route: "/small-business",
  seo: {
    title: "NexusFlo24 for Small Businesses — Capture & Convert More Leads",
    description:
      "Capture every inquiry, follow up automatically on WhatsApp and SMS, and turn more visitors into paying customers. Built for local and small businesses.",
  },
  hero: {
    eyebrow: "For SMEs & Local Businesses",
    headline: "Stop Losing Leads and Automate Customer Follow-Up",
    subheadline:
      "NexusFlo24 helps small businesses capture more leads, follow up automatically, and convert customers faster — without hiring a bigger team.",
    image: heroImg,
    imageAlt: "Local business owner managing customer messages on a phone and laptop",
  },
  trustStrip: "Built for clinics, salons, gyms, contractors, and local service businesses",
  painPoints: [
    {
      icon: PhoneOff,
      title: "Missed customer inquiries",
      description:
        "Calls, web forms, and DMs come in while you're serving customers — and most never get a reply.",
    },
    {
      icon: Bell,
      title: "No follow-up system",
      description:
        "If they don't book the first time, you have no way to bring them back later.",
    },
    {
      icon: TrendingDown,
      title: "Low conversion rates",
      description:
        "Visitors trickle in, but only a fraction ever become paying customers.",
    },
    {
      icon: Keyboard,
      title: "Manual messages all day",
      description:
        "You retype the same WhatsApp replies, quotes, and reminders dozens of times a week.",
    },
    {
      icon: UserMinus,
      title: "Not enough staff or time",
      description:
        "Small team, big to-do list — there's no one free to chase leads or send reminders.",
    },
  ],
  solutions: [
    { pain: "Inquiries from web, DMs and calls scattered everywhere", solution: "Every lead lands in one inbox and one customer record" },
    { pain: "Forgetting to follow up after a quote", solution: "Automated WhatsApp and email sequences chase the lead for you" },
    { pain: "No-shows and missed appointments", solution: "Automatic reminders sent before each booking cut no-shows dramatically" },
    { pain: "Typing the same reply 20 times a day", solution: "Saved templates and AI replies handle the repeat questions instantly" },
  ],
  features: [
    { icon: FileText, title: "Lead capture forms", description: "Embed mobile-friendly forms on your site, link-in-bio, or QR menu in minutes." },
    { icon: MessageCircle, title: "WhatsApp follow-up", description: "Instant WhatsApp replies and reminder sequences that customers actually read." },
    { icon: CalendarClock, title: "Online appointment booking", description: "Customers self-book a slot 24/7 and reminders fire automatically." },
    { icon: Send, title: "Email & SMS automation", description: "Welcome flows, promotions, and re-engagement campaigns — set once, run forever." },
    { icon: LineChart, title: "Customer tracking dashboard", description: "See every lead, booking, and conversion in one simple dashboard." },
    { icon: Zap, title: "Instant AI replies", description: "AI assistant answers common questions on WhatsApp and email so leads never wait." },
  ],
  workflow: {
    title: "From first inquiry to repeat customer",
    steps: [
      { title: "Customer submits inquiry", description: "Web form, DM, or QR code drops the lead into your inbox instantly." },
      { title: "Instant WhatsApp follow-up", description: "Personalised reply fires within seconds — no manual typing." },
      { title: "Appointment booked", description: "Customer picks a slot from your live calendar and you're notified." },
      { title: "Automated reminders sent", description: "Day-before and morning-of reminders cut no-shows automatically." },
      { title: "Customer converted", description: "Post-visit thank-you, review request, and re-engagement keep them coming back." },
    ],
  },
  testimonials: [
    { quote: "We stopped losing customers to slow replies. WhatsApp follow-ups go out before I even pick up the phone.", name: "Tom B.", role: "Salon Owner" },
    { quote: "Bookings doubled in three months and no-shows almost disappeared thanks to automatic reminders.", name: "Priya S.", role: "Wellness Clinic" },
    { quote: "It's like having an extra team member working 24/7 — without the salary.", name: "Marco D.", role: "Local Contractor" },
  ],
  midCta: {
    headline: "Start Growing Your Business Smarter",
    sub: "Capture every lead, follow up automatically, and convert more customers — even when you're busy serving the ones in front of you.",
    primary: "Start Free Trial",
  },
  faqs: [
    { q: "Do I need technical skills?", a: "Not at all. NexusFlo24 is designed for busy business owners — most are up and running in under an hour with ready-made templates." },
    { q: "Can I automate WhatsApp messages?", a: "Yes. You can send instant replies, appointment reminders, follow-ups, and promotions over WhatsApp directly from the platform." },
    { q: "Can I track all my leads in one place?", a: "Yes. Every inquiry from your website, WhatsApp, forms, and ads lands in one simple customer dashboard." },
    { q: "How quickly can I get started?", a: "Sign up, pick a template, and you can have lead capture, WhatsApp follow-up, and online booking live the same day." },
    { q: "Will it integrate with my existing booking or POS tools?", a: "NexusFlo24 connects with popular tools via integrations and webhooks, so leads and bookings flow into your existing workflow." },
  ],
  finalCta: {
    headline: "Ready to automate your sales and follow-up?",
    sub: "Stop losing customers to slow replies and missed messages. Let NexusFlo24 handle the follow-up while you run your business.",
    primary: "Start Free Trial",
  },
};

export default function SmallBusiness() {
  return <SectorPage content={content} />;
}
