import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWishlist } from '../hooks/useWishlist';
import * as api from '../api/client';
import type { Bundle, BundleItem, SkinOffer, Wallet } from '../types';
import AppHeader from '../components/AppHeader';
import CountdownTimer from '../components/CountdownTimer';
import SkinCard from '../components/SkinCard';
import BundleCard from '../components/BundleCard';

export default function ShopPage() {
  const { dispatch, activeAccount } = useAuth();
  const { has, toggle } = useWishlist();

  const [offers, setOffers] = useState<SkinOffer[]>([]);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = activeAccount?.token ?? null;
  const puuid = activeAccount?.puuid ?? null;

  // Identifies the latest fetch so a slow response for a previously selected
  // account can't overwrite the data of the account that is shown now.
  const latestRequest = useRef(0);

  const fetchStoreData = useCallback(async () => {
    if (!token || !puuid) return;

    const requestId = ++latestRequest.current;
    setLoading(true);
    setError(null);

    try {
      const [dailyRes, bundleRes, walletRes] = await Promise.all([
        api.getDailyStore(token),
        api.getBundles(token),
        api.getWallet(token),
      ]);
      if (requestId !== latestRequest.current) return;

      setOffers(dailyRes.offers);
      setSecondsRemaining(dailyRes.seconds_remaining);
      setBundles(bundleRes.bundles);
      setWallet(walletRes);
    } catch (err) {
      if (requestId !== latestRequest.current) return;

      if (err instanceof api.ApiError && err.status === 401) {
        // This account's session is gone. The switcher flags it as expired and the
        // app falls back to another account, or to the login page if none is left.
        dispatch({ type: 'ACCOUNT_EXPIRED', puuid });
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load store');
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [token, puuid, dispatch]);

  useEffect(() => {
    fetchStoreData();
  }, [fetchStoreData]);

  function handleToggleBundleItem(item: BundleItem) {
    if (!item.skin_uuid) return;
    toggle({
      uuid: item.skin_uuid,
      name: item.name,
      display_icon: item.display_icon,
      content_tier_name: item.content_tier_name,
      content_tier_color: item.content_tier_color,
    });
  }

  // Wishlisted skins that are on sale in this account's shop right now.
  const hits = [
    ...offers.filter((o) => has(o.uuid)).map((o) => o.name),
    ...bundles.flatMap((b) => b.items.filter((i) => has(i.skin_uuid)).map((i) => `${i.name} (bundle)`)),
  ];

  return (
    <div className="min-h-svh bg-bg-primary">
      <AppHeader wallet={wallet} />

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center gap-4 py-20">
            <p className="text-accent-red">{error}</p>
            <button
              onClick={fetchStoreData}
              className="rounded bg-accent-red px-4 py-2 text-sm font-semibold text-white transition-colors hover:brightness-110"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Wishlist hits */}
            {hits.length > 0 && (
              <div
                role="status"
                className="mb-8 rounded-lg border border-accent-teal/60 bg-accent-teal/10 px-4 py-3 text-sm text-accent-teal"
              >
                <span className="font-bold">
                  {hits.length} skin{hits.length > 1 ? 's' : ''} from your wishlist
                </span>{' '}
                {hits.length > 1 ? 'are' : 'is'} in this shop: {hits.join(', ')}
              </div>
            )}

            {/* Countdown */}
            <div className="mb-8 flex justify-center">
              <CountdownTimer
                secondsRemaining={secondsRemaining}
                onExpire={fetchStoreData}
              />
            </div>

            {/* Daily Store */}
            <section className="mb-12">
              <h2
                className="mb-6 text-2xl tracking-wider text-text-primary"
                style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700 }}
              >
                DAILY STORE
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {offers.map((skin) => (
                  <SkinCard
                    key={skin.uuid}
                    skin={skin}
                    wishlisted={has(skin.uuid)}
                    onToggleWishlist={() => toggle(skin)}
                  />
                ))}
              </div>
            </section>

            {/* Featured Bundle */}
            {bundles.length > 0 && (
              <section>
                <h2
                  className="mb-6 text-2xl tracking-wider text-text-primary"
                  style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700 }}
                >
                  FEATURED BUNDLE
                </h2>
                <div className="space-y-4">
                  {bundles.map((bundle) => (
                    <BundleCard
                      key={bundle.uuid}
                      bundle={bundle}
                      isWishlisted={has}
                      onToggleWishlist={handleToggleBundleItem}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function SkinCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg-card">
      <div className="h-0.5 bg-bg-secondary" />
      <div className="flex aspect-video items-center justify-center p-4">
        <div className="h-3/4 w-3/4 rounded bg-bg-secondary/50" />
      </div>
      <div className="flex items-end justify-between border-t border-border p-4">
        <div className="space-y-2">
          <div className="h-5 w-32 rounded bg-bg-secondary" />
          <div className="h-4 w-16 rounded-full bg-bg-secondary" />
        </div>
        <div className="h-5 w-20 rounded bg-bg-secondary" />
      </div>
    </div>
  );
}

function BundleCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="h-6 w-40 rounded bg-bg-secondary" />
        <div className="h-5 w-24 rounded bg-bg-secondary" />
      </div>
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center rounded border border-border/50 bg-bg-secondary p-2">
            <div className="mb-2 h-16 w-full rounded bg-bg-primary/30" />
            <div className="h-3 w-20 rounded bg-bg-primary/30" />
            <div className="mt-1 h-3 w-12 rounded bg-bg-primary/30" />
          </div>
        ))}
      </div>
      <div className="flex justify-end border-t border-border px-6 py-4">
        <div className="h-6 w-28 rounded bg-bg-secondary" />
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Countdown placeholder */}
      <div className="mb-8 flex justify-center">
        <div className="h-7 w-72 rounded bg-bg-card" />
      </div>

      {/* Section heading */}
      <div className="mb-6 h-8 w-40 rounded bg-bg-card" />

      {/* Skin cards grid */}
      <div className="mb-12 grid grid-cols-1 gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <SkinCardSkeleton key={i} />
        ))}
      </div>

      {/* Bundle heading */}
      <div className="mb-6 h-8 w-52 rounded bg-bg-card" />

      {/* Bundle card */}
      <BundleCardSkeleton />
    </div>
  );
}
