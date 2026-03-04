import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { getDefaultWorkspaceIdForUser } from '@/lib/repositoryHelpers';
import { trackSwitcherUsage } from '@/lib/workspaceCollaborationMetrics';
import { createWorkspaceRepository } from '@/data/workspaces';
import { LAST_USED_WORKSPACE_KEY, type WorkspaceRole } from '@/contracts/workspaces';
import { getUserIdFromToken, createAuthenticatedSupabaseClient } from '@/lib/supabaseClient';
import type { WorkspaceWithMembership } from '@/data/workspaces/repo';

interface WorkspaceContextValue {
  activeWorkspaceId: string | null;
  activeWorkspace: WorkspaceWithMembership | null;
  currentRole: WorkspaceRole | null;
  memberships: WorkspaceWithMembership[];
  isLoading: boolean;
  error: string | null;
  setActiveWorkspaceId: (id: string) => void;
  refetch: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function loadLastUsedWorkspaceId(): string | null {
  try {
    return localStorage.getItem(LAST_USED_WORKSPACE_KEY);
  } catch {
    return null;
  }
}

function saveLastUsedWorkspaceId(id: string): void {
  try {
    localStorage.setItem(LAST_USED_WORKSPACE_KEY, id);
  } catch {
    // Ignore
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const repo = useMemo(() => createWorkspaceRepository(), []);

  const [memberships, setMemberships] = useState<WorkspaceWithMembership[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMemberships = useCallback(async () => {
    if (!getToken || !isSignedIn) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: err } = await repo.listMemberships(getToken);
      if (err) {
        setError(err.error);
        setMemberships([]);
        return;
      }
      setMemberships(data ?? []);
    } finally {
      setIsLoading(false);
    }
  }, [repo, getToken, isSignedIn]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setIsLoading(false);
      return;
    }

    const init = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data: membershipsData, error: membershipsError } =
          await repo.listMemberships(getToken);

        if (membershipsError) {
          const fallback = await getDefaultWorkspaceIdForUser(getToken);
          if ('workspaceId' in fallback) {
            const workspaceId = fallback.workspaceId;
            setActiveWorkspaceIdState(workspaceId);
            saveLastUsedWorkspaceId(workspaceId);

            // Try to fetch the real membership ID for this workspace
            let membershipId: string;
            try {
              const userId = await getUserIdFromToken(getToken);
              if (userId) {
                const supabase = await createAuthenticatedSupabaseClient(getToken);
                const { data: membership } = await supabase
                  .from('workspace_memberships')
                  .select('id')
                  .eq('workspace_id', workspaceId)
                  .eq('user_id', userId)
                  .single();
                if (membership) {
                  membershipId = membership.id;
                } else {
                  // No membership found - keep fallback but note that Team mutations may not work
                  membershipId = workspaceId;
                }
              } else {
                membershipId = workspaceId;
              }
            } catch {
              // If membership lookup fails, use fallback ID but Team mutations may not work
              membershipId = workspaceId;
            }

            setMemberships([{
              id: workspaceId,
              name: 'My Workspace',
              createdBy: '',
              createdAt: '',
              updatedAt: '',
              role: 'admin',
              membershipId,
            }]);
          } else {
            setError(membershipsError.error ?? 'Failed to load workspaces');
          }
          setIsLoading(false);
          return;
        }

        const list = membershipsData ?? [];
        setMemberships(list);

        const lastUsed = loadLastUsedWorkspaceId();
        const preferred = list.find((m) => m.id === lastUsed) ?? list[0];
        let workspaceId = preferred?.id ?? null;
        if (!workspaceId) {
          const defaultResult = await getDefaultWorkspaceIdForUser(getToken);
          workspaceId = 'workspaceId' in defaultResult ? defaultResult.workspaceId : null;
        }

        if (workspaceId) {
          setActiveWorkspaceIdState(workspaceId);
          saveLastUsedWorkspaceId(workspaceId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workspace');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [isLoaded, isSignedIn, getToken, repo]);

  const setActiveWorkspaceId = useCallback(
    (id: string) => {
      const fromId = activeWorkspaceId;
      setActiveWorkspaceIdState(id);
      saveLastUsedWorkspaceId(id);

      // Invalidate only workspace-scoped queries to avoid unnecessary refetches
      const WORKSPACE_SCOPED_KEYS = ['teamMembers', 'teamInvitations', 'categories'] as const;
      WORKSPACE_SCOPED_KEYS.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });

      if (fromId && fromId !== id) {
        trackSwitcherUsage(fromId, id);
      }
    },
    [queryClient, activeWorkspaceId]
  );

  const activeWorkspace = useMemo(
    () => memberships.find((m) => m.id === activeWorkspaceId) ?? null,
    [memberships, activeWorkspaceId]
  );

  const currentRole = activeWorkspace?.role ?? null;

  const value: WorkspaceContextValue = useMemo(
    () => ({
      activeWorkspaceId,
      activeWorkspace,
      currentRole,
      memberships,
      isLoading,
      error,
      setActiveWorkspaceId,
      refetch: fetchMemberships,
    }),
    [
      activeWorkspaceId,
      activeWorkspace,
      currentRole,
      memberships,
      isLoading,
      error,
      setActiveWorkspaceId,
      fetchMemberships,
    ]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return ctx;
}

/** Optional variant - returns null when not in WorkspaceProvider (e.g. tests) */
export function useWorkspaceOptional(): WorkspaceContextValue | null {
  return useContext(WorkspaceContext);
}
