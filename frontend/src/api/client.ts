import type {
  Account,
  BundleResponse,
  DailyStoreResponse,
  SessionResponse,
  SkinSearchResponse,
  Wallet,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';
const ACCOUNTS_KEY = 'accounts';
const ACTIVE_KEY = 'active_puuid';

// --- Account persistence (localStorage) ---

type StoredAccount = Pick<Account, 'puuid' | 'token' | 'label'>;

function isStoredAccount(value: unknown): value is StoredAccount {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.puuid === 'string' &&
    typeof v.token === 'string' &&
    typeof v.label === 'string'
  );
}

export function loadStoredAccounts(): StoredAccount[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isStoredAccount) : [];
  } catch {
    return [];
  }
}

export function loadActivePuuid(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function saveStoredAccounts(accounts: Account[], activePuuid: string | null): void {
  try {
    const stored: StoredAccount[] = accounts.map(({ puuid, token, label }) => ({
      puuid,
      token,
      label,
    }));
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(stored));
    if (activePuuid) {
      localStorage.setItem(ACTIVE_KEY, activePuuid);
    } else {
      localStorage.removeItem(ACTIVE_KEY);
    }
  } catch {
    // Storage unavailable (private mode, quota): accounts just won't survive a reload.
  }
}

// --- HTTP ---

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(
  path: string,
  token: string | null,
  options?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    headers,
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = typeof body.detail === 'string' ? body.detail : null;
    throw new ApiError(detail ?? `Request failed: ${res.status}`, res.status);
  }
  return res.json();
}

// Auth

export interface LoginResponse {
  status: 'success' | 'error';
  session_token?: string | null;
  puuid?: string | null;
  riot_id?: string | null;
  error?: string | null;
}

export function getAuthUrl(): Promise<{ auth_url: string }> {
  return request('/api/auth/url', null);
}

export function submitToken(url: string): Promise<LoginResponse> {
  return request('/api/auth/token', null, {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

export function logout(token: string): Promise<{ status: string }> {
  return request('/api/auth/logout', token, { method: 'POST' });
}

export function checkSession(token: string): Promise<SessionResponse> {
  return request('/api/auth/session', token);
}

// Store (every call is scoped to one account's session token)

export function getDailyStore(token: string): Promise<DailyStoreResponse> {
  return request('/api/store/daily', token);
}

export function getBundles(token: string): Promise<BundleResponse> {
  return request('/api/store/bundle', token);
}

export function getWallet(token: string): Promise<Wallet> {
  return request('/api/store/wallet', token);
}

// Skin catalog (public data, no session needed)

export function searchSkins(query: string, signal?: AbortSignal): Promise<SkinSearchResponse> {
  return request(`/api/store/skins/search?q=${encodeURIComponent(query)}`, null, { signal });
}
