import type { FieldCondition, FormField, VisibilityRule } from "@/hooks/useForms";

const asText = (v: any): string => {
  if (v === undefined || v === null) return "";
  if (Array.isArray(v)) return v.join(",");
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
};

const isEmpty = (v: any): boolean => {
  if (v === undefined || v === null || v === "") return true;
  if (Array.isArray(v)) return v.length === 0;
  if (v === false) return true;
  return false;
};

export function evaluateCondition(
  cond: FieldCondition,
  values: Record<string, any>,
): boolean {
  const raw = values[cond.field];
  const left = asText(raw).toLowerCase();
  const right = asText(cond.value).toLowerCase();
  switch (cond.operator) {
    case "equals":
      return left === right;
    case "not_equals":
      return left !== right;
    case "contains":
      return left.includes(right);
    case "not_contains":
      return !left.includes(right);
    case "is_empty":
      return isEmpty(raw);
    case "is_not_empty":
      return !isEmpty(raw);
    default:
      return true;
  }
}

export function isFieldVisible(
  field: Pick<FormField, "visible_when">,
  values: Record<string, any>,
): boolean {
  const rule: VisibilityRule | undefined = field.visible_when;
  if (!rule || !rule.conditions?.length) return true;
  const results = rule.conditions.map((c) => evaluateCondition(c, values));
  return rule.match === "any" ? results.some(Boolean) : results.every(Boolean);
}

export const OPERATOR_LABELS: { value: FieldCondition["operator"]; label: string }[] = [
  { value: "equals", label: "is" },
  { value: "not_equals", label: "is not" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

export const OPERATOR_NEEDS_VALUE = (op: FieldCondition["operator"]) =>
  op !== "is_empty" && op !== "is_not_empty";
