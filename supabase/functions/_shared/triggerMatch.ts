// Canonical enrolment-trigger matching logic.
//
// This file is the single source of truth used by BOTH runtimes:
//   - Edge functions (enroll-workflow-leads, triggerDispatch, test-workflow-trigger)
//   - The browser app (re-exported from src/lib/workflows/triggerMatch.ts)
//
// It must stay dependency-free and must not use Deno or browser globals.

export type ScopeValue = string | number | { id?: string; value?: string; label?: string } | null | undefined;

/** Scope keys resolved from the EVENT payload (what happened). */
export const EVENT_SCOPE_KEYS = [
  "form_id",
  "funnel_id",
  "funnel_page_id",
  "funnel_step_id",
  "funnel_form_id",
  "folder_id",
  "tag",
  "store_id",
  "shop_product_id",
  "campaign_id",
  "calendar_id",
  "booking_type",
  "appointment_status",
  "meta_connection_id",
  "meta_ad_account_id",
  "meta_page_id",
  "meta_form_id",
  "meta_campaign_id",
  "meta_adset_id",
  "meta_ad_id",
  "webhook_path",
] as const;

/** Scope keys resolved from the RECORD (who it happened to). */
export const RECORD_SCOPE_KEYS = ["owner", "assigned_user", "lead_source", "tags"] as const;

/** Every key the matcher understands. Anything else in trigger_config is a
 *  setting (e.g. booking_link) and is deliberately ignored when matching. */
export const ALL_SCOPE_KEYS: string[] = [
  ...EVENT_SCOPE_KEYS,
  ...RECORD_SCOPE_KEYS,
  "threshold",
];

/** Reads the comparable id out of a scope value ("" when "any"). */
export function scopeValueId(v: ScopeValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    const id = (v as any).id ?? (v as any).value ?? "";
    return String(id ?? "").trim();
  }
  const s = String(v).trim();
  if (s === "__any__") return "";
  return s;
}

export function scopeValueLabel(v: ScopeValue): string {
  if (v && typeof v === "object") return String((v as any).label ?? (v as any).id ?? (v as any).value ?? "");
  return v === null || v === undefined ? "" : String(v);
}

/** True when the scope value means "any value". */
export function scopeIsAny(v: ScopeValue): boolean {
  return scopeValueId(v) === "";
}

const eq = (a: unknown, b: unknown) =>
  String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

function recordTagList(record: Record<string, any> | null | undefined): string[] {
  const tags = record?.tags;
  return Array.isArray(tags) ? tags.map((t) => String(t).toLowerCase()) : [];
}

function recordOwnerIds(record: Record<string, any> | null | undefined): string[] {
  return [record?.assigned_owner_id, record?.owner_user_id, record?.user_id]
    .filter(Boolean)
    .map((v) => String(v));
}

export interface ScopeMatchResult {
  matched: boolean;
  /** Key that caused the mismatch, for diagnostics. */
  failedKey?: string;
  reason?: string;
}

/**
 * Evaluates a trigger's scope configuration against the event payload and the
 * record being enrolled.
 *
 * Rules:
 *  - "any"/blank scope values always pass.
 *  - Event-scoped keys only narrow when the event carries that key. When the
 *    event omits the key entirely, the caller may supply a resolver (used for
 *    funnel association lookups) — otherwise the scope is treated as unmet so a
 *    narrowed trigger never fires outside its scope.
 *  - Record-scoped keys are compared against the record.
 *  - Unknown keys in trigger_config are ignored (they are settings, not scope).
 */
