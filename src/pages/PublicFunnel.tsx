import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PublicBlockRenderer from "@/components/funnels/PublicBlockRenderer";
import type { Block } from "@/components/funnels/builder/blockTypes";

interface FunnelData {
  id: string;
  name: string;
  status: string;
  workspace_id: string;
}

interface StepData {
  id: string;
  step_order: number;
  step_type: string;
  page_content: Record<string, unknown>;
}

export default function PublicFunnel() {
  const { slug, stepPath } = useParams<{ slug: string; stepPath?: string }>();
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [steps, setSteps] = useState<StepData[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [unpublished, setUnpublished] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);

      // Fetch funnel by slug – the public SELECT policy only returns active funnels
      const { data: funnelRow, error } = await supabase
        .from("funnels")
        .select("id, name, status, workspace_id, slug")
        .eq("slug", slug)
        .maybeSingle();

      if (error || !funnelRow) {
        // Could be draft/paused – try without RLS by checking if ANY funnel with this slug exists
        // Since the public policy only returns active, a null result means either not found or not active
        setNotFound(true);
        setLoading(false);
        return;
      }

      if (funnelRow.status !== "active") {
        setUnpublished(true);
        setLoading(false);
        return;
      }

      setFunnel(funnelRow as FunnelData);

      // Fetch steps
      const { data: stepsData } = await supabase
        .from("funnel_steps")
        .select("id, step_order, step_type, page_content")
        .eq("funnel_id", funnelRow.id)
        .order("step_order", { ascending: true });

      setSteps((stepsData ?? []) as StepData[]);
      setLoading(false);

      // Track visit
      const firstStep = stepsData?.[0];
      if (firstStep) {
        const urlParams = new URLSearchParams(window.location.search);
        await supabase.from("funnel_visits").insert({
          funnel_id: funnelRow.id,
          step_id: firstStep.id,
          workspace_id: funnelRow.workspace_id,
          utm_source: urlParams.get("utm_source") || null,
          utm_medium: urlParams.get("utm_medium") || null,
          utm_campaign: urlParams.get("utm_campaign") || null,
          device_type: /Mobi/i.test(navigator.userAgent) ? "mobile" : /Tablet/i.test(navigator.userAgent) ? "tablet" : "desktop",
        } as any);
      }
    })();
  }, [slug]);

  // Build leadData from URL query params for variable interpolation (must be before any early returns)
  const leadData = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const data: Record<string, string> = {};
    const varMap: Record<string, string> = {
      first_name: "{{first_name}}",
      last_name: "{{last_name}}",
      email: "{{email}}",
      phone: "{{phone}}",
      company: "{{company}}",
      source: "{{source}}",
      lead_score: "{{lead_score}}",
    };
    for (const [param, varKey] of Object.entries(varMap)) {
      const val = params.get(param);
      if (val) data[varKey] = val;
    }
    return data;
  }, []);

  // Determine which step to show
  const currentStep = stepPath
    ? steps.find((s) => s.step_type === stepPath) || steps.find((_, i) => String(i + 1) === stepPath)
    : steps[0];

  const currentStepIndex = currentStep ? steps.indexOf(currentStep) : 0;
  const nextStep = steps[currentStepIndex + 1] || null;

  const blocks: Block[] = (!loading && currentStep && Array.isArray(currentStep.page_content?.blocks))
    ? (currentStep.page_content.blocks as Block[])
    : [];

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <PublicBlockRenderer blocks={blocks} onFormSubmit={handleFormSubmit} formSubmitting={formSubmitting} leadData={leadData} />
      </div>
    </div>
  );
}
