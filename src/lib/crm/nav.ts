import {
  Building2, Contact2, Handshake, ListChecks, Users, GitBranch,
  FileText, Settings2, Tags, PieChart, Gauge, Route as RouteIcon, type LucideIcon,
} from "lucide-react";


export type CrmNavItem = {
  key: string;
  label: string;
  /** Path suffix appended to /dashboard/:workspaceId/ */
  path: string;
  icon: LucideIcon;
};

/** Primary sections shown as tabs on desktop. */
export const CRM_PRIMARY_NAV: CrmNavItem[] = [
  { key: "contacts", label: "Contacts", path: "crm/contacts", icon: Contact2 },
  { key: "companies", label: "Companies", path: "crm/companies", icon: Building2 },
  { key: "leads", label: "Leads", path: "leads", icon: Users },
  { key: "deals", label: "Deals", path: "crm/deals", icon: Handshake },
  { key: "tasks", label: "Tasks", path: "crm/tasks", icon: ListChecks },
  { key: "pipelines", label: "Pipelines", path: "crm/pipelines", icon: GitBranch },
];

/** Secondary sections tucked into the "More" menu. */
export const CRM_SECONDARY_NAV: CrmNavItem[] = [
  { key: "import-export", label: "Import & Export", path: "crm/import-export", icon: FileText },
  { key: "fields", label: "Custom Fields", path: "crm/fields", icon: Settings2 },
  { key: "tags", label: "Tags", path: "crm/tags", icon: Tags },
  { key: "lead-scoring", label: "Lead Scoring Settings", path: "crm/lead-scoring", icon: Gauge },
  { key: "insights", label: "CRM Insights", path: "crm/insights", icon: PieChart },
  { key: "settings", label: "CRM Settings", path: "crm/settings", icon: Settings2 },
];

export const CRM_ALL_NAV = [...CRM_PRIMARY_NAV, ...CRM_SECONDARY_NAV];

/** Resolve the active CRM section from a pathname. Longest path match wins. */
export function resolveCrmSection(pathname: string): CrmNavItem | undefined {
  return [...CRM_ALL_NAV]
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) => pathname.includes(`/${item.path}`));
}
