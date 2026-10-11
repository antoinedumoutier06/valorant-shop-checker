import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import type { Account, AuthAction, AuthState } from '../types';
import * as api from '../api/client';
import { authReducer, initialState } from './authReducer';

const AuthContext = createContext<{
  state: AuthState;
  dispatch: Dispatch<AuthAction>;
  /** The currently selected account, or null when logged out. */
  activeAccount: Account | null;
}>({
  state: initialState,
  dispatch: () => undefined,
  activeAccount: null,
});

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore saved accounts and check which sessions are still alive.
  useEffect(() => {
    let cancelled = false;
    const stored = api.loadStoredAccounts();
    const activePuuid = api.loadActivePuuid();

    Promise.all(
      stored.map(async (account): Promise<Account> => {
        try {
          const res = await api.checkSession(account.token);
          if (!res.valid) return { ...account, expired: true };
          return { ...account, label: res.riot_id ?? account.label };
        } catch {
          // Backend unreachable: keep the account; a real request will report a 401 if needed.
          return account;
        }
      }),
    ).then((accounts) => {
      if (!cancelled) dispatch({ type: 'ACCOUNTS_LOADED', accounts, activePuuid });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist accounts (including expired ones, so they can be reconnected later).
  useEffect(() => {
    if (state.status === 'idle') return;
    api.saveStoredAccounts(state.accounts, state.puuid);
  }, [state.status, state.accounts, state.puuid]);

  const activeAccount = state.accounts.find((a) => a.puuid === state.puuid) ?? null;

  return (
    <AuthContext.Provider value={{ state, dispatch, activeAccount }}>
      {children}
    </AuthContext.Provider>
  );
}
