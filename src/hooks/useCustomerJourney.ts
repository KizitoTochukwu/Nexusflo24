import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Customer journey surfaces (Phase 7).
 *
 * Everything here reads from the canonical metric layer (`crm_metric_snapshot`)
 * or from canonical contact tables — no parallel counting logic.
 */

export type DuplicateCandidate = {
  id: string;
  workspace_id: string;
  contact_id: string;
  duplicate_contact_id: string;
  match_reason: string;
  confidence: number | null;
  status: string;
  created_at: string;
  contact?: DuplicateContactInfo | null;
  duplicate?: DuplicateContactInfo | null;
};

export type DuplicateContactInfo = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  lifecycle_stage: string | null;
  created_at: string;
};

const CONTACT_FIELDS = "id, first_name, last_name, email, phone, lifecycle_stage, created_at";

const normEmail = (v?: string | null) => (v || "").trim().toLowerCase() || null;
const normPhone = (v?: string | null) => {
  const digits = (v || "").replace(/[^\d+]/g, "");
  return digits.length >= 7 ? digits.replace(/^00/, "+") : null;
};

/** Pending duplicate candidates with both contact records hydrated. */
export function useDuplicateCandidates(workspaceId?: string) {
  return useQuery({
    queryKey: ["crm-duplicates", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<DuplicateCandidate[]> => {
      const { data, error } = await supabase
        .from("contact_duplicate_candidates")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("status", "pending")
        .order("confidence", { ascending: false })
        .limit(100);
      if (error) throw error;
      const rows = (data || []) as any[];
      const ids = Array.from(
        new Set(rows.flatMap((r) => [r.contact_id, r.duplicate_contact_id])),
      );
      if (!ids.length) return [];
      const { data: contacts, error: cErr } = await supabase
        .from("contacts")
        .select(CONTACT_FIELDS)
        .in("id", ids);
      if (cErr) throw cErr;
      const map = new Map<string, DuplicateContactInfo>();
      (contacts || []).forEach((c: any) => map.set(c.id, c));
      return rows.map((r) => ({
        ...r,
        contact: map.get(r.contact_id) || null,
        duplicate: map.get(r.duplicate_contact_id) || null,
      })) as DuplicateCandidate[];
    },
  });
}

/**
 * Scans canonical contacts for exact email / phone collisions and records any
 * new pairs as pending candidates. Read-only for contacts — nothing is merged.
 */
export function useScanDuplicates(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace selected");
      const { data, error } = await supabase
        .from("contacts")
        .select(CONTACT_FIELDS)
        .eq("workspace_id", workspaceId)
        .limit(5000);
      if (error) throw error;
      const contacts = (data || []) as DuplicateContactInfo[];

      const byEmail = new Map<string, string[]>();
      const byPhone = new Map<string, string[]>();
      contacts.forEach((c) => {
        const e = normEmail(c.email);
        if (e) byEmail.set(e, [...(byEmail.get(e) || []), c.id]);
        const p = normPhone(c.phone);
        if (p) byPhone.set(p, [...(byPhone.get(p) || []), c.id]);
      });

      const pairs = new Map<string, { a: string; b: string; reason: string; confidence: number }>();
      const collect = (groups: Map<string, string[]>, reason: string, confidence: number) => {
        groups.forEach((ids) => {
          if (ids.length < 2) return;
          const sorted = [...ids].sort();
          for (let i = 0; i < sorted.length; i++) {
            for (let j = i + 1; j < sorted.length; j++) {
              const key = `${sorted[i]}:${sorted[j]}`;
              if (!pairs.has(key)) pairs.set(key, { a: sorted[i], b: sorted[j], reason, confidence });
            }
          }
        });
      };
      collect(byEmail, "same_email", 0.95);
      collect(byPhone, "same_phone", 0.8);

      if (!pairs.size) return { found: 0, created: 0 };

      const { data: existing } = await supabase
        .from("contact_duplicate_candidates")
        .select("contact_id, duplicate_contact_id")
        .eq("workspace_id", workspaceId);
      const seen = new Set(
        (existing || []).map((r: any) => [r.contact_id, r.duplicate_contact_id].sort().join(":")),
      );

      const rows = Array.from(pairs.values())
        .filter((p) => !seen.has(`${p.a}:${p.b}`))
        .map((p) => ({
          workspace_id: workspaceId,
          contact_id: p.a,
          duplicate_contact_id: p.b,
          match_reason: p.reason,
          confidence: p.confidence,
          status: "pending",
        }));

      if (rows.length) {
        const { error: insErr } = await supabase.from("contact_duplicate_candidates").insert(rows);
        if (insErr) throw insErr;
      }
      return { found: pairs.size, created: rows.length };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-duplicates", workspaceId] });
    },
  });
}

/** Marks a candidate as reviewed without touching either contact record. */
export function useResolveDuplicate(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("contact_duplicate_candidates")
        .update({
          status: "dismissed",
          resolved_at: new Date().toISOString(),
          resolved_by: auth?.user?.id ?? null,
          resolution_note: note ?? "Reviewed — kept both records",
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-duplicates", workspaceId] });
    },
  });
}
