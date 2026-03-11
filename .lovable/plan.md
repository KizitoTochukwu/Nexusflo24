

# Enhanced Multi-Tenant CRM Architecture for NexusFlo24

## Assessment

Much of the requested functionality already exists: lead folders, scoring bands, AI qualification, activity timeline, notes, communication history, tags, UTM tracking, duplicate detection, and folder-based filtering. The key gaps are:

1. **Pipeline stages** — current statuses are simple (New/Warm/Hot/Won/Lost); need full sales pipeline
2. **Lead Destination Settings** — funnels/forms don't route leads to folders or apply tags automatically
3. **Assigned owner** — leads don't have an owner field
4. **Lead tasks** — no task entity per lead
5. **Automatic routing rules** — no auto-folder-assignment based on source/campaign/tags
6. **Smart lists** — no saved filter presets
7. **Pipeline Kanban view** — only table view exists
8. **Enhanced filters** — missing campaign, funnel, owner filters

This is too large for a single implementation. I recommend a phased approach, starting with the highest-impact changes.

---

## Phase 1: Pipeline Stages + Enhanced Lead Model (this implementation)

### Database Changes

**Migration 1** — Add `pipeline_stage`, `assigned_owner_id`, `campaign_name`, `funnel_name` columns to `leads` table:

```sql
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS pipeline_stage text NOT NULL DEFAULT 'new_lead',
  ADD COLUMN IF NOT EXISTS assigned_owner_id uuid,
  ADD COLUMN IF NOT EXISTS campaign_name text,
  ADD COLUMN IF NOT EXISTS funnel_name text;
```

Pipeline stages: `new_lead`, `contacted`, `engaged`, `qualified`, `demo_booked`, `proposal_sent`, `won`, `lost`

**Migration 2** — Create `lead_tasks` table:

```sql
CREATE TABLE public.lead_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  due_date timestamptz,
  is_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace lead_tasks" ON public.lead_tasks
  FOR SELECT TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can insert workspace lead_tasks" ON public.lead_tasks
  FOR INSERT TO authenticated WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can update workspace lead_tasks" ON public.lead_tasks
  FOR UPDATE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())))
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can delete workspace lead_tasks" ON public.lead_tasks
  FOR DELETE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
```

**Migration 3** — Create `lead_routing_rules` table for automatic folder routing:

```sql
CREATE TABLE public.lead_routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  folder_id uuid NOT NULL,
  match_field text NOT NULL, -- 'source', 'campaign_name', 'funnel_name', 'tag'
  match_value text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_routing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage workspace routing_rules" ON public.lead_routing_rules
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())))
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
```

### Frontend Changes

**1. Update Lead Types & Hooks** (`src/hooks/useLeads.ts`)
- Add `pipeline_stage`, `assigned_owner_id`, `campaign_name`, `funnel_name` to `Lead` type
- Add pipeline stage filter to `LeadFilters`

**2. New Hook** (`src/hooks/useLeadTasks.ts`)
- CRUD for lead tasks with workspace-aware queries

**3. Pipeline Kanban View** (`src/components/leads/PipelineView.tsx`)
- Horizontal scrolling columns for each pipeline stage
- Drag indicator on cards (actual drag-drop deferred to Phase 2)
- Click to move between stages
- Navy/gold/white branded cards

**4. Enhanced Leads Page** (`src/pages/dashboard/DashboardLeads.tsx`)
- Add toggle between Table View and Pipeline View
- Add pipeline stage filter dropdown
- Add assigned owner filter (pulls workspace members)

**5. Enhanced Lead Details Drawer** (`src/components/leads/LeadDetailsDrawer.tsx`)
- Add pipeline stage selector with visual stage indicator
- Add Tasks section with add/complete/delete
- Add assigned owner selector
- Show campaign_name and funnel_name if present

**6. Enhanced Add/Edit Lead Dialog** (`src/components/leads/AddLeadDialog.tsx`)
- Add pipeline_stage field
- Add assigned_owner selector (workspace members dropdown)

**7. Folder Routing Rules UI** (`src/components/leads/FolderPanel.tsx`)
- Add "Auto-Route" option in folder dropdown menu
- Simple dialog to create rules: "When [source/campaign/tag] equals [value], add to this folder"

**8. Lead Destination Settings in Funnel Builder** (`src/components/funnels/FunnelStepEditor.tsx`)
- Add collapsible "Lead Destination Settings" section on optin steps
- Fields: Save to Folder (dropdown), Apply Tags (input), Set Source, Set Pipeline Stage
- Store in `page_content.lead_destination` JSON

**9. Update `capture-lead` Edge Function**
- Read lead_destination config from the funnel step
- Apply folder assignment, tags, pipeline stage, campaign/funnel name on capture

### UI Design

- Pipeline stages rendered as colored pills matching the navy/gold palette
- Kanban columns with subtle gradient headers
- Stage badges: New Lead (blue), Contacted (indigo), Engaged (purple), Qualified (amber), Demo Booked (gold), Proposal Sent (orange), Won (green), Lost (gray)

---

## Phase 2 (future)
- Drag-and-drop Kanban with real-time updates
- Smart lists (saved filter presets)
- Advanced routing rules engine with multiple conditions
- Lead Destination Settings in campaign wizard
- Automation trigger from routing rules

---

## File Summary

| Action | File |
|--------|------|
| Migrate | 3 SQL migrations (leads columns, lead_tasks, lead_routing_rules) |
| Modify | `src/hooks/useLeads.ts` — extended types + filters |
| Create | `src/hooks/useLeadTasks.ts` |
| Create | `src/hooks/useLeadRouting.ts` |
| Create | `src/components/leads/PipelineView.tsx` |
| Modify | `src/pages/dashboard/DashboardLeads.tsx` — view toggle + filters |
| Modify | `src/components/leads/LeadDetailsDrawer.tsx` — tasks, pipeline, owner |
| Modify | `src/components/leads/AddLeadDialog.tsx` — pipeline + owner fields |
| Modify | `src/components/leads/FolderPanel.tsx` — routing rules UI |
| Modify | `src/components/funnels/FunnelStepEditor.tsx` — lead destination |
| Modify | `supabase/functions/capture-lead/index.ts` — apply destination config |

