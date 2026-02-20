# Multi-Tenant Migration Documentation

## Overview

NexusFlo24 has been migrated from a single-user model to a multi-tenant workspace-based architecture. All business data (leads, lead_activities, subscriptions) is now scoped by `workspace_id`.

## Database Schema Changes

### New Tables

1. **workspaces** — Represents a client workspace/account
   - `id` (uuid, PK)
   - `name` (text)
   - `owner_user_id` (uuid)
   - `created_at`, `updated_at` (timestamptz)

2. **workspace_members** — Maps users to workspaces with roles
   - `id` (uuid, PK)
   - `workspace_id` (uuid, FK → workspaces)
   - `user_id` (uuid)
   - `role` (text: owner|admin|member|viewer)
   - Unique constraint: `(workspace_id, user_id)`

3. **invitations** — Pending workspace invitations
   - `id` (uuid, PK)
   - `workspace_id` (uuid, FK → workspaces)
   - `email` (text)
   - `role` (text)
   - `token` (text, unique)
   - `status` (text: pending|accepted|expired)
   - `expires_at` (timestamptz, default: 7 days from creation)

### Modified Tables

- **leads**: Added `workspace_id` (uuid, NOT NULL, FK → workspaces)
- **lead_activities**: Added `workspace_id` (uuid, NOT NULL, FK → workspaces)
- **subscriptions**: Added `workspace_id` (uuid, FK → workspaces)

### Indexes

- `idx_leads_workspace_email_unique` — Unique per workspace: `(workspace_id, lower(email))` where email not empty
- `idx_leads_workspace_phone_unique` — Unique per workspace: `(workspace_id, phone)` where phone not empty
- `idx_leads_workspace_created` — Performance: `(workspace_id, created_at)`
- `idx_leads_workspace_status` — Performance: `(workspace_id, status)`
- `idx_lead_activities_workspace` — Performance: `(workspace_id, created_at)`

## Security Functions

Three security-definer helper functions prevent RLS recursion:

- `is_workspace_member(user_id, workspace_id)` — Checks membership
- `is_workspace_admin(user_id, workspace_id)` — Checks owner/admin role
- `user_workspace_ids(user_id)` — Returns all workspace IDs for a user

## RLS Policies

All business data RLS is based on workspace membership:
- Leads, lead_activities: members can CRUD within their workspaces
- Workspaces: members can read; owners/admins can update; owners can delete
- Workspace_members: members can read; admins/owners can manage

## Auto-Provisioning

- On user signup → profile trigger → `handle_workspace_creation()` creates a default workspace and adds user as owner
- Existing users were backfilled with default workspaces during migration

## Routing

Dashboard routes follow pattern: `/dashboard/:workspaceId/*`

- `/dashboard/:workspaceId/overview`
- `/dashboard/:workspaceId/leads`
- `/dashboard/:workspaceId/campaigns`
- `/dashboard/:workspaceId/automations`
- `/dashboard/:workspaceId/funnels`
- `/dashboard/:workspaceId/analytics`
- `/dashboard/:workspaceId/settings/profile`
- `/dashboard/:workspaceId/settings/workspace`
- `/dashboard/:workspaceId/settings/members`
- `/dashboard/:workspaceId/settings/billing`

Accessing `/dashboard` (without workspaceId) redirects to the user's first workspace.

## External API (Make.com Ingest)

The `ingest-leads` edge function now accepts an `X-Workspace-Id` header.
- If provided, leads are scoped to that workspace
- If omitted, falls back to the owner's first workspace (with a warning logged)

## Stripe Integration

- Checkout metadata now includes `workspaceId`
- Webhook upserts subscriptions by workspace when available
- Billing portal return URL is workspace-scoped
