import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type FormFieldType =
  | "short_text"
  | "long_text"
  | "email"
  | "phone"
  | "number"
  | "select"
  | "checkbox"
  | "checkbox_group"
  | "radio"
  | "consent"
  | "hidden"
  | "date"
  | "file"
  | "divider"
  | "heading"
  | "paragraph"
  | "image"
  | "logo";

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "is_empty"
  | "is_not_empty";

export interface FieldCondition {
  field: string; // the `name` of another field
  operator: ConditionOperator;
  value?: string;
}

export interface VisibilityRule {
  match: "all" | "any";
  conditions: FieldCondition[];
}


export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  name: string; // maps to lead field or extra meta key
  placeholder?: string;
  help_text?: string;
  required?: boolean;
  default_value?: string;
  options?: { label: string; value: string }[];
  // mapping target: "full_name" | "email" | "phone" | "notes" | "meta"
  map_to?: "full_name" | "email" | "phone" | "notes" | "meta";
  // image field
  image_url?: string;
  image_alt?: string;
  image_align?: "left" | "center" | "right";
  image_width?: number; // % of container
  // short_text / long_text — visual styling
  text_color?: string;
  background_color?: string;
  border_color?: string;
  border_radius?: number; // px
  font_size?: number; // px
  font_weight?: "normal" | "medium" | "semibold" | "bold";
  text_align?: "left" | "center" | "right";
  label_color?: string;
  label_size?: number; // px
  label_weight?: "normal" | "medium" | "semibold" | "bold";
  // short_text / long_text — validation & behavior
  min_length?: number;
  max_length?: number;
  pattern?: string; // regex source
  pattern_message?: string;
  autocomplete?: string; // e.g. "name", "off"
  // long_text only
  rows?: number;
  resize?: "none" | "vertical" | "horizontal" | "both";
  show_counter?: boolean;
  // heading / paragraph styling
  heading_level?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  letter_spacing?: number; // px (can be negative)
  line_height?: number; // unitless multiplier
  margin_top?: number; // px
  margin_bottom?: number; // px
  // conditional logic — field only renders when the rule passes
  visible_when?: VisibilityRule;
  // file upload
  accept?: string; // e.g. ".pdf,.png,image/*"
  max_size_mb?: number;
  multiple?: boolean;
}


export interface FormStep {
  id: string;
  title?: string;
  fields: FormField[];
}

export interface FormSchema {
  steps: FormStep[];
}

export interface FormNotifyChannels {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}

export interface FormSettings {
  submit_text: string;
  success_message: string;
  redirect_url: string;
  source: string;
  tags: string[];
  folder_name: string;
  pipeline_stage: string;
  notify_channels?: FormNotifyChannels;
  notify_emails?: string[];
  notify_phones?: string[];
  spam?: FormSpamSettings;
  popup?: FormPopupSettings;
  messaging_consent_text?: string;
}

export interface FormSpamSettings {
  honeypot: boolean;
  min_seconds: number; // minimum time-to-submit; 0 disables
  rate_limit_per_hour: number; // per IP per form; 0 disables
  block_disposable_email: boolean;
}

export interface FormPopupSettings {
  trigger: "button" | "delay" | "scroll" | "exit";
  delay_seconds: number;
  scroll_percent: number;
  frequency: "always" | "session" | "days";
  frequency_days: number;
}

export const DEFAULT_SPAM: FormSpamSettings = {
  honeypot: true,
  min_seconds: 2,
  rate_limit_per_hour: 20,
  block_disposable_email: false,
};

export const DEFAULT_POPUP: FormPopupSettings = {
  trigger: "button",
  delay_seconds: 5,
  scroll_percent: 50,
  frequency: "session",
  frequency_days: 7,
};


export interface FormTheme {
  bg_color: string;
  accent_color: string;
  text_color: string;
  font: string;
  border_radius: number;
  logo_url: string;
}

export interface FormRecord {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string;
  status: "draft" | "active";
  schema: FormSchema;
  settings: FormSettings;
  theme: FormTheme;
  submission_count: number;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_SCHEMA: FormSchema = {
  steps: [
    {
      id: "step-1",
      title: "",
      fields: [
        {
          id: "f-name",
          type: "short_text",
          label: "Full name",
          name: "full_name",
          placeholder: "Jane Doe",
          required: false,
          map_to: "full_name",
        },
        {
          id: "f-email",
          type: "email",
          label: "Email",
          name: "email",
          placeholder: "you@example.com",
          required: true,
          map_to: "email",
        },
      ],
    },
  ],
};

export const DEFAULT_SETTINGS: FormSettings = {
  submit_text: "Submit",
  success_message: "Thanks! We received your submission.",
  redirect_url: "",
  source: "Form",
  tags: [],
  folder_name: "",
  pipeline_stage: "new_lead",
  notify_channels: { email: true, sms: false, whatsapp: false },
  notify_emails: [],
  notify_phones: [],
  spam: DEFAULT_SPAM,
  popup: DEFAULT_POPUP,
  messaging_consent_text: "",

};

export const DEFAULT_THEME: FormTheme = {
  bg_color: "#FFFFFF",
  accent_color: "#0B1F3B",
  text_color: "#0B1F3B",
  font: "Inter",
  border_radius: 12,
  logo_url: "",
};

export const useForms = (workspaceId?: string) =>
  useQuery({
    queryKey: ["forms", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forms")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FormRecord[];
    },
  });

export const useForm = (formId?: string) =>
  useQuery({
    queryKey: ["form", formId],
    enabled: !!formId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forms")
        .select("*")
        .eq("id", formId!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as FormRecord | null;
    },
  });

export const useCreateForm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { workspace_id: string; name: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("forms")
        .insert({
          workspace_id: params.workspace_id,
          user_id: userRes.user.id,
          name: params.name,
          schema: DEFAULT_SCHEMA as any,
          settings: DEFAULT_SETTINGS as any,
          theme: DEFAULT_THEME as any,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as FormRecord;
    },
    onSuccess: (form) => {
      qc.invalidateQueries({ queryKey: ["forms", form.workspace_id] });
      toast.success("Form created");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useUpdateForm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      params: Partial<FormRecord> & { id: string }
    ) => {
      const { id, ...rest } = params;
      const { data, error } = await supabase
        .from("forms")
        .update(rest as any)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as FormRecord;
    },
    onSuccess: (form) => {
      qc.invalidateQueries({ queryKey: ["forms", form.workspace_id] });
      qc.invalidateQueries({ queryKey: ["form", form.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useDeleteForm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; workspace_id: string }) => {
      const { error } = await supabase.from("forms").delete().eq("id", params.id);
      if (error) throw error;
      return params;
    },
    onSuccess: ({ workspace_id }) => {
      qc.invalidateQueries({ queryKey: ["forms", workspace_id] });
      toast.success("Form deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });
};
