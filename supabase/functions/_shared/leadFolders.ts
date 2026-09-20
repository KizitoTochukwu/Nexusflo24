// Shared lead → folder routing.
//
// Filing order (identical for every intake path):
//   1. Folder explicitly chosen on the form / funnel / dialog / webhook payload
//   2. Matching active lead_routing_rules
//   3. Workspace default folder (lead_folders.is_default)
//   4. "Uncategorized" as a last resort
//
// Every new assignment fires `lead_added_to_folder` automations once.

export async function fireFolderAutomations(
  supabase: any,
  workspaceId: string,
  leadId: string,
  folderId: string,
) {
  try {
    const { data: autos } = await supabase
      .from("automations")
      .select("id, trigger_config")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .eq("trigger_type", "lead_added_to_folder");

    const matched = (autos ?? []).filter((a: any) => {
      const cfgFolder = (a.trigger_config ?? {}).folder_id;
      if (!cfgFolder) return true; // any folder
      return String(cfgFolder) === String(folderId);
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    for (const auto of matched) {
      fetch(`${supabaseUrl}/functions/v1/execute-automation`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${anonKey}` },
        body: JSON.stringify({ automation_id: auto.id, workspace_id: workspaceId, lead_id: leadId }),
      }).catch((e) => console.error("[leadFolders] automation dispatch failed:", String(e)));
    }
  } catch (e) {
    console.error("[leadFolders] fireFolderAutomations error:", String(e));
  }
}

async function assign(
  supabase: any,
  workspaceId: string,
  leadId: string,
  folderId: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from("lead_folder_leads")
    .select("id")
    .eq("lead_id", leadId)
    .eq("folder_id", folderId)
    .maybeSingle();
  if (existing) return;

  const { error } = await supabase
    .from("lead_folder_leads")
    .insert({ workspace_id: workspaceId, folder_id: folderId, lead_id: leadId });
  if (error) {
    console.error("[leadFolders] assign failed:", error.message);
    return;
  }
  await fireFolderAutomations(supabase, workspaceId, leadId, folderId);
}

async function findOrCreateFolder(
  supabase: any,
  workspaceId: string,
  ownerId: string,
  name: string,
  color: string,
): Promise<string | null> {
  const { data: found } = await supabase
    .from("lead_folders")
    .select("id")
    .eq("workspace_id", workspaceId)
    .ilike("name", name)
    .maybeSingle();
  if (found) return found.id;

  const { data: created, error } = await supabase
    .from("lead_folders")
    .insert({ workspace_id: workspaceId, user_id: ownerId, name, color })
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[leadFolders] folder create failed:", error.message);
    return null;
  }
  return created?.id ?? null;
}

export type RouteLeadOptions = {
  workspaceId: string;
  leadId: string;
  ownerId: string;
  /** Folder explicitly chosen by the form / funnel / payload. */
  folderId?: string | null;
  folderName?: string | null;
  /** Values used to evaluate routing rules. */
  source?: string | null;
  campaignName?: string | null;
  funnelName?: string | null;
  tags?: string[];
};

export async function routeLeadToFolders(supabase: any, opts: RouteLeadOptions): Promise<string[]> {
  const { workspaceId, leadId, ownerId } = opts;
  const assigned: string[] = [];

  try {
    // 1. Explicit destination
    if (opts.folderId) {
      await assign(supabase, workspaceId, leadId, opts.folderId);
      assigned.push(opts.folderId);
    } else if (opts.folderName && opts.folderName.trim()) {
      const id = await findOrCreateFolder(
        supabase, workspaceId, ownerId, opts.folderName.trim(), "#0B1F3B",
      );
      if (id) { await assign(supabase, workspaceId, leadId, id); assigned.push(id); }
    }

    // 2. Routing rules
    const { data: rules } = await supabase
      .from("lead_routing_rules")
      .select("folder_id, match_field, match_value")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true);

    const tags = (opts.tags ?? []).map((t) => String(t).toLowerCase());
    const src = (opts.source ?? "").toLowerCase();
    const camp = (opts.campaignName ?? "").toLowerCase();
    const funnel = (opts.funnelName ?? "").toLowerCase();

    for (const rule of rules ?? []) {
      const value = String(rule.match_value ?? "").toLowerCase();
      if (!value) continue;
      const matches =
        (rule.match_field === "source" && src === value) ||
        (rule.match_field === "campaign_name" && camp === value) ||
        (rule.match_field === "funnel_name" && funnel === value) ||
        (rule.match_field === "tag" && tags.includes(value));
      if (matches && !assigned.includes(rule.folder_id)) {
        await assign(supabase, workspaceId, leadId, rule.folder_id);
        assigned.push(rule.folder_id);
      }
    }

    if (assigned.length) return assigned;

    // Already filed by another path (e.g. CSV import)?
    const { data: anyFolder } = await supabase
      .from("lead_folder_leads")
      .select("folder_id")
      .eq("lead_id", leadId)
      .limit(1)
      .maybeSingle();
    if (anyFolder) return [anyFolder.folder_id];

    // 3. Workspace default folder
    const { data: defaultFolder } = await supabase
      .from("lead_folders")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("is_default", true)
      .maybeSingle();
    if (defaultFolder) {
      await assign(supabase, workspaceId, leadId, defaultFolder.id);
      return [defaultFolder.id];
    }

    // 4. Uncategorized
    const uncatId = await findOrCreateFolder(
      supabase, workspaceId, ownerId, "Uncategorized", "#94A3B8",
    );
    if (uncatId) {
      await assign(supabase, workspaceId, leadId, uncatId);
      return [uncatId];
    }
  } catch (e) {
    console.error("[leadFolders] routing error:", String(e));
  }

  return assigned;
}