export function matchTriggerScope(params: {
  triggerConfig: Record<string, any> | null | undefined;
  eventConfig?: Record<string, any> | null;
  record?: Record<string, any> | null;
  /** Optional escape hatch for scope keys the event didn't carry (async work
   *  is done by the caller and passed in as already-resolved booleans). */
  resolvedKeys?: Record<string, boolean>;
  /** Test mode: there is no real event, so event-scoped keys are assumed met. */
  assumeScopeSatisfied?: boolean;
}): ScopeMatchResult {
  const cfg = params.triggerConfig || {};
  const event = params.eventConfig || {};
  const record = params.record || null;
  const resolved = params.resolvedKeys || {};
  const assume = params.assumeScopeSatisfied === true;

  for (const key of Object.keys(cfg)) {
    if (!ALL_SCOPE_KEYS.includes(key)) continue; // setting, not scope
    const want = cfg[key] as ScopeValue;
    if (scopeIsAny(want)) continue;
    const wanted = scopeValueId(want);

    if (key === "threshold") {
      const score = event.score ?? record?.score;
      if (score === undefined || score === null || Number(score) < Number(wanted)) {
        return { matched: false, failedKey: key, reason: `Score ${score ?? "unknown"} is below ${wanted}` };
      }
      continue;
    }

    if ((RECORD_SCOPE_KEYS as readonly string[]).includes(key)) {
      if (key === "tags") {
        const wantedTags = wanted.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
        const have = recordTagList(record);
        if (!wantedTags.some((t) => have.includes(t))) {
          return { matched: false, failedKey: key, reason: `Record does not have tag ${wanted}` };
        }
        continue;
      }
      if (key === "lead_source") {
        if (!eq(record?.source, wanted)) {
          return { matched: false, failedKey: key, reason: `Source is ${record?.source ?? "unset"}` };
        }
        continue;
      }
      // owner / assigned_user
      if (!recordOwnerIds(record).some((id) => eq(id, wanted))) {
        return { matched: false, failedKey: key, reason: "Record has a different owner" };
      }
      continue;
    }

    // Event-scoped key
    const eventValue = event[key];
    if (eventValue === undefined || eventValue === null || eventValue === "") {
      if (resolved[key] === true || assume) continue;
      return { matched: false, failedKey: key, reason: `Event did not carry ${key}` };
    }
    if (key === "shop_product_id" && Array.isArray(eventValue)) {
      if (!eventValue.map(String).includes(wanted)) {
        return { matched: false, failedKey: key, reason: "Order does not contain that product" };
      }
      continue;
    }
    if (!eq(eventValue, wanted)) {
      return { matched: false, failedKey: key, reason: `${key} did not match` };
    }
  }

  return { matched: true };
}

// ---------------------------------------------------------------------------
// Additional filters
// ---------------------------------------------------------------------------

export interface FilterCondition { property: string; operator: string; value?: string }
export interface FilterGroup { combinator?: "AND" | "OR"; conditions?: FilterCondition[] }

/** Operator aliases so triggers saved with older keys keep working. */
const OPERATOR_ALIASES: Record<string, string> = {
  eq: "equals",
  neq: "not_equals",
  ncontains: "not_contains",
  known: "exists",
  unknown: "not_exists",
  in: "in",
  nin: "not_in",
};

export function normaliseOperator(op: string): string {
  return OPERATOR_ALIASES[op] ?? op;
}

/** Property aliases so friendly names resolve to real record columns. */
const PROPERTY_ALIASES: Record<string, string> = {
  name: "full_name",
  full_name: "full_name",
  first_name: "full_name",
  owner: "assigned_owner_id",
  lead_source: "source",
};

export function resolveProperty(record: Record<string, any> | null | undefined, property: string): unknown {
  if (!record) return undefined;
  const key = PROPERTY_ALIASES[property] ?? property;
  if (key in record) return (record as any)[key];
  if (property in record) return (record as any)[property];
  return undefined;
}

