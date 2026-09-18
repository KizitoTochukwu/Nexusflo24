import {
  LayoutDashboard, Bot, PhoneCall, Hash, BookOpen, Settings2,
  type LucideIcon,
} from "lucide-react";

export type VoiceNavItem = {
  key: string;
  label: string;
  /** Path suffix appended to /dashboard/:workspaceId/ */
  path: string;
  icon: LucideIcon;
};

export const VOICE_NAV: VoiceNavItem[] = [
  { key: "overview", label: "Overview", path: "voice/overview", icon: LayoutDashboard },
  { key: "assistants", label: "Assistants", path: "voice/assistants", icon: Bot },
  { key: "calls", label: "Call Inbox", path: "voice/calls", icon: PhoneCall },
  { key: "numbers", label: "Phone Numbers", path: "voice/numbers", icon: Hash },
  { key: "knowledge", label: "Knowledge", path: "voice/knowledge", icon: BookOpen },
  { key: "settings", label: "Settings", path: "voice/settings", icon: Settings2 },
];

/** Resolve the active Voice section from a pathname. Longest path match wins. */
export function resolveVoiceSection(pathname: string): VoiceNavItem | undefined {
  return [...VOICE_NAV]
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) => pathname.includes(`/${item.path}`));
}
