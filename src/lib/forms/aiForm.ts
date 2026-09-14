import {
  DEFAULT_SETTINGS,
  type FormField,
  type FormFieldType,
  type FormSchema,
  type FormSettings,
} from "@/hooks/useForms";

const ALLOWED_TYPES: FormFieldType[] = [
  "short_text",
  "long_text",
  "email",
  "phone",
  "number",
  "select",
  "checkbox",
  "checkbox_group",
  "radio",
  "consent",
  "date",
  "file",
  "heading",
  "paragraph",
];

const NEEDS_OPTIONS: FormFieldType[] = ["select", "radio", "checkbox_group"];

export interface GeneratedForm {
  name: string;
  description: string;
  schema: FormSchema;
  settings: FormSettings;
}

const slugKey = (input: string, fallback: string) => {
  const key = String(input ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return key || fallback;
};

const mapTargetFor = (name: string, type: FormFieldType): FormField["map_to"] => {
  if (type === "email" || name === "email") return "email";
  if (type === "phone" || name === "phone") return "phone";
  if (name === "full_name" || name === "name") return "full_name";
  if (type === "long_text") return "notes";
  return "meta";
};

/**
 * Turn the raw AI payload into a safe FormSchema. Anything unrecognised is dropped
 * rather than persisted, so a generated form can never break the builder.
 */
export const normalizeGeneratedForm = (raw: any): GeneratedForm | null => {
  if (!raw || typeof raw !== "object") return null;

  const usedNames = new Set<string>();
  let hasEmail = false;
  let fieldIndex = 0;

  const steps = (Array.isArray(raw.steps) ? raw.steps : [])
    .map((step: any, si: number) => {
      const fields: FormField[] = (Array.isArray(step?.fields) ? step.fields : [])
        .map((f: any): FormField | null => {
          const type = ALLOWED_TYPES.includes(f?.type) ? (f.type as FormFieldType) : null;
          if (!type) return null;
          const label = String(f?.label ?? "").trim();
          if (!label && type !== "divider") return null;

          let name = slugKey(f?.name ?? label, `field_${fieldIndex + 1}`);
          if (type === "email") name = "email";
          while (usedNames.has(name) && type !== "email") name = `${name}_${usedNames.size + 1}`;
          if (type === "email") {
            if (hasEmail) return null;
            hasEmail = true;
          }
          usedNames.add(name);

          const options = Array.isArray(f?.options)
            ? f.options
                .map((o: any) => ({
                  label: String(o?.label ?? o?.value ?? "").trim(),
                  value: slugKey(o?.value ?? o?.label ?? "", "option"),
                }))
                .filter((o: any) => o.label)
            : [];

          if (NEEDS_OPTIONS.includes(type) && options.length < 2) return null;

          fieldIndex += 1;
          const field: FormField = {
            id: `ai-${Date.now().toString(36)}-${fieldIndex}`,
            type,
            label,
            name,
            required: type === "email" ? true : Boolean(f?.required),
          };
          if (f?.placeholder) field.placeholder = String(f.placeholder).slice(0, 120);
          if (f?.help_text) field.help_text = String(f.help_text).slice(0, 240);
          if (options.length) field.options = options;
          if (!["heading", "paragraph", "divider"].includes(type)) {
            field.map_to = mapTargetFor(name, type);
          }
          if (type === "file") {
            field.accept = "";
            field.max_size_mb = 10;
            field.multiple = false;
          }
          return field;
        })
        .filter(Boolean) as FormField[];

      return {
        id: `ai-step-${si + 1}`,
        title: typeof step?.title === "string" ? step.title.slice(0, 80) : "",
        fields,
      };
    })
    .filter((s: any) => s.fields.length > 0);

  if (!steps.length) return null;

  // Guarantee an email field so the lead can always be captured.
  if (!hasEmail) {
    steps[0].fields.unshift({
      id: `ai-email-${Date.now().toString(36)}`,
      type: "email",
      label: "Email",
      name: "email",
      placeholder: "you@example.com",
      required: true,
      map_to: "email",
    });
  }

  const settings: FormSettings = {
    ...DEFAULT_SETTINGS,
    submit_text:
      typeof raw.submit_text === "string" && raw.submit_text.trim()
        ? raw.submit_text.trim().slice(0, 40)
        : DEFAULT_SETTINGS.submit_text,
    success_message:
      typeof raw.success_message === "string" && raw.success_message.trim()
        ? raw.success_message.trim().slice(0, 240)
        : DEFAULT_SETTINGS.success_message,
  };

  return {
    name: String(raw.name ?? "AI form").trim().slice(0, 80) || "AI form",
    description: String(raw.description ?? "").trim().slice(0, 200),
    schema: { steps },
    settings,
  };
};
