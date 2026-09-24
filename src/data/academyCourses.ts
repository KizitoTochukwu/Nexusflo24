export type Lesson = { title: string; duration: string; videoUrl?: string };
export type Module = { title: string; lessons: Lesson[] };

export type Course = {
  slug: string;
  title: string;
  category: string;
  duration: string;
  lessons: number;
  rating: number;
  students: number;
  premium: boolean;
  image: string;
  tagline: string;
  description: string;
  outcomes: string[];
  audience: string[];
  instructor: { name: string; title: string };
  modules: Module[];
};

export const courses: Course[] = [
  {
    slug: "ai-marketing-fundamentals",
    title: "AI Marketing Fundamentals",
    category: "AI Marketing",
    duration: "2h 30m",
    lessons: 12,
    rating: 4.9,
    students: 1240,
    premium: false,
    image: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=1200&h=675&fit=crop",
    tagline: "Use AI to plan, write, and ship campaigns 10x faster.",
    description:
      "A practical introduction to using AI for modern marketing. Learn how to brief AI tools, generate on-brand copy, design campaign assets, and build repeatable workflows that compound results.",
    outcomes: [
      "Understand the AI marketing stack end-to-end",
      "Write high-converting copy with AI assistants",
      "Build a repeatable AI content workflow",
      "Measure what actually moves the needle",
    ],
    audience: ["Solo creators", "Small business owners", "Marketing generalists"],
    instructor: { name: "Daniel A.", title: "Head of Growth, NexusFlo24" },
    modules: [
      {
        title: "Foundations",
        lessons: [
          { title: "What AI marketing really is", duration: "10m" },
          { title: "The modern AI stack for marketers", duration: "12m" },
          { title: "Briefing AI like a senior strategist", duration: "14m" },
        ],
      },
      {
        title: "Copy & Creative",
        lessons: [
          { title: "Headlines that convert", duration: "12m" },
          { title: "Ad creative variations at scale", duration: "15m" },
          { title: "On-brand voice with prompt templates", duration: "13m" },
        ],
      },
      {
        title: "Workflows & Measurement",
        lessons: [
          { title: "Designing repeatable AI workflows", duration: "16m" },
          { title: "Lead scoring with AI signals", duration: "14m" },
          { title: "KPIs and dashboards that matter", duration: "12m" },
          { title: "Common pitfalls to avoid", duration: "10m" },
          { title: "Putting it all together", duration: "12m" },
          { title: "Next steps & resources", duration: "10m" },
        ],
      },
    ],
  },
  {
    slug: "high-converting-funnels",
    title: "Building High-Converting Funnels",
    category: "Funnels",
    duration: "3h 15m",
    lessons: 18,
    rating: 4.8,
    students: 890,
    premium: true,
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=675&fit=crop",
    tagline: "Design funnels that turn cold traffic into paying customers.",
    description:
      "A deep dive into funnel architecture, offer design, and page-level conversion. You'll build a full funnel — from ad to thank-you page — using the NexusFlo24 funnel builder.",
    outcomes: [
      "Map a funnel from awareness to purchase",
      "Write irresistible offers and CTAs",
      "Design landing pages that convert",
      "A/B test the right things in the right order",
    ],
    audience: ["Founders", "Performance marketers", "Agency owners"],
    instructor: { name: "Sarah M.", title: "Conversion Specialist" },
    modules: [
      {
        title: "Funnel Strategy",
        lessons: [
          { title: "The 5 funnel archetypes", duration: "14m" },
          { title: "Choosing the right offer", duration: "12m" },
          { title: "Mapping the customer journey", duration: "13m" },
        ],
      },
      {
        title: "Pages That Convert",
        lessons: [
          { title: "Landing page anatomy", duration: "15m" },
          { title: "Writing magnetic headlines", duration: "12m" },
          { title: "Hero sections that hook", duration: "11m" },
          { title: "Social proof placement", duration: "10m" },
          { title: "Checkout & thank-you pages", duration: "13m" },
        ],
      },
      {
        title: "Testing & Optimization",
        lessons: [
          { title: "What to A/B test first", duration: "12m" },
          { title: "Reading test results correctly", duration: "11m" },
          { title: "Scaling winning variants", duration: "13m" },
        ],
      },
    ],
  },
  {
    slug: "crm-automation-masterclass",
    title: "CRM Automation Masterclass",
    category: "CRM Automation",
    duration: "4h",
    lessons: 24,
    rating: 4.7,
    students: 670,
    premium: true,
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=675&fit=crop",
    tagline: "Turn your CRM into an always-on growth engine.",
    description:
      "Master segmentation, lifecycle automations, and pipeline hygiene. Build automations that nurture leads, recover drop-offs, and trigger sales touch points at the right moment.",
    outcomes: [
      "Design a clean, scalable CRM structure",
      "Automate lifecycle stages end-to-end",
      "Recover lost leads with smart sequences",
      "Build dashboards your sales team will use",
    ],
    audience: ["Ops leads", "Sales managers", "Growth teams"],
    instructor: { name: "James K.", title: "CRM & Automation Lead" },
    modules: [
      {
        title: "CRM Foundations",
        lessons: [
          { title: "Data model & hygiene", duration: "12m" },
          { title: "Segmentation that scales", duration: "14m" },
          { title: "Tagging strategy", duration: "10m" },
        ],
      },
      {
        title: "Lifecycle Automations",
        lessons: [
          { title: "Welcome sequences", duration: "13m" },
          { title: "Nurture by intent", duration: "15m" },
          { title: "Re-engagement flows", duration: "12m" },
          { title: "Win-back campaigns", duration: "11m" },
        ],
      },
      {
        title: "Sales Enablement",
        lessons: [
          { title: "Lead routing rules", duration: "10m" },
          { title: "Task automation for reps", duration: "12m" },
          { title: "Pipeline reporting", duration: "13m" },
        ],
      },
    ],
  },
  {
    slug: "whatsapp-marketing-101",
    title: "WhatsApp Marketing 101",
    category: "WhatsApp Automation",
    duration: "1h 45m",
    lessons: 8,
    rating: 4.9,
    students: 2100,
    premium: false,
    image: "https://images.unsplash.com/photo-1611746872915-64382b5c76da?w=1200&h=675&fit=crop",
    tagline: "Open rates over 90%. Here's how to use them right.",
    description:
      "Learn how to set up WhatsApp Cloud API, design compliant template messages, and build conversational flows that convert without burning out your audience.",
    outcomes: [
      "Set up WhatsApp Cloud API correctly",
      "Design compliant template messages",
      "Build conversational follow-ups",
      "Stay inside the 24h window the smart way",
    ],
    audience: ["E-commerce", "Coaches", "Local businesses"],
    instructor: { name: "Amina O.", title: "Messaging Strategist" },
    modules: [
      {
        title: "Getting Started",
        lessons: [
          { title: "WhatsApp Cloud API basics", duration: "12m" },
          { title: "Templates, opt-ins & compliance", duration: "14m" },
        ],
      },
      {
        title: "Conversations That Convert",
        lessons: [
          { title: "Conversational flow design", duration: "13m" },
          { title: "Handling the 24h window", duration: "12m" },
          { title: "Broadcast vs triggered", duration: "11m" },
          { title: "Human handoff to sales", duration: "10m" },
          { title: "Measuring WhatsApp ROI", duration: "12m" },
          { title: "Templates library walkthrough", duration: "11m" },
        ],
      },
    ],
  },
  {
    slug: "facebook-google-ads-strategy",
    title: "Facebook & Google Ads Strategy",
    category: "Ads & Analytics",
    duration: "3h 45m",
    lessons: 20,
    rating: 4.6,
    students: 560,
    premium: true,
    image: "https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=1200&h=675&fit=crop",
    tagline: "Stop boosting posts. Start running profitable campaigns.",
    description:
      "A strategist's guide to paid acquisition on Meta and Google. Build account structures that scale, write ads that convert, and read your data without lying to yourself.",
    outcomes: [
      "Build scalable account structures",
      "Write ad creatives that beat benchmarks",
      "Track conversions accurately",
      "Scale winners and kill losers fast",
    ],
    audience: ["Performance marketers", "Founders", "Agencies"],
    instructor: { name: "Marcus T.", title: "Paid Media Lead" },
    modules: [
      {
        title: "Account Architecture",
        lessons: [
          { title: "Meta campaign structure", duration: "13m" },
          { title: "Google Ads structure", duration: "12m" },
          { title: "Budgets & bidding strategies", duration: "14m" },
        ],
      },
      {
        title: "Creative & Copy",
        lessons: [
          { title: "Hook-led ad creative", duration: "12m" },
          { title: "Static vs video ads", duration: "11m" },
          { title: "Ad copy frameworks", duration: "13m" },
          { title: "Iteration cadence", duration: "10m" },
        ],
      },
      {
        title: "Measurement & Scaling",
        lessons: [
          { title: "Conversion tracking setup", duration: "14m" },
          { title: "Attribution honestly", duration: "12m" },
          { title: "Scaling winners safely", duration: "13m" },
        ],
      },
    ],
  },
  {
    slug: "email-drip-campaigns",
    title: "Email Drip Campaigns That Convert",
    category: "Email Automation",
    duration: "2h",
    lessons: 10,
    rating: 4.8,
    students: 980,
    premium: false,
    image: "https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=1200&h=675&fit=crop",
    tagline: "Build drip sequences that earn replies, not unsubscribes.",
    description:
      "Learn the email drip frameworks top operators use to nurture leads, sell offers, and re-engage cold lists — without sounding like a robot.",
    outcomes: [
      "Design drip sequences by intent",
      "Write emails people actually reply to",
      "Improve deliverability and open rates",
      "Automate re-engagement of cold leads",
    ],
    audience: ["Marketers", "Coaches", "SaaS founders"],
    instructor: { name: "Lina R.", title: "Lifecycle Email Lead" },
    modules: [
      {
        title: "Drip Strategy",
        lessons: [
          { title: "Drip vs broadcast", duration: "10m" },
          { title: "Mapping sequences to intent", duration: "13m" },
        ],
      },
      {
        title: "Writing & Sending",
        lessons: [
          { title: "Subject lines that get opened", duration: "12m" },
          { title: "Plain-text style emails", duration: "11m" },
          { title: "CTAs that earn clicks", duration: "10m" },
          { title: "Deliverability essentials", duration: "13m" },
          { title: "Send-time optimization", duration: "9m" },
        ],
      },
      {
        title: "Lifecycle Automations",
        lessons: [
          { title: "Welcome series", duration: "12m" },
          { title: "Cart & form abandonment", duration: "11m" },
          { title: "Win-back sequences", duration: "12m" },
        ],
      },
    ],
  },
];

// Keep lesson counts honest: always derived from the syllabus.
courses.forEach((c) => {
  c.lessons = c.modules.reduce((a, m) => a + m.lessons.length, 0);
});

export const getCourseBySlug = (slug?: string) =>
  courses.find((c) => c.slug === slug);

/** Stable key for a lesson, used for progress tracking. */
export const lessonKey = (moduleIndex: number, lessonIndex: number) => `m${moduleIndex}-l${lessonIndex}`;

/** Plans that unlock Premium Academy courses. */
export const PREMIUM_ACADEMY_TIERS = ["plus", "pro", "enterprise"] as const;
export const PREMIUM_ACADEMY_LABEL = "Plus plan and above";

export const academyStats = () => {
  const categories = Array.from(new Set(courses.map((c) => c.category)));
  const totalLessons = courses.reduce((a, c) => a + c.lessons, 0);
  return { categories, totalLessons, totalCourses: courses.length };
};

export const ACADEMY_PENDING_COURSE_KEY = "nexusflo_academy_course";
