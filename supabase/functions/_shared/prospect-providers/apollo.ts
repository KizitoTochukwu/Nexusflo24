// Apollo.io adapter — company and contact (decision-maker) discovery.
// Server-only. The API key is read from the edge function environment.

const APOLLO_BASE = "https://api.apollo.io/api/v1";

export function apolloConfigured(): boolean {
  return !!Deno.env.get("APOLLO_API_KEY");
}

async function apollo(path: string, body: Record<string, unknown>) {
  const key = Deno.env.get("APOLLO_API_KEY");
  if (!key) throw new Error("Apollo is not configured on this platform.");
  const res = await fetch(`${APOLLO_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-api-key": key,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Apollo request failed (${res.status}): ${text.slice(0, 400)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Apollo returned a response that could not be read.");
  }
}

/** Cheap credential probe that does not consume search credits. */
export async function apolloHealth(): Promise<{ ok: boolean; error?: string }> {
  const key = Deno.env.get("APOLLO_API_KEY");
  if (!key) return { ok: false, error: "No API key configured." };
  try {
    const res = await fetch(`${APOLLO_BASE}/auth/health`, {
      headers: { Accept: "application/json", "x-api-key": key },
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, error: `Apollo rejected the key (${res.status}): ${text.slice(0, 200)}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export interface CompanyQuery {
  keywords?: string[];
  industries?: string[];
  locations?: string[];
  employee_ranges?: string[]; // Apollo format e.g. "11,50"
  page?: number;
  per_page?: number;
}

export interface DiscoveredCompany {
  name: string;
  domain: string | null;
  website_url: string | null;
  industry: string | null;
  country: string | null;
  city: string | null;
  employee_count: number | null;
  employee_range: string | null;
  description: string | null;
  technologies: string[];
  source_reference: string | null;
}

export async function apolloSearchCompanies(q: CompanyQuery): Promise<DiscoveredCompany[]> {
  const data = await apollo("/mixed_companies/search", {
    q_organization_keyword_tags: q.keywords?.length ? q.keywords : undefined,
    organization_industry_tag_ids: undefined,
    q_organization_name: undefined,
    organization_locations: q.locations?.length ? q.locations : undefined,
    organization_num_employees_ranges: q.employee_ranges?.length ? q.employee_ranges : undefined,
    page: q.page ?? 1,
    per_page: Math.min(q.per_page ?? 25, 100),
  });

  const rows: any[] = data.organizations ?? data.accounts ?? [];
  return rows.map((o) => ({
    name: String(o.name ?? "").trim() || "Unknown company",
    domain: (o.primary_domain ?? o.website_url ?? "")
      .toString()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .toLowerCase() || null,
    website_url: o.website_url ?? null,
    industry: o.industry ?? null,
    country: o.country ?? null,
    city: o.city ?? null,
    employee_count: typeof o.estimated_num_employees === "number" ? o.estimated_num_employees : null,
    employee_range: null,
    description: o.short_description ?? null,
    technologies: Array.isArray(o.technology_names) ? o.technology_names.slice(0, 25) : [],
    source_reference: o.id ? `apollo:organization:${o.id}` : null,
  }));
}

export interface ContactQuery {
  domains: string[];
  titles?: string[];
  seniorities?: string[];
  per_page?: number;
}

export interface DiscoveredContact {
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  seniority: string | null;
  department: string | null;
  country: string | null;
  linkedin_url: string | null;
  email: string | null;
  email_locked: boolean;
  company_domain: string | null;
  source_reference: string | null;
}

const LOCKED_EMAIL = /email_not_unlocked|not_unlocked/i;

export async function apolloSearchContacts(q: ContactQuery): Promise<DiscoveredContact[]> {
  const data = await apollo("/mixed_people/search", {
    q_organization_domains_list: q.domains,
    person_titles: q.titles?.length ? q.titles : undefined,
    person_seniorities: q.seniorities?.length ? q.seniorities : undefined,
    page: 1,
    per_page: Math.min(q.per_page ?? 10, 100),
  });

  const rows: any[] = data.people ?? data.contacts ?? [];
  return rows.map((p) => {
    const rawEmail = typeof p.email === "string" ? p.email : "";
    const locked = !rawEmail || LOCKED_EMAIL.test(rawEmail);
    return {
      full_name: String(p.name ?? `${p.first_name ?? ""} ${p.last_name ?? ""}`).trim() || "Unknown contact",
      first_name: p.first_name ?? null,
      last_name: p.last_name ?? null,
      job_title: p.title ?? null,
      seniority: p.seniority ?? null,
      department: Array.isArray(p.departments) ? p.departments[0] ?? null : null,
      country: p.country ?? null,
      linkedin_url: p.linkedin_url ?? null,
      email: locked ? null : rawEmail.toLowerCase(),
      email_locked: locked,
      company_domain: (p.organization?.primary_domain ?? "").toString().toLowerCase() || null,
      source_reference: p.id ? `apollo:person:${p.id}` : null,
    };
  });
}
