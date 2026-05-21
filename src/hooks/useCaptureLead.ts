import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CaptureLeadInput {
  full_name?: string;
  email: string;
  phone?: string;
  source: string;
  tags: string[];
  notes: string;
  formId: string;
  page: string;
  lead_destination?: {
    folder_name?: string;
    apply_tags?: string[];
    source?: string;
    pipeline_stage?: string;
  };
}

function getUtmParams() {
  const params = new URLSearchParams(window.location.search);
  const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  const utm: Record<string, string> = {};
  keys.forEach((k) => {
    const v = params.get(k);
    if (v) utm[k] = v;
  });
  return utm;
}

export function useCaptureLead() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const capture = async (input: CaptureLeadInput) => {
    setLoading(true);
    try {
      const utm = getUtmParams();
      const meta = {
        page: input.page,
        formId: input.formId,
        referrer: document.referrer || null,
        ...utm,
      };

      const utmNote = Object.keys(utm).length
        ? `\nUTM: ${Object.entries(utm).map(([k, v]) => `${k}=${v}`).join(", ")}`
        : "";

      const { data, error } = await supabase.functions.invoke("capture-lead", {
        body: {
          full_name: input.full_name || null,
          email: input.email,
          phone: input.phone || null,
          source: input.source,
          tags: input.tags,
          notes: `${input.notes}${utmNote}`,
          meta,
        },
      });

      if (error) throw error;
      setSuccess(true);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => setSuccess(false);

  return { capture, loading, success, reset };
}
