import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useWishlist } from '../hooks/useWishlist';
import * as api from '../api/client';
import type { Account, SkinInfo } from '../types';
import AppHeader from '../components/AppHeader';
import WishlistButton from '../components/WishlistButton';
import { getTierColor } from '../utils/tier';

const OSWALD = { fontFamily: "'Oswald', sans-serif" } as const;
const MIN_QUERY_LENGTH = 2;

type ShopCheck = { ok: true; skinIds: Set<string> } | { ok: false };

interface AvailabilityResult {
  /** The accounts this result was computed for (used to detect stale results). */
  accounts: Account[];
  shops: Record<string, ShopCheck>;
  /** skin uuid -> name of the featured bundle containing it */
  bundleHits: Map<string, string>;
}

interface SearchResult {
  query: string;
  results: SkinInfo[];
  error?: string;
}

export default function WishlistPage() {
  const { state, dispatch } = useAuth();
  const { skins, has, toggle, remove } = useWishlist();

  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);

  const validAccounts = useMemo(
    () => state.accounts.filter((a) => !a.expired),
    [state.accounts],
  );
  const expiredCount = state.accounts.length - validAccounts.length;

  // --- Search (debounced) ---

  const trimmedQuery = query.trim();
  const canSearch = trimmedQuery.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!canSearch) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await api.searchSkins(trimmedQuery, controller.signal);
        setSearchResult({ query: trimmedQuery, results: res.results });
      } catch (err) {
        if (controller.signal.aborted) return;
        setSearchResult({
          query: trimmedQuery,
          results: [],
          error: err instanceof Error ? err.message : 'Search failed',
        });
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [canSearch, trimmedQuery]);

  const searching = canSearch && searchResult?.query !== trimmedQuery;
  const currentSearch = canSearch && searchResult?.query === trimmedQuery ? searchResult : null;

  // --- Which accounts have a wishlisted skin in their shop right now ---

  useEffect(() => {
    if (validAccounts.length === 0) return;

    let cancelled = false;

    (async () => {
      const settled = await Promise.allSettled(
        validAccounts.map((account) => api.getDailyStore(account.token)),
      );

      const shops: Record<string, ShopCheck> = {};
      settled.forEach((outcome, i) => {
        const account = validAccounts[i];
        if (outcome.status === 'fulfilled') {
          shops[account.puuid] = {
            ok: true,
            skinIds: new Set(outcome.value.offers.map((o) => o.uuid)),
          };
        } else {
          shops[account.puuid] = { ok: false };
          const reason = outcome.reason;
          if (reason instanceof api.ApiError && reason.status === 401) {
            dispatch({ type: 'ACCOUNT_EXPIRED', puuid: account.puuid });
          }
        }
      });

      // The featured bundle is the same for everyone: ask the first account that worked.
      const bundleHits = new Map<string, string>();
      const working = validAccounts.find((a) => shops[a.puuid]?.ok);
      if (working) {
        try {
          const { bundles } = await api.getBundles(working.token);
          bundles.forEach((bundle) =>
            bundle.items.forEach((item) => {
              if (item.skin_uuid) bundleHits.set(item.skin_uuid, bundle.name);
            }),
          );
        } catch {
          // Bundle info is a bonus; the per-account check above is still valid.
        }
      }

      if (!cancelled) setAvailability({ accounts: validAccounts, shops, bundleHits });
    })();

    return () => {
      cancelled = true;
    };
  }, [validAccounts, dispatch]);

  const checking = validAccounts.length > 0 && availability?.accounts !== validAccounts;
  const result = availability?.accounts === validAccounts ? availability : null;

  function accountsWithSkin(skinUuid: string): Account[] {
    if (!result) return [];
    return validAccounts.filter((a) => {
      const shop = result.shops[a.puuid];
      return shop?.ok && shop.skinIds.has(skinUuid);
    });
  }

  const availableCount = result
    ? skins.filter((s) => accountsWithSkin(s.uuid).length > 0 || result.bundleHits.has(s.uuid)).length
    : 0;
  const failedChecks = result
    ? validAccounts.filter((a) => result.shops[a.puuid]?.ok === false).length
    : 0;

  return (
    <div className="min-h-svh bg-bg-primary">
      <AppHeader />

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Search */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl tracking-wider text-text-primary" style={{ ...OSWALD, fontWeight: 700 }}>
            ADD SKINS
          </h2>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a skin (e.g. Reaver, Prelude, Oni…)"
            aria-label="Search skins"
            className="w-full rounded border border-border bg-bg-secondary px-4 py-3 text-sm text-text-primary placeholder-text-secondary/50 outline-none transition-colors focus:border-accent-red"
          />

          <div className="mt-4" aria-live="polite">
            {searching && <p className="text-sm text-text-secondary">Searching…</p>}
            {currentSearch?.error && <p className="text-sm text-accent-red">{currentSearch.error}</p>}
            {currentSearch && !currentSearch.error && currentSearch.results.length === 0 && (
              <p className="text-sm text-text-secondary">No skin found for “{currentSearch.query}”.</p>
            )}
            {currentSearch && currentSearch.results.length > 0 && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {currentSearch.results.map((skin) => (
                  <SkinTile
                    key={skin.uuid}
                    skin={skin}
                    wishlisted={has(skin.uuid)}
                    onToggle={() => toggle(skin)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Wishlist */}
        <section>
          <h2 className="mb-2 text-2xl tracking-wider text-text-primary" style={{ ...OSWALD, fontWeight: 700 }}>
            YOUR WISHLIST ({skins.length})
          </h2>

          {skins.length > 0 && (
            <p className="mb-6 text-sm text-text-secondary" aria-live="polite">
              {checking
                ? 'Checking the shop of each connected account…'
                : validAccounts.length === 0
                  ? 'Log in to an account to see which skins are in its shop.'
                  : availableCount > 0
                    ? `${availableCount} of your skins ${availableCount > 1 ? 'are' : 'is'} on sale right now.`
                    : 'None of your skins are on sale right now.'}
            </p>
          )}

          {expiredCount > 0 && (
            <p className="mb-6 rounded border border-accent-red/40 bg-accent-red/10 px-3 py-2 text-xs text-accent-red">
              {expiredCount} account{expiredCount > 1 ? 's have' : ' has'} an expired session and
              {expiredCount > 1 ? " weren't" : " wasn't"} checked.{' '}
              <Link to="/add-account" className="font-semibold underline">
                Reconnect
              </Link>
            </p>
          )}
          {failedChecks > 0 && (
            <p className="mb-6 text-xs text-text-secondary">
              Couldn't load the shop of {failedChecks} account{failedChecks > 1 ? 's' : ''}; results may be incomplete.
            </p>
          )}

          {skins.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center text-sm text-text-secondary">
              Your wishlist is empty. Search for a skin above, or tap the heart on any skin in your shop.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {skins.map((skin) => {
                const owners = accountsWithSkin(skin.uuid);
                const bundleName = result?.bundleHits.get(skin.uuid);
                const onSale = owners.length > 0 || !!bundleName;

                return (
                  <SkinTile
                    key={skin.uuid}
                    skin={skin}
                    wishlisted
                    highlighted={onSale}
                    onToggle={() => remove(skin.uuid)}
                  >
                    <Availability
                      checking={checking}
                      noAccounts={validAccounts.length === 0}
                      owners={owners}
                      bundleName={bundleName}
                    />
                  </SkinTile>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function SkinTile({
  skin,
  wishlisted,
  highlighted = false,
  onToggle,
  children,
}: {
  skin: SkinInfo;
  wishlisted: boolean;
  highlighted?: boolean;
  onToggle: () => void;
  children?: ReactNode;
}) {
  const tierColor = getTierColor(skin.content_tier_name, skin.content_tier_color);

  return (
    <div
      className={`relative overflow-hidden rounded-lg border bg-bg-card ${
        highlighted ? 'border-accent-teal shadow-[0_0_24px_rgba(23,232,181,0.25)]' : 'border-border'
      }`}
    >
      <div className="h-0.5" style={{ backgroundColor: tierColor }} />
      <WishlistButton
        active={wishlisted}
        onToggle={onToggle}
        skinName={skin.name}
        size="sm"
        className="absolute right-2 top-3 z-10"
      />

      <div className="flex aspect-video items-center justify-center p-3">
        {skin.display_icon ? (
          <img src={skin.display_icon} alt={skin.name} loading="lazy" className="h-full w-full object-contain drop-shadow-lg" />
        ) : (
          <div className="text-sm text-text-secondary">No image</div>
        )}
      </div>

      <div className="border-t border-border p-3">
        <h3 className="truncate text-sm text-text-primary" style={{ ...OSWALD, fontWeight: 600 }}>
          {skin.name}
        </h3>
        {skin.content_tier_name && (
          <span
            className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
            style={{ backgroundColor: tierColor }}
          >
            {skin.content_tier_name}
          </span>
        )}
      </div>

      {children && <div className="border-t border-border bg-bg-secondary/50 px-3 py-2">{children}</div>}
    </div>
  );
}

function Availability({
  checking,
  noAccounts,
  owners,
  bundleName,
}: {
  checking: boolean;
  noAccounts: boolean;
  owners: Account[];
  bundleName: string | undefined;
}) {
  if (checking) return <p className="text-xs text-text-secondary">Checking…</p>;
  if (noAccounts) return <p className="text-xs text-text-secondary">No account connected</p>;
  if (owners.length === 0 && !bundleName) {
    return <p className="text-xs text-text-secondary">Not in any shop right now</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {owners.map((account) => (
        <span
          key={account.puuid}
          className="max-w-full truncate rounded-full bg-accent-teal px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-bg-primary"
          style={OSWALD}
        >
          Daily shop · {account.label}
        </span>
      ))}
      {bundleName && (
        <span
          className="max-w-full truncate rounded-full border border-accent-teal px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-teal"
          style={OSWALD}
        >
          Bundle · {bundleName}
        </span>
      )}
    </div>
  );
}
