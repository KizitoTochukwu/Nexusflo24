import {
  LayoutDashboard, Plug, Megaphone, GitCompareArrows, Workflow, Settings2,
  type LucideIcon,
} from "lucide-react";

export type AdsNavItem = {
  key: string;
  label: string;
  /** Path suffix appended to /dashboard/:workspaceId/ */
  path: string;
  icon: LucideIcon;
};

/** Primary sections shown as pills on desktop. */
export const ADS_PRIMARY_NAV: AdsNavItem[] = [
  { key: "overview", label: "Overview", path: "ads/overview", icon: LayoutDashboard },
  { key: "accounts", label: "Connected Accounts", path: "ads/accounts", icon: Plug },
  { key: "campaigns", label: "Campaigns", path: "ads/campaigns", icon: Megaphone },
  { key: "attribution", label: "Lead Attribution", path: "ads/attribution", icon: GitCompareArrows },
];

/** Secondary sections tucked into the "More" menu. */
export const ADS_SECONDARY_NAV: AdsNavItem[] = [
  { key: "automations", label: "Ad Lead Automations", path: "ads/automations", icon: Workflow },
  { key: "settings", label: "Ad Settings", path: "ads/settings", icon: Settings2 },
];

export const ADS_ALL_NAV = [...ADS_PRIMARY_NAV, ...ADS_SECONDARY_NAV];

/** Resolve the active Ads section from a pathname. Longest path match wins. */
export function resolveAdsSection(pathname: string): AdsNavItem | undefined {
  return [...ADS_ALL_NAV]
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) => pathname.includes(`/${item.path}`));
}
