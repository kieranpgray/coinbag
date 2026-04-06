import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import i18n from 'i18next';
import {
  getPortalUrl,
  getSnaptradeAccounts,
  importSnaptradeAccounts,
  type SnaptradeAccount,
} from '../api/snaptradeApi';

function snaptradeSyncErrorMessage(brokerageDisplayName?: string | null): string {
  const name = brokerageDisplayName?.trim();
  if (name) {
    return i18n.t('pages:snaptrade.syncErrorWithName', { brokerage: name });
  }
  return i18n.t('pages:snaptrade.syncErrorGeneric');
}

export type PortalStatus =
  | 'idle'
  | 'loading_url'
  | 'url_error'
  | 'portal_open'
  | 'loading_accounts'
  | 'selecting'
  | 'importing'
  | 'accounts_error';

interface PortalState {
  status: PortalStatus;
  loginLink: string | null;
  authorizationId: string | null;
  accounts: SnaptradeAccount[];
  syncPending: boolean;
  errorMessage: string | null;
  importError: string | null;
}

const INITIAL_STATE: PortalState = {
  status: 'idle',
  loginLink: null,
  authorizationId: null,
  accounts: [],
  syncPending: false,
  errorMessage: null,
  importError: null,
};

// How long to poll for accounts after initial connection (ms)
const SYNC_POLL_INTERVAL = 10_000;
const SYNC_POLL_TIMEOUT = 90_000;

export function useSnaptradePortal() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [state, setState] = useState<PortalState>(INITIAL_STATE);
  const syncPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncStartRef = useRef<number>(0);
  const authorizationIdRef = useRef<string | null>(null);
  /** Preserved for error copy and retry after URL/portal failures */
  const pendingReconnectRef = useRef<{ authId: string; name: string | null } | null>(null);

  const clearSyncPoll = () => {
    if (syncPollRef.current) {
      clearInterval(syncPollRef.current);
      syncPollRef.current = null;
    }
  };

  const clearPendingReconnect = () => {
    pendingReconnectRef.current = null;
  };

  // Start connect flow — fetches portal URL, then SDK opens
  const startConnect = useCallback(
    async (reconnect?: string, brokerageDisplayName?: string | null) => {
      if (reconnect) {
        pendingReconnectRef.current = {
          authId: reconnect,
          name: brokerageDisplayName?.trim() ? brokerageDisplayName.trim() : null,
        };
      } else {
        clearPendingReconnect();
      }
      setState((s) => ({ ...s, status: 'loading_url', errorMessage: null }));
      try {
        const { redirectURI } = await getPortalUrl(getToken, reconnect);
        setState((s) => ({ ...s, status: 'portal_open', loginLink: redirectURI }));
      } catch {
        const name = pendingReconnectRef.current?.name ?? null;
        setState((s) => ({
          ...s,
          status: 'url_error',
          errorMessage: snaptradeSyncErrorMessage(name),
        }));
      }
    },
    [getToken]
  );

  // SDK onSuccess callback — fetch accounts
  const handlePortalSuccess = useCallback(
    async (authorizationId: string) => {
      setState((s) => ({
        ...s,
        status: 'loading_accounts',
        authorizationId,
        loginLink: null,
      }));

      const fetchAccounts = async (): Promise<boolean> => {
        try {
          const result = await getSnaptradeAccounts(getToken, authorizationId);
          if (!result.syncPending && result.accounts.length > 0) {
            // Accounts available
            if (result.accounts.filter((a) => !a.isAlreadyImported).length === 1 &&
                result.accounts.filter((a) => a.isAlreadyImported).length === 0) {
              // Single importable account — auto-import
              const firstAccount = result.accounts[0];
              if (firstAccount) {
                await doImport(authorizationId, [firstAccount.snaptradeAccountId]);
              }
              return true;
            }
            setState((s) => ({
              ...s,
              status: 'selecting',
              accounts: result.accounts,
              syncPending: false,
            }));
            return true;
          }
          // Still pending
          setState((s) => ({ ...s, status: 'selecting', syncPending: true, accounts: [] }));
          return false;
        } catch {
          const name = pendingReconnectRef.current?.name ?? null;
          setState((s) => ({
            ...s,
            status: 'accounts_error',
            errorMessage: snaptradeSyncErrorMessage(name),
          }));
          return true; // stop polling on error
        }
      };

      const done = await fetchAccounts();
      if (done) return;

      // Poll until accounts appear or timeout
      syncStartRef.current = Date.now();
      syncPollRef.current = setInterval(async () => {
        if (Date.now() - syncStartRef.current >= SYNC_POLL_TIMEOUT) {
          clearSyncPoll();
          setState((s) => ({
            ...s,
            syncPending: false,
            errorMessage: "We couldn't find any accounts. They may take a few minutes to appear — check back shortly.",
          }));
          return;
        }
        const resolved = await fetchAccounts();
        if (resolved) clearSyncPoll();
      }, SYNC_POLL_INTERVAL);
    },
    [getToken]  // eslint-disable-line react-hooks/exhaustive-deps
  );

  const doImport = async (authorizationId: string, accountIds: string[]) => {
    setState((s) => ({ ...s, status: 'importing', importError: null }));
    try {
      await importSnaptradeAccounts(getToken, authorizationId, accountIds);
      // Invalidate assets cache so WealthPage refreshes
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      clearPendingReconnect();
      setState(INITIAL_STATE);
      return true;
    } catch (err: unknown) {
      const msg = (err as Error).message ?? 'Something went wrong importing your accounts. Try again.';
      setState((s) => ({
        ...s,
        status: 'selecting',
        importError: msg,
      }));
      return false;
    }
  };

  const handleImport = useCallback(
    async (selectedIds: string[]) => {
      if (!authorizationIdRef.current) return;
      await doImport(authorizationIdRef.current, selectedIds);
    },
    []  // no deps needed
  );

  const handlePortalExit = useCallback(() => {
    clearPendingReconnect();
    setState(INITIAL_STATE);
  }, []);

  const handlePortalError = useCallback((_error: { errorCode?: string; statusCode?: string; detail?: string }) => {
    const name = pendingReconnectRef.current?.name ?? null;
    setState((s) => ({
      ...s,
      status: 'url_error',
      loginLink: null,
      errorMessage: snaptradeSyncErrorMessage(name),
    }));
  }, []);

  const retryConnect = useCallback(() => {
    const pending = pendingReconnectRef.current;
    if (pending) {
      void startConnect(pending.authId, pending.name);
    } else {
      void startConnect();
    }
  }, [startConnect]);

  const skipImport = useCallback(() => {
    clearSyncPoll();
    clearPendingReconnect();
    setState(INITIAL_STATE);
  }, []);

  // Clean up polling on unmount
  useEffect(() => {
    return () => clearSyncPoll();
  }, []);

  // Keep ref in sync with state
  useEffect(() => {
    authorizationIdRef.current = state.authorizationId;
  }, [state.authorizationId]);

  return {
    state,
    isModalOpen: ['loading_accounts', 'selecting', 'importing'].includes(state.status),
    startConnect,
    retryConnect,
    handlePortalSuccess,
    handlePortalExit,
    handlePortalError,
    handleImport,
    skipImport,
  };
}
