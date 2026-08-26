import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Canonical metric layer.
 *
 * Every surface (Dashboard, CRM, Analytics, Forms, Bookings, Automations,
 * Commerce) should read its headline numbers from here instead of running its
 * own count query, so the same metric never disagrees between pages.
 *
 * Definitions live with the SQL function `crm_metric_snapshot`:
 *  - contacts: canonical people, deduped by id, merged/archived excluded
 *  - leads: acquisition records, dated by created_at
 *  - deals: open by status; won/lost by closed_at inside the window
 *  - bookings: dated by start_time; show rate = completed / (completed + no_show)
 *  - orders: paid_at only, revenue net of refunds, minor units
 *  - open/click rate: over delivered + sent campaign messages in the window
 */
export type CrmMetricSnapshot = {
  window: { from: string; to: string };
  contacts_total: number;
  contacts_new: number;
  contacts_mql: number;
  contacts_sql: number;
  contacts_opportunity: number;
  contacts_customers: number;
  leads_total: number;
  leads_new: number;
  leads_unlinked: number;
  deals_open: number;
  deals_open_value: number;
  deals_weighted_value: number;
  deals_won: number;
  deals_won_value: number;
  deals_lost: number;
  tasks_open: number;
  tasks_overdue: number;
  form_submissions: number;
  form_unique_contacts: number;
  form_unlinked: number;
  bookings_total: number;
  bookings_upcoming: number;
  bookings_completed: number;
  bookings_cancelled: number;
  bookings_no_show: number;
  bookings_show_rate: number | null;
  enrolments_total: number;
  enrolments_active: number;
  enrolments_completed: number;
  enrolments_failed: number;
  orders_paid: number;
  revenue_minor: number;
  orders_unlinked: number;
  messages_delivered: number;
  open_rate: number | null;
  click_rate: number | null;
};

export function useCrmMetrics(workspaceId?: string, days = 30) {
  return useQuery({
    queryKey: ["crm-metrics", workspaceId, days],
    queryFn: async (): Promise<CrmMetricSnapshot> => {
      const to = new Date();
      const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
      const { data, error } = await supabase.rpc("crm_metric_snapshot" as any, {
        _workspace_id: workspaceId,
        _from: from.toISOString(),
        _to: to.toISOString(),
      });
      if (error) throw error;
      return data as unknown as CrmMetricSnapshot;
    },
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
}

/** Formats a minor-unit revenue figure (pence/cents) for display. */
export function formatMinor(amount: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format((amount ?? 0) / 100);
}
