import { useCallback, useEffect, useState, useMemo } from "react";
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

      const { data: funnelRow, error } = await supabase
        .from("funnels")
        .select("id, name, status, workspace_id, slug")
        .eq("slug", slug)
        .maybeSingle();

      if (error || !funnelRow) {
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

      const { data: stepsData } = await supabase
        .from("funnel_steps")
        .select("id, step_order, step_type, page_content")
        .eq("funnel_id", funnelRow.id)
        .order("step_order", { ascending: true });

      setSteps((stepsData ?? []) as StepData[]);
      setLoading(false);

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

  // All hooks must be called unconditionally — before any early returns
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

  const currentStep = stepPath
    ? steps.find((s) => s.step_type === stepPath) || steps.find((_, i) => String(i + 1) === stepPath)
    : steps[0];

  const currentStepIndex = currentStep ? steps.indexOf(currentStep) : 0;
  const nextStep = steps[currentStepIndex + 1] || null;

  const handleFormSubmit = useCallback(async (data: Record<string, string>) => {
    if (!funnel || !currentStep) return;
    setFormSubmitting(true);
    try {
      await supabase.functions.invoke("capture-lead", {
        body: {
          full_name: [data.firstName, data.lastName].filter(Boolean).join(" ") || null,
          email: data.email,
          phone: data.phone || null,
          source: `funnel:${funnel.name}`,
          funnel_name: funnel.name,
          tags: ["funnel-lead"],
          notes: `Funnel: ${funnel.name} | Step: ${currentStep.step_type}`,
          meta: {
            funnel_id: funnel.id,
            step_id: currentStep.id,
            page: window.location.pathname,
          },
        },
      });

      await supabase.from("funnel_visits").insert({
        funnel_id: funnel.id,
        step_id: currentStep.id,
        workspace_id: funnel.workspace_id,
        converted: true,
        device_type: /Mobi/i.test(navigator.userAgent) ? "mobile" : "desktop",
      } as any);

      if (nextStep) {
        window.location.href = `/f/${slug}/${nextStep.step_type}`;
      }
    } catch (err) {
      console.error("Form submit error:", err);
    } finally {
      setFormSubmitting(false);
    }
  }, [funnel, currentStep, nextStep, slug]);

  // Now safe to do early returns
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="animate-pulse text-gray-400">Loading…</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white text-center">
        <h1 className="text-2xl font-bold text-gray-900">Page Not Found</h1>
        <p className="mt-2 text-gray-500">This funnel doesn't exist or has been removed.</p>
      </div>
    );
  }

  if (unpublished) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white text-center">
        <h1 className="text-2xl font-bold text-gray-900">This funnel is not published</h1>
        <p className="mt-2 text-gray-500">The owner has not activated this funnel yet.</p>
      </div>
    );
  }

  if (!currentStep) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white text-center">
        <h1 className="text-2xl font-bold text-gray-900">No content yet</h1>
        <p className="mt-2 text-gray-500">This funnel step has no content.</p>
      </div>
    );
  }

  const blocks: Block[] = Array.isArray(currentStep.page_content?.blocks)
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
