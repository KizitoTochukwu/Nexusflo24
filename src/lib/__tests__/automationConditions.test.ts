import { describe, it, expect } from "vitest";
import {
  isConditionRowComplete,
  conditionRowsFromConfig,
  findIncompleteConditionSteps,
  phraseCondition,
  phraseConditionGroup,
  findConditionOption,
  CONDITION_GROUPS,
  type ConditionRow,
} from "@/hooks/useAutomations";

describe("condition completeness", () => {
  it("treats an unset condition as incomplete", () => {
    expect(isConditionRowComplete({ condition: "" })).toBe(false);
  });

  it("requires a value when the operator needs one", () => {
    expect(isConditionRowComplete({ condition: "lead_status", operator: "equals", value: "" })).toBe(false);
    expect(isConditionRowComplete({ condition: "lead_status", operator: "equals", value: "Qualified" })).toBe(true);
  });

  it("does not require a value for known/unknown or happened checks", () => {
    expect(isConditionRowComplete({ condition: "owner_assigned", operator: "is_known" })).toBe(true);
    expect(isConditionRowComplete({ condition: "replied_any", operator: "not_happened" })).toBe(true);
    expect(isConditionRowComplete({ condition: "marketing_consent", operator: "is_true" })).toBe(true);
  });

  it("requires both ends of a between range", () => {
    expect(isConditionRowComplete({ condition: "opportunity_value", operator: "between", value: "100" })).toBe(false);
    expect(isConditionRowComplete({ condition: "opportunity_value", operator: "between", value: "100", value_to: "500" })).toBe(true);
  });

  it("requires a field for the contact field condition", () => {
    expect(isConditionRowComplete({ condition: "contact_field", operator: "equals", value: "UK" })).toBe(false);
    expect(isConditionRowComplete({ condition: "contact_field", field: "country_of_residence", operator: "equals", value: "UK" })).toBe(true);
  });
});

describe("config normalisation", () => {
  it("reads new rows", () => {
    const rows = conditionRowsFromConfig({ conditions: [{ condition: "has_tag", operator: "equals", value: "customer" }] });
    expect(rows).toHaveLength(1);
    expect(rows[0].condition).toBe("has_tag");
  });

  it("reads the legacy single-row shape", () => {
    const rows = conditionRowsFromConfig({ condition: "score_gt", operator: "greater_than", value: "50" });
    expect(rows[0].value).toBe("50");
  });

  it("returns nothing when unconfigured", () => {
    expect(conditionRowsFromConfig({})).toHaveLength(0);
  });
});

describe("step validation", () => {
  it("flags condition steps that cannot run", () => {
    const steps = [
      { step_type: "trigger", config: {} },
      { step_type: "condition", config: {} },
      { step_type: "condition", config: { conditions: [{ condition: "lead_status", operator: "equals", value: "" }] } },
      { step_type: "condition", config: { conditions: [{ condition: "lead_status", operator: "equals", value: "Won" }] } },
    ];
    const bad = findIncompleteConditionSteps(steps);
    expect(bad).toHaveLength(2);
    expect(bad[0].reason).toBe("No condition chosen");
    expect(bad[1].reason).toBe("A condition is missing its value");
  });
});

describe("plain-English phrasing", () => {
  it("phrases a contact field rule", () => {
    const row: ConditionRow = { condition: "contact_field", field: "service_interest", operator: "contains", value: "Groceries" };
    expect(phraseCondition(row)).toBe('Service interest contains "Groceries"');
  });

  it("phrases yes/no rules", () => {
    expect(phraseCondition({ condition: "marketing_consent", operator: "is_true" })).toMatch(/yes$/);
    expect(phraseCondition({ condition: "unsubscribed", operator: "is_false" })).toMatch(/no$/);
  });

  it("phrases timing rules", () => {
    expect(phraseCondition({ condition: "days_since_created", operator: "greater_than", value: "7" })).toBe("Days since created > 7");
  });

  it("joins rows with the chosen logic", () => {
    const rows: ConditionRow[] = [
      { condition: "lead_status", operator: "equals", value: "Won" },
      { condition: "marketing_consent", operator: "is_true" },
    ];
    expect(phraseConditionGroup(rows, "OR")).toContain("OR");
  });
});

describe("catalogue", () => {
  it("exposes the new CRM condition groups", () => {
    const labels = CONDITION_GROUPS.map((g) => g.label);
    for (const l of ["Contact details", "Tags", "Replies & consent", "Opportunity", "Timing"]) {
      expect(labels).toContain(l);
    }
  });

  it("has no duplicate condition values", () => {
    const values = CONDITION_GROUPS.flatMap((g) => g.options.map((o) => o.value));
    expect(new Set(values).size).toBe(values.length);
  });

  it("gives every option at least one operator", () => {
    for (const g of CONDITION_GROUPS) {
      for (const o of g.options) expect(o.operators.length).toBeGreaterThan(0);
    }
  });

  it("resolves options by value", () => {
    expect(findConditionOption("opportunity_stage")?.optionsSource).toBe("stages");
  });
});
