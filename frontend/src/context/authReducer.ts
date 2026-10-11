import type { Account, AuthAction, AuthState } from '../types';

export const initialState: AuthState = {
  status: 'idle',
  sessionValid: false,
  puuid: null,
  accounts: [],
};

/**
 * Build the auth state for a list of accounts. The active account is the preferred
 * one if it is still usable, otherwise the first account whose session hasn't expired.
 */
function withActive(accounts: Account[], preferred: string | null): AuthState {
  const active =
    accounts.find((a) => a.puuid === preferred && !a.expired) ??
    accounts.find((a) => !a.expired) ??
    null;

  return {
    accounts,
    puuid: active?.puuid ?? null,
    status: active ? 'authenticated' : 'unauthenticated',
    sessionValid: active !== null,
  };
}

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'ACCOUNTS_LOADED': {
      // An account may have been added while the startup check was still running.
      const added = state.accounts;
      const loaded = action.accounts.filter((a) => !added.some((x) => x.puuid === a.puuid));
      return withActive([...loaded, ...added], state.puuid ?? action.activePuuid);
    }
    case 'LOGIN_SUCCESS': {
      const exists = state.accounts.some((a) => a.puuid === action.account.puuid);
      // Logging into an account that is already listed replaces its (expired) session.
      const accounts = exists
        ? state.accounts.map((a) => (a.puuid === action.account.puuid ? action.account : a))
        : [...state.accounts, action.account];
      return withActive(accounts, action.account.puuid);
    }
    case 'SWITCH_ACCOUNT':
      return withActive(state.accounts, action.puuid);
    case 'REMOVE_ACCOUNT':
      return withActive(
        state.accounts.filter((a) => a.puuid !== action.puuid),
        state.puuid,
      );
    case 'ACCOUNT_EXPIRED':
      return withActive(
        state.accounts.map((a) => (a.puuid === action.puuid ? { ...a, expired: true } : a)),
        state.puuid,
      );
    case 'LOGOUT_ALL':
      return { ...initialState, status: 'unauthenticated' };
  }
}
