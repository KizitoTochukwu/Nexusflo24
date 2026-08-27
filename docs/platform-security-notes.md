# Platform Security Notes

This document summarises the Platform Admin security model. It is documentation, not a live scan — the authoritative state is the database itself.

## Permission model

- Platform access is granted through `platform_staff_assignments` (user, role, active flag, reason). Roles are `super_admin`, `operations_admin`, `billing_admin`, `support_agent`, `content_admin`, `compliance_admin`, `technical_admin`, `analyst`.
- Fine-grained capabilities come from `platform_permissions` mapped through `platform_role_permissions`, checked by `has_platform_permission(user_id, key)`.
- `is_platform_staff(user_id)` is the coarse gate used by read RPCs; writes additionally require the specific permission key.
- Staff grants can only be changed by `super_admin` and are protected by the `guard_platform_staff_changes` trigger.

## RLS approach

- Platform-internal tables (`platform_audit_logs`, `platform_settings`, `platform_access_reviews`, staff assignments, plan tables) are RLS-enabled with policies keyed on `is_platform_staff` / `has_platform_permission`. Writes go exclusively through the audited edge function.
- Workspace data remains tenant-scoped: platform staff read it cross-tenant only via security-definer RPCs (`platform_*`), never through direct table access.
- Public surfaces (storefronts, funnels, blog) use narrow public-read RPCs and policies that expose only published content.

## Audited actions

- Every consequential platform mutation goes through the `platform-admin-action` edge function, which requires a typed reason and appends to `platform_audit_logs` before executing. There is no direct client-side write path.

## Intentional exceptions

- Several `SECURITY DEFINER` RPCs are executable by authenticated users by design: each performs its own internal staff/permission check (`is_platform_staff` or `has_platform_permission`) and is revoked from `PUBLIC` and `anon`. The database linter flags this pattern generically; it is reviewed and intentional.
- `platform_settings` allows public read of the `maintenance` key only, so the workspace maintenance banner renders without staff credentials.

## Review cadence

- Active staff grants should be reviewed periodically from Platform Admin → Security, which records an append-only entry in `platform_access_reviews`. Grants with no sign-in for 90+ days are flagged as stale.
