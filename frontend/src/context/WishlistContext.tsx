import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { SkinInfo } from '../types';

const STORAGE_KEY = 'wishlist';

/** What we keep about a wishlisted skin (enough to display it without the backend). */
type WishlistSkin = SkinInfo;

function normalize(skin: Partial<SkinInfo> & { uuid: string; name: string }): WishlistSkin {
  return {
    uuid: skin.uuid,
    name: skin.name,
    display_icon: skin.display_icon ?? '',
    content_tier_uuid: skin.content_tier_uuid ?? '',
    content_tier_name: skin.content_tier_name ?? '',
    content_tier_color: skin.content_tier_color ?? '',
  };
}

function loadWishlist(): WishlistSkin[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (s): s is SkinInfo =>
          typeof s === 'object' &&
          s !== null &&
          typeof s.uuid === 'string' &&
          typeof s.name === 'string',
      )
      .map(normalize);
  } catch {
    return [];
  }
}

interface WishlistContextValue {
  skins: WishlistSkin[];
  has: (uuid: string | null | undefined) => boolean;
  /** Add the skin if it isn't wishlisted, remove it otherwise. */
  toggle: (skin: Partial<SkinInfo> & { uuid: string; name: string }) => void;
  remove: (uuid: string) => void;
}

const WishlistContext = createContext<WishlistContextValue>({
  skins: [],
  has: () => false,
  toggle: () => undefined,
  remove: () => undefined,
});

// eslint-disable-next-line react-refresh/only-export-components
export function useWishlist() {
  return useContext(WishlistContext);
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [skins, setSkins] = useState<WishlistSkin[]>(loadWishlist);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(skins));
    } catch {
      // Storage unavailable: the wishlist just won't survive a reload.
    }
  }, [skins]);

  const ids = useMemo(() => new Set(skins.map((s) => s.uuid)), [skins]);

  const has = useCallback((uuid: string | null | undefined) => !!uuid && ids.has(uuid), [ids]);

  const toggle = useCallback<WishlistContextValue['toggle']>((skin) => {
    setSkins((prev) =>
      prev.some((s) => s.uuid === skin.uuid)
        ? prev.filter((s) => s.uuid !== skin.uuid)
        : [...prev, normalize(skin)],
    );
  }, []);

  const remove = useCallback((uuid: string) => {
    setSkins((prev) => prev.filter((s) => s.uuid !== uuid));
  }, []);

  const value = useMemo(() => ({ skins, has, toggle, remove }), [skins, has, toggle, remove]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}
