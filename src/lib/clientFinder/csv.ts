/** CSV parsing for AI Client Finder prospect imports. */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export const IMPORT_FIELDS = [
  { key: "company_name", label: "Company name", required: true },
  { key: "domain", label: "Website domain" },
  { key: "industry", label: "Industry" },
  { key: "country", label: "Country" },
  { key: "city", label: "City" },
  { key: "employee_range", label: "Employee range" },
  { key: "description", label: "Company description" },
  { key: "contact_name", label: "Contact full name" },
  { key: "job_title", label: "Job title" },
  { key: "email", label: "Work email" },
  { key: "linkedin_url", label: "LinkedIn URL" },
] as const;

export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]["key"];

const ALIASES: Record<ImportFieldKey, string[]> = {
  company_name: ["company", "company name", "organisation", "organization", "account"],
  domain: ["domain", "website", "url", "company domain", "website url"],
  industry: ["industry", "sector", "vertical"],
  country: ["country", "location country"],
  city: ["city", "town", "location"],
  employee_range: ["employees", "employee range", "size", "company size", "headcount"],
  description: ["description", "about", "summary"],
  contact_name: ["name", "full name", "contact", "contact name", "person"],
  job_title: ["title", "job title", "role", "position"],
  email: ["email", "work email", "email address"],
  linkedin_url: ["linkedin", "linkedin url", "linkedin profile"],
};

/** Best-effort header → field mapping; the user can always override it. */
export function autoMapHeaders(headers: string[]): Record<number, ImportFieldKey | ""> {
  const map: Record<number, ImportFieldKey | ""> = {};
  headers.forEach((h, i) => {
    const norm = h.trim().toLowerCase();
    const hit = (Object.keys(ALIASES) as ImportFieldKey[]).find(
      (key) => key === norm || ALIASES[key].includes(norm),
    );
    map[i] = hit ?? "";
  });
  return map;
}

export const SAMPLE_CSV =
  "company_name,domain,industry,country,city,employee_range,contact_name,job_title,email,linkedin_url\n" +
  "Example Ltd,example.com,Professional services,United Kingdom,London,11-50,Jane Doe,Operations Director,jane@example.com,https://www.linkedin.com/in/example\n";