function compare(record: Record<string, any> | null | undefined, c: FilterCondition): boolean {
  const raw = resolveProperty(record, c.property);
  const op = normaliseOperator(String(c.operator || "equals"));
  const l = raw === undefined || raw === null ? "" : raw;
  const v = c.value === undefined || c.value === null ? "" : c.value;
  const list = () => String(v).split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const tags = recordTagList(record);
  switch (op) {
    case "equals": return String(l).toLowerCase() === String(v).toLowerCase();
    case "not_equals": return String(l).toLowerCase() !== String(v).toLowerCase();
    case "contains": return String(l).toLowerCase().includes(String(v).toLowerCase());
    case "not_contains": return !String(l).toLowerCase().includes(String(v).toLowerCase());
    case "exists": return l !== "" && l !== null && l !== undefined;
    case "not_exists": return l === "" || l === null || l === undefined;
    case "gt": return Number(l) > Number(v);
    case "lt": return Number(l) < Number(v);
    case "gte": return Number(l) >= Number(v);
    case "lte": return Number(l) <= Number(v);
    case "in": return list().includes(String(l).toLowerCase());
    case "not_in": return !list().includes(String(l).toLowerCase());
    case "has_tag": return tags.includes(String(v).toLowerCase());
    case "not_has_tag": return !tags.includes(String(v).toLowerCase());
    case "before": return new Date(String(l)).getTime() < new Date(String(v)).getTime();
    case "after": return new Date(String(l)).getTime() > new Date(String(v)).getTime();
    default: return true;
  }
}

export interface FilterResult {
  passed: boolean;
  failed?: FilterCondition;
  reason?: string;
}

/** Groups are combined with AND; conditions inside a group use the combinator. */
export function evaluateFilterGroups(
  record: Record<string, any> | null | undefined,
  groups: FilterGroup[] | null | undefined,
): FilterResult {
  if (!Array.isArray(groups) || groups.length === 0) return { passed: true };
  for (const group of groups) {
    const conds = Array.isArray(group?.conditions) ? group.conditions : [];
    const usable = conds.filter((c) => c && c.property);
    if (usable.length === 0) continue;
    const combinator = String(group?.combinator || "AND").toUpperCase();
    const evaluated = usable.map((c) => ({ c, ok: compare(record, c) }));
    const passed = combinator === "OR" ? evaluated.some((e) => e.ok) : evaluated.every((e) => e.ok);
    if (!passed) {
      const failed = (evaluated.find((e) => !e.ok) || evaluated[0]).c;
      return {
        passed: false,
        failed,
        reason: `Filter failed: ${failed.property} ${failed.operator}${failed.value ? ` ${failed.value}` : ""}`,
      };
    }
  }
  return { passed: true };
}

// ---------------------------------------------------------------------------
// Re-enrolment
// ---------------------------------------------------------------------------

export interface ReenrolmentConfig {
  mode?: string;
  wait_amount?: number;
  wait_unit?: string;
}

export interface LastRun {
  started_at?: string | null;
  status?: string | null;
  /** Whether the record newly matches the trigger now (for conditions_true_again). */
  matched_last_time?: boolean | null;
}

const UNIT_MS: Record<string, number> = {
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
  weeks: 604_800_000,
};

/**
 * Decides whether a record that has run before may run again.
 * `never` blocks, `every_event` allows, `after_wait` allows once the wait has
 * elapsed, and `conditions_true_again` allows when the record did NOT match at
 * the time of the previous run (i.e. it has newly become matching again).
 */
export function canReEnrol(
  config: ReenrolmentConfig | null | undefined,
  last: LastRun | null | undefined,
  legacyAllow = false,
): boolean {
  if (!last) return true;
  const mode = String(config?.mode || (legacyAllow ? "every_event" : "never"));
  switch (mode) {
    case "every_event":
    case "on_status_change":
      return true;
    case "after_wait": {
      const waitMs = Number(config?.wait_amount || 0) * (UNIT_MS[String(config?.wait_unit || "hours")] ?? UNIT_MS.hours);
      const started = last.started_at ? new Date(last.started_at).getTime() : 0;
      return Date.now() - started >= waitMs;
    }
    case "conditions_true_again":
      // The record ran before; it may run again only if it stopped matching in
      // between. Callers pass matched_last_time=false once the record fell out
      // of scope. Unknown history is treated as "allowed" only when the last
      // run already finished.
      if (last.matched_last_time === false) return true;
      return last.status != null && last.status !== "active";
    case "never":
    default:
      return false;
  }
}
