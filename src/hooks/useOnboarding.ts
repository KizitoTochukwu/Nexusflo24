import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface OnboardingAnswers {
  business_name?: string;
  website?: string;
  country?: string;
  industry?: string;
  team_size?: string;
  goals?: string[];
  contacts_imported?: boolean;
  email_connected?: boolean;
  calendar_connected?: boolean;
  team_invited?: boolean;
  pipeline_stages?: string[];
  pipeline_configured?: boolean;
  [key: string]: unknown;
}

export interface OnboardingRecord {
  id: string;
  user_id: string;
  workspace_id: string | null;
  current_step: number;
  completed: boolean;
  completed_at: string | null;
  answers: OnboardingAnswers;
  skipped_steps: string[];
  checklist_dismissed: boolean;
  checklist_minimized: boolean;
  tour_completed: boolean;
}

export const ONBOARDING_STEPS = [
  { id: "welcome", title: "Welcome to NexusFlo24", hint: "A quick tour of what you can set up in the next few minutes." },
  { id: "business", title: "Business details", hint: "We use this to personalise templates, sender names and reporting." },
  { id: "industry", title: "Select industry", hint: "Your industry shapes the campaign and automation templates we suggest." },
  { id: "team_size", title: "Select team size", hint: "This helps us pre-configure lead routing and team permissions." },
  { id: "goals", title: "Choose primary goals", hint: "Pick what matters most — we'll highlight the right tools first." },
  { id: "contacts", title: "Import contacts", hint: "Bring your existing contacts in now, or skip and do it later." },
  { id: "email", title: "Connect email", hint: "Required to send campaigns, automations and booking confirmations." },
  { id: "calendar", title: "Connect calendar", hint: "Sync availability so bookings never double-book your day." },
  { id: "team", title: "Invite team members", hint: "Give colleagues access to the CRM, campaigns and inbox." },
  { id: "pipeline", title: "Configure your sales pipeline", hint: "Name the stages your deals move through in the CRM." },
  { id: "launch", title: "Launch dashboard", hint: "You're set — review your answers and jump into NexusFlo24." },
] as const;

export const TOTAL_STEPS = ONBOARDING_STEPS.length;

const table = () => (supabase as any).from("user_onboarding");

export function useOnboarding(workspaceId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["onboarding", user?.id, workspaceId ?? null],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<OnboardingRecord | null> => {
      if (!user) return null;
      let query = table().select("*").eq("user_id", user.id);
      query = workspaceId ? query.eq("workspace_id", workspaceId) : query.is("workspace_id", null);
      const { data, error } = await query.maybeSingle();
      if (error) {
        console.error("[onboarding] fetch failed", error);
        return null;
      }
      if (!data) return null;
      return {
        ...data,
        answers: (data.answers ?? {}) as OnboardingAnswers,
        skipped_steps: Array.isArray(data.skipped_steps) ? data.skipped_steps : [],
      } as OnboardingRecord;
    },
  });
}

export function useSaveOnboarding(workspaceId?: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (patch: Partial<Omit<OnboardingRecord, "id" | "user_id" | "workspace_id">>) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await table()
        .upsert(
          { user_id: user.id, workspace_id: workspaceId ?? null, ...patch },
          { onConflict: "user_id,workspace_id" }
        )
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding", user?.id, workspaceId ?? null] });
      qc.invalidateQueries({ queryKey: ["getting-started"] });
    },
  });
}

/**
 * Records a Getting Started milestone (e.g. contacts_imported) against the
 * current user's onboarding record and refreshes the checklist.
 */
export function useMarkOnboardingFlag(workspaceId?: string | null) {
  const { data: onboarding } = useOnboarding(workspaceId);
  const save = useSaveOnboarding(workspaceId);

  return (key: keyof OnboardingAnswers, value: unknown = true) => {
    const answers = onboarding?.answers ?? {};
    if (answers[key] === value) return;
    save.mutate({ answers: { ...answers, [key]: value } } as any);
  };
}

/* ── Getting Started checklist ───────────────────────────── */

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  done: boolean;
  actionLabel: string;
  to?: string;
}

async function count(tableName: string, build: (q: any) => any): Promise<number> {
  try {
    const { count: c, error } = await build(
      (supabase as any).from(tableName).select("id", { count: "exact", head: true })
    );
    if (error) return 0;
    return c ?? 0;
  } catch {
    return 0;
  }
}

/** True when the workspace has at least one pipeline that actually has stages. */
async function hasConfiguredPipeline(workspaceId: string): Promise<boolean> {
  try {
    const { data, error } = await (supabase as any)
      .from("crm_pipelines")
      .select("id")
      .eq("workspace_id", workspaceId);
    if (error) return false;
    const ids = (data ?? []).map((r: any) => r.id);
    if (!ids.length) return false;
    const { count: c, error: stageError } = await (supabase as any)
      .from("crm_pipeline_stages")
      .select("id", { count: "exact", head: true })
      .in("pipeline_id", ids);
    if (stageError) return false;
    return (c ?? 0) > 0;
  } catch {
    return false;
  }
}


