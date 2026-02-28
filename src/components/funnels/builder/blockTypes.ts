export type BlockType =
  | "section"
  | "columns2"
  | "columns3"
  | "heading"
  | "text"
  | "image"
  | "button"
  | "divider"
  | "spacer"
  | "form"
  | "testimonials"
  | "pricing"
  | "faq"
  | "embed";

export interface Block {
  id: string;
  type: BlockType;
  props: Record<string, unknown>;
  children?: Block[];
}

export function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export const BLOCK_DEFAULTS: Record<BlockType, () => Record<string, unknown>> = {
  section: () => ({
    backgroundColor: "#ffffff",
    padding: "40px 20px",
    maxWidth: "960px",
  }),
  columns2: () => ({ gap: "24px" }),
  columns3: () => ({ gap: "24px" }),
  heading: () => ({ text: "Your Headline Here", level: "h2", align: "center", color: "#0B1F3B" }),
  text: () => ({ text: "Add your text content here. Describe your offer, benefits, or story.", align: "left", color: "#333333" }),
  image: () => ({ src: "", alt: "Image", width: "100%", borderRadius: "8px" }),
  button: () => ({ text: "Get Started", link: "#", backgroundColor: "#D4AF37", textColor: "#ffffff", align: "center", size: "lg", borderRadius: "8px" }),
  divider: () => ({ color: "#e5e7eb", thickness: "1px", margin: "24px 0" }),
  spacer: () => ({ height: "40px" }),
  form: () => ({ fields: ["email"], buttonText: "Submit", buttonColor: "#D4AF37", redirectNext: true }),
  testimonials: () => ({
    items: [
      { name: "Sarah J.", text: "This changed everything for my business!", avatar: "", role: "Founder" },
      { name: "Mark T.", text: "Incredible results in just 30 days.", avatar: "", role: "CEO" },
    ],
  }),
  pricing: () => ({
    title: "Pro Plan",
    price: "$49/mo",
    features: ["Feature one", "Feature two", "Feature three"],
    buttonText: "Get Started",
    buttonColor: "#D4AF37",
    highlighted: true,
  }),
  faq: () => ({
    items: [
      { q: "How does it work?", a: "Simply sign up and follow the guided setup." },
      { q: "Is there a free trial?", a: "Yes, you get a 14-day free trial." },
    ],
  }),
  embed: () => ({ src: "", height: "400px" }),
};

export const BLOCK_LABELS: Record<BlockType, { label: string; icon: string }> = {
  section: { label: "Section", icon: "LayoutTemplate" },
  columns2: { label: "2 Columns", icon: "Columns2" },
  columns3: { label: "3 Columns", icon: "Columns3" },
  heading: { label: "Heading", icon: "Type" },
  text: { label: "Text", icon: "AlignLeft" },
  image: { label: "Image", icon: "ImageIcon" },
  button: { label: "Button", icon: "MousePointerClick" },
  divider: { label: "Divider", icon: "Minus" },
  spacer: { label: "Spacer", icon: "MoveVertical" },
  form: { label: "Form", icon: "FormInput" },
  testimonials: { label: "Testimonials", icon: "Quote" },
  pricing: { label: "Pricing", icon: "DollarSign" },
  faq: { label: "FAQ", icon: "HelpCircle" },
  embed: { label: "Embed", icon: "Code" },
};

export function createBlock(type: BlockType): Block {
  return { id: generateId(), type, props: BLOCK_DEFAULTS[type]() };
}
