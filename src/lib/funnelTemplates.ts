import type { Block } from "@/components/funnels/builder/blockTypes";

export interface FunnelTemplate {
  id: string;
  name: string;
  description: string;
  objective: string;
  steps: {
    step_type: string;
    page_content: { blocks: Block[] };
  }[];
}

const heroSection = (headline: string, subtext: string, btnText: string, btnLink = "#"): Block[] => [
  {
    id: "hero-section",
    type: "section",
    props: { backgroundColor: "#0B1F3B", padding: "60px 20px", maxWidth: "960px" },
    children: [
      { id: "hero-h", type: "heading", props: { text: headline, level: "h1", align: "center", color: "#ffffff" } },
      { id: "hero-p", type: "text", props: { text: subtext, align: "center", color: "#cbd5e1" } },
      { id: "hero-btn", type: "button", props: { text: btnText, link: btnLink, backgroundColor: "#D4AF37", textColor: "#ffffff", align: "center", size: "lg", borderRadius: "8px" } },
    ],
  },
];

const benefitsSection = (items: string[]): Block => ({
  id: "benefits",
  type: "section",
  props: { backgroundColor: "#f8fafc", padding: "48px 20px", maxWidth: "960px" },
  children: [
    { id: "ben-h", type: "heading", props: { text: "Why Choose Us", level: "h2", align: "center", color: "#0B1F3B" } },
    ...items.map((t, i) => ({
      id: `ben-${i}`,
      type: "text" as const,
      props: { text: `✓ ${t}`, align: "center", color: "#334155" },
    })),
  ],
});

const testimonialsBlock: Block = {
  id: "social-proof",
  type: "testimonials",
  props: {
    items: [
      { name: "Sarah J.", text: "This changed everything for my business!", avatar: "", role: "Founder" },
      { name: "Mark T.", text: "Incredible results in just 30 days.", avatar: "", role: "CEO" },
      { name: "Lisa R.", text: "Best investment I've made this year.", avatar: "", role: "Marketing Director" },
    ],
  },
};

const formBlock = (fields: string[] = ["email"], redirectNext = true): Block => ({
  id: "capture-form",
  type: "form",
  props: { fields, buttonText: "Get Instant Access", buttonColor: "#D4AF37", redirectNext },
});

const ctaSection = (text: string, btnText: string, link = "#"): Block => ({
  id: "cta-section",
  type: "section",
  props: { backgroundColor: "#0B1F3B", padding: "48px 20px", maxWidth: "960px" },
  children: [
    { id: "cta-h", type: "heading", props: { text, level: "h2", align: "center", color: "#ffffff" } },
    { id: "cta-btn", type: "button", props: { text: btnText, link, backgroundColor: "#D4AF37", textColor: "#ffffff", align: "center", size: "lg", borderRadius: "8px" } },
  ],
});

