import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callNexusModel } from "../_shared/nexus-ai-core.ts";
import {
  adminClient,
  cfCors,
  cfJson,
  logUsage,
  parseModelJson,
  requireMember,
} from "../_shared/client-finder.ts";

const ICP_SYSTEM = `You are a B2B go-to-market analyst. From the supplied offer description you propose ONE ideal customer profile.
Rules:
- Base every field on the supplied offer text. Do not invent named companies, customers or statistics.
- Prefer broad, searchable criteria (industries, sizes, countries, job titles) over narrative.
- Explain your reasoning in "rationale" in 3-5 short sentences.
Reply with JSON only, no prose:
{"name":"","countries":[],"industries":[],"company_sizes":[],"business_types":[],"technologies":[],"growth_stages":[],"buying_signals":[],"excluded_industries":[],"job_functions":[],"job_titles":[],"seniority_levels":[],"pain_points":[],"disqualifiers":[],"rationale":""}
company_sizes must use these labels only: "1-10","11-50","51-200","201-500","501-1000","1001-5000","5000+".
seniority_levels must use these labels only: "c_level","vp","director","head","manager","owner".`;

const FIT_SYSTEM = `You score how well each supplied company matches an ideal customer profile for a specific offer.
Rules:
- Use ONLY the supplied company facts. If a criterion cannot be checked from the facts, mark it "unknown" and do not reward or punish heavily for it.
- score is 0-100. Be conservative: unknown-heavy records should not score above 60.
- explanation is one or two plain sentences a salesperson can read.
Reply with JSON only:
{"results":[{"id":"","score":0,"explanation":"","breakdown":[{"criterion":"","verdict":"match|mismatch|unknown","note":""}]}]}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cfCors });

  const admin = adminClient();
  let body: any;
  try {
    body = await req.json();
  } catch {
    return cfJson({ error: "Invalid JSON body" }, 400);
  }

  const workspaceId: string = body.workspace_id ?? "";
  const gate = await requireMember(req, admin, workspaceId);
  if (gate instanceof Response) return gate;

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return cfJson({ error: "AI is not configured for this project." }, 500);

  const mode: string = body.mode ?? "";

  if (mode === "generate_icp") {
    const { data: offer } = await admin
      .from("prospecting_offers")
      .select("*")
      .eq("id", body.offer_id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (!offer) return cfJson({ error: "Offer not found." }, 404);

    const facts = [
      `Offer name: ${offer.name}`,
      offer.website_url ? `Website: ${offer.website_url}` : "",
      offer.short_description ? `Description: ${offer.short_description}` : "",
      offer.value_proposition ? `Value proposition: ${offer.value_proposition}` : "",
      offer.customer_problem ? `Problem solved: ${offer.customer_problem}` : "",
      offer.key_benefits?.length ? `Benefits: ${offer.key_benefits.join("; ")}` : "",
      offer.pricing_model ? `Pricing: ${offer.pricing_model}` : "",
      offer.typical_contract_value ? `Typical value: ${offer.typical_contract_value} ${offer.currency}` : "",
      offer.customer_examples ? `Existing customer types: ${offer.customer_examples}` : "",
      offer.proof_points ? `Proof: ${offer.proof_points}` : "",
      offer.countries_served?.length ? `Countries served: ${offer.countries_served.join(", ")}` : "",
      offer.website_analysis_summary ? `Website analysis: ${offer.website_analysis_summary}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const { text, error } = await callNexusModel({
      apiKey,
      system: ICP_SYSTEM,
      messages: [{ role: "user", content: facts }],
      reasoning: "medium",
    });
    if (error) return cfJson({ error: error.message }, error.status);

    const parsed = parseModelJson<Record<string, unknown>>(text);
    if (!parsed) return cfJson({ error: "The profile could not be read. Please try again." }, 502);

    await logUsage(admin, {
      workspace_id: workspaceId,
      user_id: gate.userId,
      operation: "generate_icp",
      provider: "lovable_ai",
      model: "openai/gpt-5.6-sol",
      related_table: "prospecting_offers",
      related_id: offer.id,
    });

    return cfJson({ icp: parsed });
  }

  if (mode === "score_fit") {
    const ids: string[] = Array.isArray(body.company_ids) ? body.company_ids.slice(0, 25) : [];
    if (ids.length === 0) return cfJson({ error: "No companies selected." }, 400);

    const [{ data: icp }, { data: companies }] = await Promise.all([
      admin
        .from("ideal_customer_profiles")
        .select("*")
        .eq("id", body.icp_id)
        .eq("workspace_id", workspaceId)
        .maybeSingle(),
      admin
        .from("prospect_companies")
        .select("id,name,domain,industry,country,city,employee_range,employee_count,company_type,technologies,description,signals")
        .eq("workspace_id", workspaceId)
        .in("id", ids),
    ]);

    if (!icp) return cfJson({ error: "Ideal customer profile not found." }, 404);
    if (!companies?.length) return cfJson({ error: "No matching companies found." }, 404);

    const icpText = JSON.stringify(
      {
        industries: icp.industries,
        countries: icp.countries,
        company_sizes: icp.company_sizes,
        business_types: icp.business_types,
        technologies: icp.technologies,
        buying_signals: icp.buying_signals,
        excluded_industries: icp.excluded_industries,
        pain_points: icp.pain_points,
        disqualifiers: icp.disqualifiers,
      },
      null,
      1,
    );

    const { text, error } = await callNexusModel({
      apiKey,
      system: FIT_SYSTEM,
      messages: [
        {
          role: "user",
          content: `IDEAL CUSTOMER PROFILE:\n${icpText}\n\nCOMPANIES:\n${JSON.stringify(companies)}`,
        },
      ],
      reasoning: "low",
    });
    if (error) return cfJson({ error: error.message }, error.status);

    const parsed = parseModelJson<{ results?: any[] }>(text);
    const results = Array.isArray(parsed?.results) ? parsed!.results! : [];
    if (results.length === 0) return cfJson({ error: "Scoring could not be read. Please try again." }, 502);

    let updated = 0;
    for (const r of results) {
      const company = companies.find((c: any) => c.id === r.id);
      if (!company) continue;
      const score = Math.max(0, Math.min(100, Number(r.score) || 0));
      const { error: upErr } = await admin
        .from("prospect_companies")
        .update({
          fit_score: score,
          fit_explanation: String(r.explanation ?? "").slice(0, 1000),
          fit_breakdown: Array.isArray(r.breakdown) ? r.breakdown : [],
          icp_id: icp.id,
        })
        .eq("id", company.id)
        .eq("workspace_id", workspaceId);
      if (!upErr) updated++;
    }

    await logUsage(admin, {
      workspace_id: workspaceId,
      user_id: gate.userId,
      operation: "score_fit",
      provider: "lovable_ai",
      model: "openai/gpt-5.6-sol",
      units: updated,
    });

    return cfJson({ scored: updated });
  }

  return cfJson({ error: `Unsupported mode: ${mode}` }, 400);
});
