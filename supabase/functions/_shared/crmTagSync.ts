/**
 * Keeps automation tagging aligned with the CRM.
 *
 * Automations tag leads, but the CRM surfaces tags on the canonical contact and
 * in the workspace tag library. Without this sync, automation tags never show
 * up on contact records or in CRM Settings → Tags usage counts.
 */

type Client = any;

export async function ensureWorkspaceTag(
  supabase: Client,
  workspaceId: string,
  tag: string,
): Promise<void> {
  const name = String(tag || "").trim();
  if (!workspaceId || !name) return;
  try {
    const { data } = await supabase
      .from("crm_tags")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("name", name)
      .maybeSingle();
    if (!data) {
      await supabase
        .from("crm_tags")
        .insert({ workspace_id: workspaceId, name, color: "#C9A227", description: "Created by automation" });
    }
  } catch (_e) {
    // Tag library upkeep must never break automation execution.
  }
}

/**
 * Applies a tag change to the lead's linked canonical contact (if any) and
 * registers the tag in the workspace library when adding.
 */
export async function syncTagToContact(
  supabase: Client,
  opts: { workspaceId: string; leadId?: string | null; contactId?: string | null; tag: string; mode: "add" | "remove" },
): Promise<void> {
  const tag = String(opts.tag || "").trim();
  if (!tag || !opts.workspaceId) return;

  if (opts.mode === "add") await ensureWorkspaceTag(supabase, opts.workspaceId, tag);

  try {
    let contactId = opts.contactId ?? null;
    if (!contactId && opts.leadId) {
      const { data: lead } = await supabase
        .from("leads")
        .select("contact_id")
        .eq("id", opts.leadId)
        .maybeSingle();
      contactId = (lead as any)?.contact_id ?? null;
    }
    if (!contactId) return;

    const { data: contact } = await supabase
      .from("contacts")
      .select("tags")
      .eq("id", contactId)
      .maybeSingle();
    if (!contact) return;

    const current: string[] = ((contact as any).tags ?? []) as string[];
    const next =
      opts.mode === "add"
        ? Array.from(new Set([...current, tag]))
        : current.filter((t) => t !== tag);
    if (next.length === current.length && opts.mode === "remove") return;

    await supabase.from("contacts").update({ tags: next }).eq("id", contactId);
  } catch (_e) {
    // Non-fatal: contact mirroring should never fail the automation step.
  }
}
