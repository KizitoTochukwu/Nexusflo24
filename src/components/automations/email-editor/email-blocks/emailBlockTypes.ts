import {
  Type, ImageIcon, MousePointerClick, Minus, MoveVertical,
  Share2, Columns2,
} from "lucide-react";

export type EmailBlockType = "text" | "image" | "button" | "divider" | "spacer" | "social" | "columns";

export interface GradientProps {
  enabled: boolean;
  from: string;
  fromOpacity: number;
  to: string;
  toOpacity: number;
  angle: number; // degrees
}

export interface TextBlockProps {
  content: string;
  fontFamily?: string;
  fontSize: number;
  color: string;
  colorOpacity?: number;
  alignment: "left" | "center" | "right" | "justify";
  fontWeight: "normal" | "bold";
  italic?: boolean;
  underline?: boolean;
  lineHeight: number;
  bgColor?: string;
  bgOpacity?: number;
  bgGradient?: GradientProps;
}

export interface ImageBlockProps {
  src: string;
  alt: string;
  width: number;
  alignment: "left" | "center" | "right";
  linkUrl: string;
  borderRadius: number;
}

export interface ButtonBlockProps {
  label: string;
  url: string;
  bgColor: string;
  bgOpacity?: number;
  textColor: string;
  textOpacity?: number;
  borderRadius: number;
  alignment: "left" | "center" | "right";
  fullWidth: boolean;
  fontSize: number;
  bgGradient?: GradientProps;
}

export interface DividerBlockProps {
  color: string;
  thickness: number;
  style: "solid" | "dashed" | "dotted";
  margin: number;
}

export interface SpacerBlockProps {
  height: number;
}

export interface SocialBlockProps {
  alignment: "left" | "center" | "right";
  iconSize: number;
  links: {
    facebook: string;
    twitter: string;
    linkedin: string;
    instagram: string;
  };
}

export interface ColumnsBlockProps {
  columnCount: 2 | 3;
  columns: string[];
  gap: number;
}

export type EmailBlockProps =
  | TextBlockProps
  | ImageBlockProps
  | ButtonBlockProps
  | DividerBlockProps
  | SpacerBlockProps
  | SocialBlockProps
  | ColumnsBlockProps;

export interface EmailBlock {
  id: string;
  type: EmailBlockType;
  props: EmailBlockProps;
}

let blockIdCounter = 0;

function uid(): string {
  return `blk_${Date.now()}_${++blockIdCounter}`;
}

const BLOCK_DEFAULTS: Record<EmailBlockType, () => EmailBlockProps> = {
  text: () => ({
    content: "Type your text here...",
    fontSize: 15,
    color: "#0B1F3B",
    alignment: "left",
    fontWeight: "normal",
    lineHeight: 1.6,
  } as TextBlockProps),
  image: () => ({
    src: "",
    alt: "Image",
    width: 100,
    alignment: "center",
    linkUrl: "",
    borderRadius: 0,
  } as ImageBlockProps),
  button: () => ({
    label: "Click Here",
    url: "https://",
    bgColor: "#0B1F3B",
    textColor: "#FFFFFF",
    borderRadius: 8,
    alignment: "center",
    fullWidth: false,
    fontSize: 16,
  } as ButtonBlockProps),
  divider: () => ({
    color: "#E5E7EB",
    thickness: 1,
    style: "solid",
    margin: 24,
  } as DividerBlockProps),
  spacer: () => ({
    height: 32,
  } as SpacerBlockProps),
  social: () => ({
    alignment: "center",
    iconSize: 32,
    links: { facebook: "", twitter: "", linkedin: "", instagram: "" },
  } as SocialBlockProps),
  columns: () => ({
    columnCount: 2,
    columns: ["Column 1 text", "Column 2 text"],
    gap: 16,
  } as ColumnsBlockProps),
};

export function createEmailBlock(type: EmailBlockType): EmailBlock {
  return { id: uid(), type, props: BLOCK_DEFAULTS[type]() };
}

export const BLOCK_META: Record<EmailBlockType, { label: string; icon: typeof Type; group: string }> = {
  text: { label: "Text", icon: Type, group: "Content" },
  image: { label: "Image", icon: ImageIcon, group: "Content" },
  button: { label: "Button", icon: MousePointerClick, group: "Content" },
  divider: { label: "Divider", icon: Minus, group: "Layout" },
  spacer: { label: "Spacer", icon: MoveVertical, group: "Layout" },
  columns: { label: "Columns", icon: Columns2, group: "Layout" },
  social: { label: "Social Links", icon: Share2, group: "Engagement" },
};
