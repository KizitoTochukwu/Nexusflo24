

## Hide Workflow Builder from non-admins

### What changes
The "Workflow Builder" feature stays fully functional in the codebase — only its visibility and access are restricted to admin accounts (users in the `admin_allowlist`, detected via the existing `useIsAdmin()` hook). Regular users will not see the sidebar item and cannot reach the routes by typing the URL.

### Files to edit

**1. `src/components/dashboard/DashboardLayout.tsx`**
Move the Workflow Builder sidebar entry into the existing admin-only conditional block (same pattern already used for "Admin" and "Blog Manager"):
```ts
...(isAdmin ? [
  { icon: Zap, label: "Workflow Builder", to: `/dashboard/${workspaceId}/workflows` },
  { icon: Shield, label: "Admin", to: `/dashboard/${workspaceId}/admin` },
  { icon: FileText, label: "Blog Manager", to: `/dashboard/${workspaceId}/admin/blog` },
] : [])
```
Result: regular users no longer see the "Workflow Builder" link in the sidebar.

**2. `src/App.tsx`**
Wrap the three workflow routes inside the existing `<AdminGuard />` block so URL-typing won't bypass the restriction:
```tsx
<Route element={<AdminGuard />}>
  <Route path="workflows" element={<DashboardWorkflows />} />
  <Route path="workflows/new" element={<WorkflowEditor />} />
  <Route path="workflows/:workflowId" element={<WorkflowEditor />} />
  <Route path="admin" element={<AdminDashboard />} />
  <Route path="admin/blog" element={<AdminBlogManager />} />
</Route>
```
Non-admins who try `/dashboard/:id/workflows` will be redirected to the dashboard by `AdminGuard`.

### What this does NOT touch
- No code is deleted — Workflow Builder remains fully built and runnable for admins.
- The Automations module (your active flow) is unaffected.
- Backend edge functions (`execute-workflow`, `enroll-workflow-leads`) stay deployed; they're just not reachable from any non-admin UI.
- Database, RLS, automation engine — untouched.

### Verification after implementation
- Log in as your admin account → "Workflow Builder" still appears in sidebar and `/workflows` loads.
- Log in as a non-admin user → no "Workflow Builder" item; visiting `/dashboard/:id/workflows` redirects to `/dashboard`.

### Reverting later
When you want to re-enable it for everyone, simply move the sidebar entry back out of the `isAdmin` block and remove the workflow routes from inside `<AdminGuard />`. One-minute change.

