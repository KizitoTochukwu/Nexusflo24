import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Workspace {
  id: string;
  name: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  currentMembership: WorkspaceMember | null;
  loading: boolean;
  setCurrentWorkspaceId: (id: string) => void;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaces: [],
  currentWorkspace: null,
  currentMembership: null,
  loading: true,
  setCurrentWorkspaceId: () => {},
  refreshWorkspaces: async () => {},
});

export const useWorkspace = () => useContext(WorkspaceContext);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [memberships, setMemberships] = useState<WorkspaceMember[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkspaces = async () => {
    if (!user) {
      setWorkspaces([]);
      setMemberships([]);
      setLoading(false);
      return;
    }

    // Mark loading at the start so consumers don't see a stale empty state
    // between user changing and the new fetch completing.
    setLoading(true);

    const [wsResult, memResult] = await Promise.all([
      supabase.from("workspaces").select("*").order("created_at", { ascending: true }),
      supabase.from("workspace_members").select("*").eq("user_id", user.id),
    ]);

    const ws = (wsResult.data ?? []) as Workspace[];
    const mems = (memResult.data ?? []) as WorkspaceMember[];

    setWorkspaces(ws);
    setMemberships(mems);
    setLoading(false);
  };

  // Track which user id we've already loaded workspaces for so that a new
  // `user` object reference (e.g. a Supabase token refresh on tab focus)
  // does NOT retrigger a fetch and flash the "Setting up your workspace…"
  // spinner across the dashboard.
  const loadedForUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    const uid = user?.id ?? null;
    if (loadedForUserIdRef.current === uid) {
      // Same user as last fetch (or still signed-out) — nothing to do.
      return;
    }
    loadedForUserIdRef.current = uid;
    fetchWorkspaces();
  }, [user?.id, authLoading]);


  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) ?? null;
  const currentMembership = memberships.find((m) => m.workspace_id === currentWorkspaceId) ?? null;

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        currentMembership,
        loading,
        setCurrentWorkspaceId,
        refreshWorkspaces: fetchWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};