export const FUNNEL_TEMPLATES: FunnelTemplate[] = [
  {
    id: "lead-magnet",
    name: "Lead Magnet Funnel",
    description: "Capture leads with a free download offer and deliver it on the thank-you page.",
    objective: "lead_capture",
    steps: [
      {
        step_type: "landing",
        page_content: {
          blocks: [
            ...heroSection("Get Your Free Guide", "Download our exclusive guide and start growing your business today.", "Download Now"),
            benefitsSection(["Proven strategies that work", "Step-by-step instructions", "Real-world case studies", "Bonus templates included"]),
            testimonialsBlock,
            { id: "sp1", type: "spacer", props: { height: "24px" } },
            formBlock(["firstName", "email"]),
            ctaSection("Don't Miss Out — It's 100% Free", "Claim Your Copy"),
          ],
        },
      },
      {
        step_type: "thankyou",
        page_content: {
          blocks: [
            ...heroSection("Thank You! 🎉", "Your guide is ready. Click below to download it now.", "Download Your Guide", "#"),
            { id: "ty-text", type: "text", props: { text: "Check your inbox for a copy as well. We'll also send you exclusive tips over the coming days.", align: "center", color: "#334155" } },
          ],
        },
      },
    ],
  },
  {
    id: "webinar-registration",
    name: "Webinar Registration Funnel",
    description: "Drive registrations for your live or evergreen webinar.",
    objective: "webinar",
    steps: [
      {
        step_type: "landing",
        page_content: {
          blocks: [
            ...heroSection("Free Live Webinar", "Learn the exact system we use to generate 10x leads — in just 60 minutes.", "Reserve Your Spot"),
            benefitsSection(["Live Q&A with experts", "Actionable takeaways", "Exclusive bonuses for attendees", "Replay access included"]),
            testimonialsBlock,
            formBlock(["firstName", "email"]),
            ctaSection("Seats Are Limited — Register Now", "Save My Seat"),
          ],
        },
      },
      {
        step_type: "thankyou",
        page_content: {
          blocks: [
            ...heroSection("You're Registered! 🎉", "Mark your calendar — we'll send you the details shortly.", "Add to Calendar"),
            { id: "conf-text", type: "text", props: { text: "Check your email for the webinar link and joining instructions. See you there!", align: "center", color: "#334155" } },
          ],
        },
      },
    ],
  },
  {
    id: "product-sales",
    name: "Product Sales Funnel",
    description: "A complete sales funnel with product page, checkout, and thank-you confirmation.",
    objective: "product_sale",
    steps: [
      {
        step_type: "sales",
        page_content: {
          blocks: [
            ...heroSection("Transform Your Results Today", "Our flagship product gives you everything you need to succeed.", "Buy Now — $49"),
            benefitsSection(["Lifetime access", "30-day money-back guarantee", "Priority support", "Free future updates"]),
            {
              id: "price-block",
              type: "pricing",
              props: {
                title: "Pro Plan",
                price: "$49",
                features: ["Full course access", "Private community", "Monthly coaching calls", "Bonus resources"],
                buttonText: "Get Started",
                buttonColor: "#D4AF37",
                highlighted: true,
              },
            },
            testimonialsBlock,
            ctaSection("Ready to Transform Your Business?", "Get Instant Access — $49"),
          ],
        },
      },
      {
        step_type: "checkout",
        page_content: {
          blocks: [
            ...heroSection("Complete Your Purchase", "You're just one step away from transforming your results.", ""),
            { id: "checkout-embed", type: "embed", props: { src: "", height: "500px" } },
            { id: "checkout-note", type: "text", props: { text: "🔒 Secure checkout powered by Stripe. 30-day money-back guarantee.", align: "center", color: "#64748b" } },
          ],
        },
      },
      {
        step_type: "thankyou",
        page_content: {
          blocks: [
            ...heroSection("Welcome Aboard! 🎉", "Your purchase is confirmed. Check your email for access details.", "Access Your Product"),
            { id: "ty-next", type: "text", props: { text: "Need help? Reply to your confirmation email and we'll be happy to assist.", align: "center", color: "#334155" } },
          ],
        },
      },
    ],
  },
  {
    id: "consultation-booking",
    name: "Consultation Booking Funnel",
    description: "Book discovery calls with an embedded calendar widget.",
    objective: "booking",
    steps: [
      {
        step_type: "landing",
        page_content: {
          blocks: [
            ...heroSection("Book a Free Strategy Call", "Let's map out a custom growth plan for your business — no strings attached.", "Book Your Call"),
            benefitsSection(["30-minute 1-on-1 session", "Custom growth roadmap", "No obligation", "Actionable next steps"]),
            testimonialsBlock,
            { id: "booking-embed", type: "embed", props: { src: "", height: "600px" } },
            ctaSection("Limited Spots Available This Week", "Schedule Now"),
          ],
        },
      },
      {
        step_type: "thankyou",
        page_content: {
          blocks: [
            ...heroSection("You're Booked! 📅", "We look forward to speaking with you. Check your email for confirmation.", ""),
            { id: "book-note", type: "text", props: { text: "Tip: Prepare 2-3 questions you'd like to discuss so we can make the most of our time together.", align: "center", color: "#334155" } },
          ],
        },
      },
    ],
  },
  {
    id: "event-signup",
    name: "Event Signup Funnel",
    description: "Collect registrations for events, workshops, or summits.",
    objective: "lead_capture",
    steps: [
      {
        step_type: "landing",
        page_content: {
          blocks: [
            ...heroSection("Join Our Exclusive Event", "Connect with industry leaders and learn cutting-edge strategies.", "Register Free"),
            benefitsSection(["World-class speakers", "Networking opportunities", "Hands-on workshops", "Certificate of attendance"]),
            testimonialsBlock,
            formBlock(["firstName", "lastName", "email"]),
            ctaSection("Don't Miss This — Registration Closes Soon", "Secure Your Spot"),
          ],
        },
      },
      {
        step_type: "thankyou",
        page_content: {
          blocks: [
            ...heroSection("You're In! 🎉", "Your registration is confirmed. We'll email you the event details.", ""),
            { id: "event-share", type: "text", props: { text: "Know someone who'd love this event? Share this page with them!", align: "center", color: "#334155" } },
          ],
        },
      },
    ],
  },
];