export function useGettingStarted(workspaceId: string) {
  const { user } = useAuth();
  const { data: onboarding } = useOnboarding(workspaceId);

  const query = useQuery({
    queryKey: ["getting-started", workspaceId, user?.id],
    enabled: !!user && !!workspaceId,
    staleTime: 60_000,
    queryFn: async () => {
      const ws = (q: any) => q.eq("workspace_id", workspaceId);
      const [
        leads,
        importedLeads,
        contacts,
        emailSenders,
        activeEmailSetup,
        campaigns,
        automations,
        bookingPages,
        invites,
        members,
        calendars,
        pipeline,
      ] = await Promise.all([
        count("leads", ws),
        count("leads", (q) => ws(q).ilike("source", "%import%")),
        count("contacts", ws),
        count("sender_profiles", (q) => ws(q).eq("channel", "email")),
        count("email_settings", (q) => ws(q).eq("is_active", true)),
        count("campaigns", ws),
        count("automations", ws),
        count("booking_pages", ws),
        count("workspace_invites", ws),
        count("workspace_members", ws),
        count("google_calendar_tokens", (q) => q.eq("user_id", user!.id)),
        hasConfiguredPipeline(workspaceId),
      ]);
      return {
        leads,
        // A bulk list is "imported" whether it came through the leads CSV
        // importer or the CRM Import & Export page.
        imported: importedLeads + contacts,
        // Email can be connected via a sending setup or an email sender profile.
        senders: emailSenders + activeEmailSetup,
        campaigns,
        automations,
        bookingPages,
        invites,
        members,
        calendars,
        pipeline,
      };
    },
  });

  const s = query.data;
  const answers = onboarding?.answers ?? {};
  const base = `/dashboard/${workspaceId}`;

  const items: ChecklistItem[] = [
    {
      id: "first_contact",
      label: "Add your first contact",
      description: "Create a lead manually to see how the CRM works.",
      done: (s?.leads ?? 0) > 0,
      actionLabel: "Add contact",
      to: `${base}/leads`,
    },
    {
      id: "import_contacts",
      label: "Import contacts",
      description: "Upload a CSV to bring your existing list into NexusFlo24.",
      done: (s?.imported ?? 0) > 0 || Boolean(answers.contacts_imported),
      actionLabel: "Import CSV",
      to: `${base}/leads`,
    },
    {
      id: "connect_email",
      label: "Connect email",
      description: "Add a verified sender so campaigns and automations can send.",
      done: (s?.senders ?? 0) > 0 || Boolean(answers.email_connected),
      actionLabel: "Connect",
      to: `${base}/settings/senders`,
    },
    {
      id: "connect_calendar",
      label: "Connect calendar",
      description: "Sync Google Calendar so bookings respect your availability.",
      done: (s?.calendars ?? 0) > 0 || Boolean(answers.calendar_connected),
      actionLabel: "Connect",
      to: `${base}/bookings`,
    },
    {
      id: "create_pipeline",
      label: "Create your pipeline",
      description: "Set the stages your deals move through in the CRM.",
      done: Boolean(s?.pipeline) || Boolean(answers.pipeline_configured),
      actionLabel: "Configure",
      to: `${base}/crm/pipelines`,

    },
    {
      id: "invite_team",
      label: "Invite a team member",
      description: "Collaborate with your team inside the same workspace.",
      done: (s?.invites ?? 0) > 0 || (s?.members ?? 0) > 1 || Boolean(answers.team_invited),
      actionLabel: "Invite",
      to: `${base}/settings/team`,
    },
    {
      id: "first_workflow",
      label: "Build your first workflow",
      description: "Automate follow-up the moment a lead comes in.",
      done: (s?.automations ?? 0) > 0,
      actionLabel: "Build",
      to: `${base}/automations`,
    },
    {
      id: "first_campaign",
      label: "Launch your first campaign",
      description: "Send an email, WhatsApp or SMS broadcast to your list.",
      done: (s?.campaigns ?? 0) > 0,
      actionLabel: "Create",
      to: `${base}/campaigns`,
    },
    {
      id: "booking_page",
      label: "Create a booking page",
      description: "Let leads book time with you straight from your funnels.",
      done: (s?.bookingPages ?? 0) > 0,
      actionLabel: "Create",
      to: `${base}/bookings`,
    },
  ];

  const completed = items.filter((i) => i.done).length;
  const percent = Math.round((completed / items.length) * 100);

  return { items, completed, total: items.length, percent, isLoading: query.isLoading };
}
