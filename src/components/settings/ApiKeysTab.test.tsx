import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ApiKeysTab from "./ApiKeysTab";

const mocks = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[], deletedIds: [] as string[], filters: [] as unknown[][] }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => {
    let removing = false;
    let ids: string[] = [];
    const builder = {
      select: () => removing ? Promise.resolve({ data: ids.map(id => ({ id })), error: null }) : builder,
      eq: (...args: unknown[]) => { if (removing) mocks.filters.push(args); return builder; },
      order: () => Promise.resolve({ data: mocks.rows.filter(row => !mocks.deletedIds.includes(String(row.id))), error: null }),
      delete: () => { removing = true; return builder; },
      not: (...args: unknown[]) => { mocks.filters.push(args); return builder; },
      in: (_field: string, values: string[]) => { ids = values; mocks.deletedIds.push(...values); return builder; },
    };
    return builder;
  } },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  mocks.deletedIds = [];
  mocks.filters = [];
  mocks.rows = [
    { id: "active", name: "Make Facebook Leads", key_prefix: "nfk_live_test", scopes: ["leads:write"], revoked_at: null, last_used_at: null },
    { id: "old-1", name: "Old key one", key_prefix: "nfk_live_old1", scopes: ["blog:write"], revoked_at: "2026-11-24", last_used_at: null },
    { id: "old-2", name: "Old key two", key_prefix: "nfk_live_old2", scopes: ["blog:write"], revoked_at: "2026-11-24", last_used_at: null },
  ];
});
afterEach(cleanup);

describe("API key archive", () => {
  it("does not delete before confirmation and deletes only the selected archived key", async () => {
    render(<ApiKeysTab workspaceId="workspace-a" />);
    await screen.findByRole("button", { name: "Revoked keys (2)" });
    fireEvent.click(screen.getByRole("button", { name: "Revoked keys (2)" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Old key one permanently" }));
    expect(mocks.deletedIds).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
    await waitFor(() => expect(mocks.deletedIds).toEqual(["old-1"]));
    expect(mocks.filters).toContainEqual(["workspace_id", "workspace-a"]);
    expect(mocks.filters).toContainEqual(["revoked_at", "is", null]);
  });

  it("clears revoked keys without including the active key", async () => {
    render(<ApiKeysTab workspaceId="workspace-a" />);
    fireEvent.click(await screen.findByRole("button", { name: "Revoked keys (2)" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear archive" }));
    expect(mocks.deletedIds).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
    await waitFor(() => expect(mocks.deletedIds).toEqual(["old-1", "old-2"]));
    expect(mocks.deletedIds).not.toContain("active");
  });
});