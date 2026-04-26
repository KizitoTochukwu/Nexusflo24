import type { FormFieldType, FormField } from "@/hooks/useForms";
import {
  Type, AlignLeft, Mail, Phone, Hash, ChevronDown, CheckSquare,
  Circle, ShieldCheck, EyeOff, Calendar, Minus, Heading1, Pilcrow, Image as ImageIcon,
} from "lucide-react";

export const FIELD_DEFS: {
  type: FormFieldType;
  label: string;
  icon: any;
  defaults: () => Omit<FormField, "id">;
}[] = [
  {
    type: "short_text",
    label: "Short text",
    icon: Type,
    defaults: () => ({ type: "short_text", label: "Short text", name: "short_text", placeholder: "" }),
  },
  {
    type: "long_text",
    label: "Long text",
    icon: AlignLeft,
    defaults: () => ({ type: "long_text", label: "Message", name: "message", placeholder: "", map_to: "notes" }),
  },
  {
    type: "email",
    label: "Email",
    icon: Mail,
    defaults: () => ({ type: "email", label: "Email", name: "email", placeholder: "you@example.com", required: true, map_to: "email" }),
  },
  {
    type: "phone",
    label: "Phone",
    icon: Phone,
    defaults: () => ({ type: "phone", label: "Phone", name: "phone", placeholder: "+1 555 000 0000", map_to: "phone" }),
  },
  {
    type: "number",
    label: "Number",
    icon: Hash,
    defaults: () => ({ type: "number", label: "Number", name: "number" }),
  },
  {
    type: "select",
    label: "Dropdown",
    icon: ChevronDown,
    defaults: () => ({
      type: "select", label: "Choose one", name: "choice",
      options: [{ label: "Option 1", value: "option_1" }, { label: "Option 2", value: "option_2" }],
    }),
  },
  {
    type: "checkbox_group",
    label: "Checkboxes",
    icon: CheckSquare,
    defaults: () => ({
      type: "checkbox_group", label: "Check all that apply", name: "checkboxes",
      options: [{ label: "Option 1", value: "option_1" }, { label: "Option 2", value: "option_2" }],
    }),
  },
  {
    type: "radio",
    label: "Radio group",
    icon: Circle,
    defaults: () => ({
      type: "radio", label: "Pick one", name: "radio",
      options: [{ label: "Option 1", value: "option_1" }, { label: "Option 2", value: "option_2" }],
    }),
  },
  {
    type: "consent",
    label: "Consent",
    icon: ShieldCheck,
    defaults: () => ({
      type: "consent", label: "I agree to receive marketing emails.", name: "consent", required: true,
    }),
  },
  {
    type: "date",
    label: "Date",
    icon: Calendar,
    defaults: () => ({ type: "date", label: "Date", name: "date" }),
  },
  {
    type: "hidden",
    label: "Hidden",
    icon: EyeOff,
    defaults: () => ({ type: "hidden", label: "Hidden", name: "hidden", default_value: "" }),
  },
  {
    type: "heading",
    label: "Heading",
    icon: Heading1,
    defaults: () => ({ type: "heading", label: "Section heading", name: "heading" }),
  },
  {
    type: "paragraph",
    label: "Paragraph",
    icon: Pilcrow,
    defaults: () => ({ type: "paragraph", label: "Add some descriptive text here.", name: "paragraph" }),
  },
  {
    type: "divider",
    label: "Divider",
    icon: Minus,
    defaults: () => ({ type: "divider", label: "", name: "divider" }),
  },
  {
    type: "image",
    label: "Image",
    icon: ImageIcon,
    defaults: () => ({
      type: "image",
      label: "Image",
      name: "image",
      image_url: "",
      image_alt: "",
      image_align: "center",
      image_width: 100,
    }),
  },
];

export const newFieldId = () => `f-${Math.random().toString(36).slice(2, 10)}`;
