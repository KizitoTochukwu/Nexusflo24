// AI Client Finder — data providers (Apollo discovery, Hunter verification).
// All provider keys stay server-side. Nothing here fabricates rows: if a provider
// is not configured or returns nothing, the caller is told so honestly.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  adminClient, cfCors, cfJson, checkEntitlement, logUsage, requireMember,
} from "../_shared/client-finder.ts";
import {
  apolloConfigured, apolloHealth, apolloSearchAccess, apolloSearchCompanies, apolloSearchContacts,
} from "../_shared/prospect-providers/apollo.ts";
import { hunterConfigured, hunterHealth, hunterVerifyEmail } from "../_shared/prospect-providers/hunter.ts";

const CAPABILITIES = [
  { capability: "Company discovery", provider: "apollo", secret_name: "APOLLO_API_KEY" },
  { capability: "Contact discovery", provider: "apollo", secret_name: "APOLLO_API_KEY" },
  { capability: "Email verification", provider: "hunter", secret_name: "HUNTER_API_KEY" },
];

const cleanDomain = (v: unknown) =>
  String(v ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "") || null;

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
  const { userId } = gate;
  const action: string = body.action ?? "";

  /* ------------------------------ Live status ------------------------------ */
  if (action === "status") {
    let apollo = apolloConfigured() ? await apolloHealth() : { ok: false, error: "No API key configured." };
    // A valid key is not enough — Apollo's Free plan blocks the search endpoints.
    if (apollo.ok) apollo = await apolloSearchAccess();
    const hunter = hunterConfigured() ? await hunterHealth() : { ok: false, error: "No API key configured." };
    const now = new Date().toISOString();

    for (const cap of CAPABILITIES) {
      const health = cap.provider === "apollo" ? apollo : hunter;
      const { data: existing } = await admin
        .from("prospecting_provider_connections")
        .select("id")
        .eq("capability", cap.capability)
        .is("workspace_id", null)
        .maybeSingle();

      const row = {
        workspace_id: null,
        provider: cap.provider,
        capability: cap.capability,
        scope: "platform",
        secret_name: cap.secret_name,
        status: health.ok ? "connected" : "not_configured",
        last_error: health.ok ? null : health.error ?? null,
        last_checked_at: now,
      };
      if (existing) await admin.from("prospecting_provider_connections").update(row).eq("id", existing.id);
      else await admin.from("prospecting_provider_connections").insert(row);
    }

    return cfJson({
      ok: true,
      checked_at: now,
      providers: {
        apollo: { configured: apolloConfigured(), ...apollo },
        hunter: { configured: hunterConfigured(), ...hunter },
      },
    });
  }

  /* --------------------------- Company discovery --------------------------- */
  if (action === "discover_companies") {
    if (!apolloConfigured()) {
      return cfJson({
        error: "Company discovery is not configured on this platform. Use CSV import instead.",
        not_configured: true,
      }, 409);
    }
    const icpId: string | null = body.icp_id ?? null;
    const limit = Math.min(Math.max(Number(body.limit ?? 25), 1), 50);

    const allowance = await checkEntitlement(admin, workspaceId, "discoveries", limit);
    if (allowance) return allowance;

    let keywords: string[] = Array.isArray(body.keywords) ? body.keywords.slice(0, 10) : [];
    let locations: string[] = Array.isArray(body.locations) ? body.locations.slice(0, 10) : [];
    let employeeRanges: string[] = Array.isArray(body.employee_ranges) ? body.employee_ranges.slice(0, 5) : [];

    if (icpId) {
      const { data: icp } = await admin
        .from("ideal_customer_profiles")
        .select("*").eq("id", icpId).eq("workspace_id", workspaceId).maybeSingle();
      if (!icp) return cfJson({ error: "That ideal customer profile was not found." }, 404);
      if (icp.approval_status !== "approved") {
        return cfJson({ error: "Approve the ideal customer profile before searching with it." }, 400);
      }
      if (!keywords.length) {
        keywords = [
          ...(Array.isArray(icp.industries) ? icp.industries : []),
          ...(Array.isArray(icp.sub_industries) ? icp.sub_industries : []),
          ...(Array.isArray(icp.technologies) ? icp.technologies : []),
        ].filter(Boolean).slice(0, 10);
      }
      if (!locations.length && Array.isArray(icp.countries)) locations = icp.countries.filter(Boolean).slice(0, 10);
    }

    let found: Awaited<ReturnType<typeof apolloSearchCompanies>>;
    try {
      found = await apolloSearchCompanies({
        keywords, locations, employee_ranges: employeeRanges, per_page: limit,
      });
    } catch (e) {
      await logUsage(admin, {
        workspace_id: workspaceId, user_id: userId, operation: "discovery",
        provider: "apollo", units: 0, status: "error", error_category: "provider_error",
      });
      return cfJson({ error: (e as Error).message }, 502);
    }

    let created = 0, duplicates = 0;
    const now = new Date().toISOString();
    for (const c of found) {
      const domain = cleanDomain(c.domain);
      if (domain) {
        const { data: existing } = await admin
          .from("prospect_companies").select("id")
          .eq("workspace_id", workspaceId).eq("domain", domain).is("archived_at", null).maybeSingle();
        if (existing) { duplicates++; continue; }
      }
      const { data: inserted, error } = await admin.from("prospect_companies").insert({
        workspace_id: workspaceId, created_by: userId, icp_id: icpId,
        name: c.name, domain, website_url: c.website_url ?? (domain ? `https://${domain}` : null),
        industry: c.industry, country: c.country, city: c.city,
        employee_count: c.employee_count, employee_range: c.employee_range,
        description: c.description, technologies: c.technologies,
        data_source: "apollo", source_reference: c.source_reference, data_freshness_at: now,
      }).select("id").maybeSingle();
      if (error || !inserted) continue;
      created++;

      await admin.from("prospect_sources").insert({
        workspace_id: workspaceId, company_id: inserted.id, provider: "apollo",
        source_url: c.website_url, source_title: c.name, retrieved_at: now, result_status: "ok",
      });
      await logUsage(admin, {
        workspace_id: workspaceId, user_id: userId, operation: "discovery", provider: "apollo",
        related_table: "prospect_companies", related_id: inserted.id, units: 1, status: "ok",
      });
    }

    return cfJson({ ok: true, returned: found.length, created, duplicates });
  }

  /* --------------------------- Contact discovery --------------------------- */
  if (action === "discover_contacts") {
    if (!apolloConfigured()) {
      return cfJson({
        error: "Contact discovery is not configured on this platform. Use CSV import instead.",
        not_configured: true,
      }, 409);
    }
    const companyIds: string[] = Array.isArray(body.company_ids) ? body.company_ids.slice(0, 10) : [];
    if (!companyIds.length) return cfJson({ error: "Select at least one company." }, 400);
    const perCompany = Math.min(Math.max(Number(body.per_company ?? 3), 1), 10);

    const allowance = await checkEntitlement(admin, workspaceId, "discoveries", companyIds.length * perCompany);
    if (allowance) return allowance;

    const { data: companies } = await admin
      .from("prospect_companies").select("id, name, domain")
      .eq("workspace_id", workspaceId).in("id", companyIds).is("archived_at", null);
    const withDomain = (companies ?? []).filter((c) => !!c.domain);
    if (!withDomain.length) {
      return cfJson({ error: "None of the selected companies have a website domain to search on." }, 400);
    }

    const byDomain = new Map(withDomain.map((c) => [String(c.domain).toLowerCase(), c.id]));
    let found: Awaited<ReturnType<typeof apolloSearchContacts>>;
    try {
      found = await apolloSearchContacts({
        domains: [...byDomain.keys()],
        titles: Array.isArray(body.titles) ? body.titles.slice(0, 10) : undefined,
        seniorities: Array.isArray(body.seniorities) ? body.seniorities.slice(0, 10) : undefined,
        per_page: Math.min(withDomain.length * perCompany, 100),
      });
    } catch (e) {
      await logUsage(admin, {
        workspace_id: workspaceId, user_id: userId, operation: "discovery",
        provider: "apollo", units: 0, status: "error", error_category: "provider_error",
      });
      return cfJson({ error: (e as Error).message }, 502);
    }

    let created = 0, duplicates = 0, withoutEmail = 0;
    const now = new Date().toISOString();
    const perCompanyCount: Record<string, number> = {};

    for (const p of found) {
      const companyId = p.company_domain ? byDomain.get(p.company_domain) ?? null : null;
      if (!companyId) continue;
      perCompanyCount[companyId] = (perCompanyCount[companyId] ?? 0) + 1;
      if (perCompanyCount[companyId] > perCompany) continue;

      if (p.email) {
        const { data: existing } = await admin
          .from("prospect_contacts").select("id")
          .eq("workspace_id", workspaceId).eq("email", p.email).is("archived_at", null).maybeSingle();
        if (existing) { duplicates++; continue; }
      } else {
        withoutEmail++;
      }

      const { data: inserted, error } = await admin.from("prospect_contacts").insert({
        workspace_id: workspaceId, company_id: companyId, created_by: userId,
        full_name: p.full_name, first_name: p.first_name, last_name: p.last_name,
        job_title: p.job_title, seniority: p.seniority, department: p.department,
        country: p.country, linkedin_url: p.linkedin_url, email: p.email,
        email_status: p.email ? "not_checked" : "missing",
        data_source: "apollo", source_reference: p.source_reference, data_freshness_at: now,
      }).select("id").maybeSingle();
      if (error || !inserted) continue;
      created++;

      await admin.from("prospect_sources").insert({
        workspace_id: workspaceId, company_id: companyId, contact_id: inserted.id,
        provider: "apollo", source_url: p.linkedin_url, source_title: p.full_name,
        retrieved_at: now, result_status: p.email ? "ok" : "email_locked",
      });
      await logUsage(admin, {
        workspace_id: workspaceId, user_id: userId, operation: "discovery", provider: "apollo",
        related_table: "prospect_contacts", related_id: inserted.id, units: 1, status: "ok",
      });
    }

    return cfJson({ ok: true, returned: found.length, created, duplicates, without_email: withoutEmail });
  }

  /* --------------------------- Email verification --------------------------- */
  if (action === "verify_emails") {
    if (!hunterConfigured()) {
      return cfJson({
        error: "Email verification is not configured on this platform.",
        not_configured: true,
      }, 409);
    }
    const contactIds: string[] = Array.isArray(body.contact_ids) ? body.contact_ids.slice(0, 25) : [];
    if (!contactIds.length) return cfJson({ error: "Select at least one contact." }, 400);

    const { data: contacts } = await admin
      .from("prospect_contacts").select("id, email")
      .eq("workspace_id", workspaceId).in("id", contactIds).is("archived_at", null);
    const targets = (contacts ?? []).filter((c) => !!c.email);
    if (!targets.length) return cfJson({ error: "None of the selected contacts have an email address." }, 400);

    const allowance = await checkEntitlement(admin, workspaceId, "verifications", targets.length);
    if (allowance) return allowance;

    const counts: Record<string, number> = { deliverable: 0, risky: 0, undeliverable: 0, unknown: 0 };
    let failed = 0;

    for (const c of targets) {
      try {
        const v = await hunterVerifyEmail(String(c.email));
        counts[v.result] = (counts[v.result] ?? 0) + 1;
        await admin.from("prospect_contacts").update({
          email_status: v.result,
          email_confidence: v.confidence,
          email_verified_at: new Date().toISOString(),
          do_not_contact: v.result === "undeliverable",
        }).eq("id", c.id);
        await admin.from("email_verifications").insert({
          workspace_id: workspaceId, contact_id: c.id, email: c.email,
          provider: "hunter", result: v.result, confidence: v.confidence, raw: v.raw,
        });
        await logUsage(admin, {
          workspace_id: workspaceId, user_id: userId, operation: "verification", provider: "hunter",
          related_table: "prospect_contacts", related_id: c.id, units: 1, status: "ok",
        });
      } catch (e) {
        failed++;
        console.error("hunter verification failed", (e as Error).message);
        await logUsage(admin, {
          workspace_id: workspaceId, user_id: userId, operation: "verification", provider: "hunter",
          related_table: "prospect_contacts", related_id: c.id, units: 0,
          status: "error", error_category: "provider_error",
        });
      }
    }

    return cfJson({ ok: true, checked: targets.length, failed, results: counts });
  }

  return cfJson({ error: `Unknown action: ${action}` }, 400);
});
