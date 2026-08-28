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
import { MERGE_VARS } from "../_shared/client-finder-send.ts";

const SYSTEM = `You write short, honest B2B cold emails for a named offer.

Hard rules:
- Use ONLY the supplied offer facts and the supplied research findings. Never invent a statistic, customer name, funding round, headcount, award or news item.
- If the research findings are empty or weak, write a relevance-led opener based on the ideal-customer profile instead of pretending to know something specific about the recipient. Do not fabricate a personal detail.
- Every factual claim about the recipient must come from a supplied finding, and you must list the finding index you used in "evidence".
- Plain text only. No HTML, no markdown, no emoji, no images, no attachments.
- 60-120 words per email. One clear ask. British English.
- Personalisation tokens allowed, written exactly like {{first_name}}: ${MERGE_VARS.join(", ")}.
- Never promise results you were not given proof for. No pressure tactics, no fake follow-up history ("as discussed", "circling back" on a first email).

Reply with JSON only:
{"steps":[{"step_number":1,"delay_days":0,"subject":"","body":"","evidence":[0]}]}`;

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

  const allowance = await checkEntitlement(admin, workspaceId, "ai_ops");
  if (allowance) return allowance;
  const { userId } = gate;

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return cfJson({ error: "AI is not configured for this project." }, 500);

  const campaignId: string = body.campaign_id ?? "";
  const stepCount = Math.min(Math.max(Number(body.step_count) || 3, 1), 5);

  const { data: campaign } = await admin
    .from("prospecting_campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!campaign) return cfJson({ error: "Campaign not found." }, 404);

  const { data: offer } = campaign.offer_id
    ? await admin.from("prospecting_offers").select("*").eq("id", campaign.offer_id).maybeSingle()
    : { data: null as any };
  if (!offer) {
    return cfJson({ error: "Attach an offer to this campaign before generating a sequence." }, 400);
  }

  const { data: icp } = campaign.icp_id
    ? await admin.from("ideal_customer_profiles").select("*").eq("id", campaign.icp_id).maybeSingle()
    : { data: null as any };

  // Research grounding: only findings stored for this workspace/offer may be cited.
  const { data: findings } = await admin
    .from("prospect_research_findings")
    .select("id, finding, source_url, source_title, retrieved_at, confidence")
    .eq("workspace_id", workspaceId)
    .order("retrieved_at", { ascending: false })
    .limit(12);

  const findingList = (findings ?? []).map((f, i) => `[${i}] ${f.finding} (source: ${f.source_url ?? "unknown"})`);

  const facts = [
    `Offer: ${offer.name}`,
    offer.short_description ? `What it is: ${offer.short_description}` : "",
    offer.value_proposition ? `Value: ${offer.value_proposition}` : "",
    offer.customer_problem ? `Problem solved: ${offer.customer_problem}` : "",
    offer.key_benefits?.length ? `Benefits: ${offer.key_benefits.join("; ")}` : "",
    offer.proof_points ? `Proof the seller supplied: ${offer.proof_points}` : "",
    offer.call_to_action ? `Preferred call to action: ${offer.call_to_action}` : "",
    icp ? `Ideal customer: ${[icp.industries?.join(", "), icp.company_sizes?.join(", "), icp.countries?.join(", ")].filter(Boolean).join(" | ")}` : "",
    icp?.pain_points?.length ? `Their pain points: ${icp.pain_points.join("; ")}` : "",
    icp?.job_titles?.length ? `Decision-makers: ${icp.job_titles.join(", ")}` : "",
    findingList.length
      ? `Research findings you may cite:\n${findingList.join("\n")}`
      : "Research findings available: NONE. Do not invent recipient-specific details.",
    `Write ${stepCount} emails: step 1 is the first touch (delay_days 0), each follow-up 3-5 days later and must add a new angle, never just "bumping this".`,
  ]
    .filter(Boolean)
    .join("\n");

  let reply = "";
  try {
    reply = await callNexusModel({ apiKey, system: SYSTEM, messages: [{ role: "user", content: facts }] });
  } catch (e) {
    const msg = (e as Error).message || "AI request failed";
    await logUsage(admin, {
      workspace_id: workspaceId, user_id: userId, operation: "generate_sequence",
      provider: "lovable_ai", related_table: "prospecting_campaigns", related_id: campaignId,
      status: "error", error_category: msg.slice(0, 120),
    });
    return cfJson({ error: msg }, 502);
  }

  const parsed = parseModelJson<{ steps: Array<{ step_number: number; delay_days: number; subject: string; body: string; evidence?: number[] }> }>(reply);
  if (!parsed?.steps?.length) {
    return cfJson({ error: "The AI reply could not be read as a sequence. Please try again." }, 502);
  }

  const rows = parsed.steps.slice(0, stepCount).map((s, i) => ({
    workspace_id: workspaceId,
    campaign_id: campaignId,
    step_number: i + 1,
    delay_days: i === 0 ? 0 : Math.min(Math.max(Number(s.delay_days) || 3, 1), 30),
    subject_template: String(s.subject ?? "").slice(0, 300),
    body_template: String(s.body ?? "").slice(0, 6000),
    ai_generated: true,
    evidence: (s.evidence ?? [])
      .map((idx) => (findings ?? [])[idx])
      .filter(Boolean)
      .map((f: any) => ({ id: f.id, finding: f.finding, source_url: f.source_url, source_title: f.source_title, retrieved_at: f.retrieved_at })),
  }));

  await admin.from("prospecting_sequence_steps").delete().eq("campaign_id", campaignId).eq("workspace_id", workspaceId);
  const { error: insErr } = await admin.from("prospecting_sequence_steps").insert(rows);
  if (insErr) return cfJson({ error: insErr.message }, 500);

  await logUsage(admin, {
    workspace_id: workspaceId, user_id: userId, operation: "generate_sequence",
    provider: "lovable_ai", related_table: "prospecting_campaigns", related_id: campaignId,
    units: rows.length, status: "success",
  });

  await admin.from("prospecting_audit_events").insert({
    workspace_id: workspaceId, user_id: userId, action: "sequence_generated",
    entity_type: "campaign", entity_id: campaignId,
    detail: { steps: rows.length, grounded_on_findings: findingList.length },
  });

  return cfJson({ ok: true, steps: rows.length, findings_available: findingList.length });
});
