export type BlockType =
  | "section"
  | "columns2"
  | "columns3"
  | "columns4"
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
   | "embed"
   | "video"
    | "booking"
   | "countdown"
   | "cards";

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
    backgroundType: "solid",
    backgroundColor: "#ffffff",
    gradientFrom: "#ffffff",
    gradientTo: "#f0f0f0",
    backgroundImage: "",
    backgroundOverlay: 0,
    overlayColor: "#000000",
    backgroundPosition: "center",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    paddingTop: "40",
    paddingRight: "20",
    paddingBottom: "40",
    paddingLeft: "20",
    marginTop: "0",
    marginBottom: "0",
    maxWidth: "960px",
    alignment: "center",
    borderRadius: "0",
    borderWidth: "0",
    borderColor: "#e5e7eb",
    shadow: false,
    shadowIntensity: "medium",
    hideOnMobile: false,
    hideOnTablet: false,
    hideOnDesktop: false,
  }),
  columns2: () => ({
    gap: "24px",
    columnWidths: "50/50",
    customWidths: "",
    verticalAlign: "top",
    stackOnMobile: true,
    columnStyles: [{}, {}],
  }),
  columns3: () => ({
    gap: "24px",
    columnWidths: "33/33/33",
    customWidths: "",
    verticalAlign: "top",
    stackOnMobile: true,
    columnStyles: [{}, {}, {}],
  }),
  columns4: () => ({
    gap: "24px",
    columnWidths: "25/25/25/25",
    customWidths: "",
    verticalAlign: "top",
    stackOnMobile: true,
    columnStyles: [{}, {}, {}, {}],
  }),
  heading: () => ({
    text: "Your Headline Here",
    level: "h2",
    align: "center",
    color: "#0B1F3B",
    fontSize: "36px",
    fontWeight: "bold",
    lineHeight: "1.2",
    maxWidth: "",
  }),
  text: () => ({
    text: "Add your text content here. Describe your offer, benefits, or story.",
    align: "left",
    color: "#333333",
    fontSize: "16px",
    fontWeight: "normal",
    lineHeight: "1.6",
    maxWidth: "",
  }),
  image: () => ({
    src: "",
    alt: "Image",
    width: "100%",
    borderRadius: "8px",
    objectFit: "cover",
    shadow: false,
    alignment: "center",
    linkUrl: "",
  }),
  button: () => ({
    text: "Get Started",
    link: "#",
    backgroundColor: "#D4AF37",
    textColor: "#ffffff",
    align: "center",
    size: "lg",
    borderRadius: "8px",
    openNewTab: false,
    paddingX: "32",
    paddingY: "12",
  }),
  divider: () => ({
    color: "#e5e7eb",
    thickness: "1px",
    margin: "24px 0",
    style: "solid",
    width: "100%",
  }),
  spacer: () => ({ height: "40px" }),
  form: () => ({
    fields: ["email"],
    buttonText: "Submit",
    buttonColor: "#D4AF37",
    redirectNext: true,
  }),
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
  embed: () => ({
    src: "",
    height: "400px",
    aspectRatio: "16:9",
    useAspectRatio: false,
    maxWidth: "",
    alignment: "center",
    marginTop: "0",
    marginBottom: "0",
  }),
  video: () => ({
    src: "",
    autoplay: false,
    mute: false,
    loop: false,
    controls: true,
    aspectRatio: "16:9",
  }),
  booking: () => ({
    booking_page_id: "",
    buttonText: "Book a Call",
    buttonColor: "#D4AF37",
  }),
  countdown: () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(20, 30, 0, 0);
    // Format as local datetime-local string YYYY-MM-DDTHH:mm
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return {
      targetDate: local,
      introText: "EVENT STARTS IN",
      expiredText: "Event has started",
      showLabels: true,
      showDateTime: true,
      dateLabel: "",
      timeLabel: "",
      align: "center",
      numberColor: "#D4AF37",
      labelColor: "#94a3b8",
      introColor: "#94a3b8",
      pillBg: "rgba(255,255,255,0.04)",
      pillBorderColor: "rgba(255,255,255,0.08)",
      pillBorderWidth: 1,
      pillBorderRadius: 12,
      numberSize: 32,
      labelSize: 11,
      introSize: 12,
      gap: 12,
    };
  },
  cards: () => ({
    columns: 3,
    backgroundColor: "#f1f5f9",
    cardBg: "#ffffff",
    cardBorderRadius: "12px",
    iconBg: "#fef3c7",
    iconColor: "#d4af37",
    titleColor: "#0B1F3B",
    textColor: "#64748b",
    gap: "24px",
    items: [
      { icon: "Layers", title: "Feature One", description: "Describe the first key feature or benefit." },
      { icon: "Target", title: "Feature Two", description: "Describe the second key feature or benefit." },
      { icon: "MessageSquare", title: "Feature Three", description: "Describe the third key feature or benefit." },
    ],
  }),
};

export const BLOCK_LABELS: Record<BlockType, { label: string; icon: string }> = {
  section: { label: "Section", icon: "LayoutTemplate" },
  columns2: { label: "2 Columns", icon: "Columns2" },
  columns3: { label: "3 Columns", icon: "Columns3" },
  columns4: { label: "4 Columns", icon: "Columns4" },
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
  video: { label: "Video", icon: "Video" },
  booking: { label: "Booking", icon: "CalendarDays" },
  countdown: { label: "Countdown", icon: "Timer" },
  cards: { label: "Cards", icon: "LayoutGrid" },
};

export function createBlock(type: BlockType): Block {
  return { id: generateId(), type, props: BLOCK_DEFAULTS[type]() };
}
