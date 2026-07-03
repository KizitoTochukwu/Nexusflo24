import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const num = (v: unknown, def = 0): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) && n >= 0 ? n : def;
};
const str = (v: unknown, max = 500): string | null => {
  if (typeof v !== "string") return null;
  const trimmed = v.trim().slice(0, max);
  return trimmed || null;
};
const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));

    const full_name = str(body.full_name, 120);
    const emailRaw = str(body.email, 255);
    const email = emailRaw ? emailRaw.toLowerCase() : null;
    const consent = body.consent === true;

    if (!full_name || !email || !isEmail(email) || !consent) {
      return new Response(
        JSON.stringify({ error: "Full name, valid email, and consent are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const phone = str(body.phone, 40);
    const business_name = str(body.business_name, 200);
    const business_type = str(body.business_type, 100);
    const preferred_contact_method = str(body.preferred_contact_method, 40);

    const currency = (["GBP", "USD", "EUR", "NGN"].includes(body.currency) ? body.currency : "GBP") as
      | "GBP" | "USD" | "EUR" | "NGN";

    const inputs = {
      leads_per_month: num(body.leads_per_month),
      average_customer_value: num(body.average_customer_value),
      conversion_rate: Math.min(100, num(body.conversion_rate)),
      missed_follow_up_percentage: Math.min(100, num(body.missed_follow_up_percentage)),
      manual_follow_up_hours: num(body.manual_follow_up_hours),
      staff_cost_per_hour: num(body.staff_cost_per_hour),
      monthly_software_cost: num(body.monthly_software_cost),
    };

    // Recompute server-side (never trust client math for stored figures)
    const current_customers = inputs.leads_per_month * (inputs.conversion_rate / 100);
    const current_monthly_revenue = current_customers * inputs.average_customer_value;
    const missed_leads = inputs.leads_per_month * (inputs.missed_follow_up_percentage / 100);
    const recoverable_customers = missed_leads * (inputs.conversion_rate / 100);
    const recoverable_revenue = recoverable_customers * inputs.average_customer_value;
    const manual_admin_cost = inputs.manual_follow_up_hours * inputs.staff_cost_per_hour;
    const estimated_monthly_opportunity =
      recoverable_revenue + manual_admin_cost + inputs.monthly_software_cost;
    const estimated_annual_opportunity = estimated_monthly_opportunity * 12;

    const recommendation = str(body.recommendation, 4000);
    const utm_source = str(body.utm_source, 100);
    const utm_medium = str(body.utm_medium, 100);
    const utm_campaign = str(body.utm_campaign, 100);
    const utm_content = str(body.utm_content, 100);
    const utm_term = str(body.utm_term, 100);

    // Resolve platform workspace (first workspace) so admins can find these submissions
    let workspaceId: string | null = null;
    const ownerEnv = Deno.env.get("OWNER_USER_ID");
    if (ownerEnv) {
      const { data: m } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", ownerEnv)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      workspaceId = m?.workspace_id ?? null;
    }
    if (!workspaceId) {
      const { data: w } = await supabase
        .from("workspaces")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      workspaceId = w?.id ?? null;
    }

    // Threshold for high-intent classification — configurable via roi_calculator_settings.
    const defaultHighOpp: Record<string, number> = { GBP: 1000, USD: 1000, EUR: 1000, NGN: 1_900_000 };
    const defaultHighAdmin: Record<string, number> = { GBP: 500, USD: 500, EUR: 500, NGN: 950_000 };
    let highOpp = defaultHighOpp;
    let highAdmin = defaultHighAdmin;
    try {
      const { data: settings } = await supabase
        .from("roi_calculator_settings")
        .select("high_opportunity_thresholds, high_admin_thresholds")
        .eq("id", "global")
        .maybeSingle();
      if (settings?.high_opportunity_thresholds && typeof settings.high_opportunity_thresholds === "object") {
        highOpp = { ...defaultHighOpp, ...(settings.high_opportunity_thresholds as Record<string, number>) };
      }
      if (settings?.high_admin_thresholds && typeof settings.high_admin_thresholds === "object") {
        highAdmin = { ...defaultHighAdmin, ...(settings.high_admin_thresholds as Record<string, number>) };
      }
    } catch (_) { /* fall back to defaults */ }

    const isHighIntent =
      estimated_monthly_opportunity >= highOpp[currency] ||
      inputs.leads_per_month >= 100 ||
      inputs.missed_follow_up_percentage >= 30;

    const intentTags: string[] = ["roi-calculator-lead"];
    if (isHighIntent) intentTags.push("high-intent");
    if (estimated_monthly_opportunity >= highOpp[currency]) intentTags.push("high-roi-opportunity");
    if (manual_admin_cost >= highAdmin[currency]) intentTags.push("manual-process-heavy");
    if (inputs.missed_follow_up_percentage >= 25) intentTags.push("follow-up-gap");

    // --- Upsert CRM lead (dedupe by email within workspace) ---
    let leadId: string | null = null;
    let ownerId: string | null = null;
    if (workspaceId) {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("owner_user_id")
        .eq("id", workspaceId)
        .maybeSingle();
      ownerId = ws?.owner_user_id ?? ownerEnv ?? null;

      const { data: existing } = await supabase
        .from("leads")
        .select("id, tags, user_id")
        .eq("workspace_id", workspaceId)
        .ilike("email", email)
        .maybeSingle();

      const now = new Date().toISOString();
      const summary = [
        `ROI Calculator submission (${currency})`,
        `Leads/mo: ${inputs.leads_per_month}, ACV: ${inputs.average_customer_value}`,
        `Conv: ${inputs.conversion_rate}%, Missed FU: ${inputs.missed_follow_up_percentage}%`,
        `Est monthly opportunity: ${estimated_monthly_opportunity.toFixed(2)} ${currency}`,
        `Est annual opportunity: ${estimated_annual_opportunity.toFixed(2)} ${currency}`,
        preferred_contact_method ? `Prefers: ${preferred_contact_method}` : "",
        business_type ? `Type: ${business_type}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      if (existing) {
        const mergedTags = Array.from(new Set([...(existing.tags || []), ...intentTags]));
        await supabase
          .from("leads")
          .update({
            updated_at: now,
            last_activity_at: now,
            tags: mergedTags,
            ...(full_name ? { full_name } : {}),
            ...(phone ? { phone } : {}),
            notes: summary,
          })
          .eq("id", existing.id);
        leadId = existing.id;
        if (existing.user_id) ownerId = existing.user_id;
      } else {
        // Round-robin assignment
        let assignedOwnerId: string | null = null;
        try {
          const { data: rr } = await supabase.rpc("assign_next_round_robin", {
            _workspace_id: workspaceId,
          });
          if (typeof rr === "string") assignedOwnerId = rr;
        } catch { /* ignore */ }

        const { data: newLead } = await supabase
          .from("leads")
          .insert({
            user_id: ownerId,
            workspace_id: workspaceId,
            full_name,
            email,
            phone,
            source: "ROI Savings Calculator",
            status: isHighIntent ? "Hot" : "New",
            score: isHighIntent ? 85 : 30,
            tags: intentTags,
            notes: summary,
            last_activity_at: now,
            pipeline_stage: "new_lead",
            assigned_owner_id: assignedOwnerId,
          })
          .select("id")
          .maybeSingle();
        leadId = newLead?.id ?? null;
      }

      if (leadId) {
        await supabase.from("lead_activities").insert({
          lead_id: leadId,
          user_id: ownerId,
          workspace_id: workspaceId,
          type: "form_submit",
          meta: {
            source: "roi_savings_calculator",
            currency,
            inputs,
            results: {
              estimated_monthly_opportunity,
              estimated_annual_opportunity,
              recoverable_revenue,
              manual_admin_cost,
            },
            preferred_contact_method,
            business_type,
            business_name,
          },
        });
      }

      // High-intent sales notification
      if (isHighIntent) {
        await supabase.from("notifications").insert({
          workspace_id: workspaceId,
          user_id: ownerId,
          title: "New High-Value ROI Calculator Lead",
          body: `${full_name} (${business_name ?? "—"}) · Est monthly opportunity ${estimated_monthly_opportunity.toFixed(0)} ${currency} · Prefers ${preferred_contact_method ?? "email"}`,
          type: "lead_hot",
          meta: {
            lead_id: leadId,
            email,
            phone,
            estimated_monthly_opportunity,
            estimated_annual_opportunity,
            preferred_contact_method,
          },
        });
      }
    }

    // --- Persist submission row ---
    const { data: submission, error: subErr } = await supabase
      .from("roi_calculator_submissions")
      .insert({
        workspace_id: workspaceId,
        contact_id: leadId,
        full_name,
        email,
        phone,
        business_name,
        business_type,
        preferred_contact_method,
        currency,
        leads_per_month: inputs.leads_per_month,
        average_customer_value: inputs.average_customer_value,
        conversion_rate: inputs.conversion_rate,
        missed_follow_up_percentage: inputs.missed_follow_up_percentage,
        manual_follow_up_hours: inputs.manual_follow_up_hours,
        staff_cost_per_hour: inputs.staff_cost_per_hour,
        monthly_software_cost: inputs.monthly_software_cost,
        estimated_current_customers: current_customers,
        estimated_current_revenue: current_monthly_revenue,
        estimated_missed_leads: missed_leads,
        estimated_recoverable_customers: recoverable_customers,
        estimated_recoverable_revenue: recoverable_revenue,
        estimated_manual_admin_cost: manual_admin_cost,
        estimated_monthly_opportunity,
        estimated_annual_opportunity,
        recommendation,
        lead_status: isHighIntent ? "high_intent" : "new",
        consent,
        source: "roi_savings_calculator",
        utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      })
      .select("id")
      .maybeSingle();

    if (subErr) {
      console.error("[roi-calculator-submit] insert failed:", subErr);
      return new Response(
        JSON.stringify({ error: "Failed to save submission. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Fire "roi_calculator_submitted" trigger into automations + workflows engines ---
    if (workspaceId && leadId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const execUrl = `${supabaseUrl}/functions/v1/execute-automation`;
      const enrollUrl = `${supabaseUrl}/functions/v1/enroll-workflow`;
      const eventContext = {
        submission_id: submission?.id,
        currency,
        business_type,
        preferred_contact_method,
        estimated_monthly_opportunity,
        estimated_annual_opportunity,
        recoverable_revenue,
        manual_admin_cost,
        high_intent: isHighIntent,
      };

      try {
        const { data: matched } = await supabase
          .from("automations")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("trigger_type", "roi_calculator_submitted")
          .eq("status", "active");
        for (const auto of matched ?? []) {
          fetch(execUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${svcKey}` },
            body: JSON.stringify({
              automation_id: auto.id,
              lead_id: leadId,
              workspace_id: workspaceId,
              event_context: eventContext,
            }),
          }).catch((e) => console.error("[roi-calculator-submit] dispatch automation failed:", e));
        }
      } catch (e) {
        console.error("[roi-calculator-submit] automations lookup failed:", e);
      }

      fetch(enrollUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${svcKey}` },
        body: JSON.stringify({
          workspace_id: workspaceId,
          lead_ids: [leadId],
          event_type: "roi_calculator_submitted",
          event_config: eventContext,
        }),
      }).catch((e) => console.error("[roi-calculator-submit] enroll-workflow failed:", e));
    }


    return new Response(
      JSON.stringify({
        success: true,
        submission_id: submission?.id,
        lead_id: leadId,
        high_intent: isHighIntent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[roi-calculator-submit] error:", err);
    return new Response(JSON.stringify({ error: "Unexpected server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
