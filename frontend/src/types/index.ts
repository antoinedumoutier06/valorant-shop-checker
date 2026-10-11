// Auth types (matching backend models)

export interface SessionResponse {
  valid: boolean;
  puuid?: string;
  riot_id?: string | null;
}

// Store types

export interface SkinInfo {
  uuid: string;
  name: string;
  display_icon: string;
  content_tier_uuid: string;
  content_tier_name: string;
  content_tier_color: string;
}

export interface SkinOffer extends SkinInfo {
  cost: number;
}

export interface BundleItem {
  uuid: string;
  /** Parent skin UUID when the item is a weapon skin (matches wishlist entries). */
  skin_uuid: string | null;
  name: string;
  display_icon: string;
  content_tier_name: string;
  content_tier_color: string;
  base_price: number;
  discounted_price: number;
  discount_percent: number;
}

export interface Bundle {
  uuid: string;
  name: string;
  display_icon: string | null;
  items: BundleItem[];
  total_base_price: number;
  total_discounted_price: number;
  duration_remaining_secs: number;
}

export interface Wallet {
  valorant_points: number;
  radianite_points: number;
}

export interface DailyStoreResponse {
  offers: SkinOffer[];
  seconds_remaining: number;
}

export interface BundleResponse {
  bundles: Bundle[];
}

export interface SkinSearchResponse {
  results: SkinInfo[];
}

// Accounts & auth state

/** A connected Riot account. `expired` is runtime-only (never persisted). */
export interface Account {
  puuid: string;
  /** Backend session token for this account. */
  token: string;
  /** Display name: Riot ID ("Name#TAG") when known, else a short puuid. */
  label: string;
  expired?: boolean;
}

export interface AuthState {
  /** `idle` until the stored accounts have been checked at startup. */
  status: 'idle' | 'unauthenticated' | 'authenticated';
  sessionValid: boolean;
  /** puuid of the active account. */
  puuid: string | null;
  accounts: Account[];
}

export type AuthAction =
  | { type: 'ACCOUNTS_LOADED'; accounts: Account[]; activePuuid: string | null }
  | { type: 'LOGIN_SUCCESS'; account: Account }
  | { type: 'SWITCH_ACCOUNT'; puuid: string }
  | { type: 'REMOVE_ACCOUNT'; puuid: string }
  | { type: 'ACCOUNT_EXPIRED'; puuid: string }
  | { type: 'LOGOUT_ALL' };
