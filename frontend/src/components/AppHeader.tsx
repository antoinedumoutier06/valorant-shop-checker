import { NavLink } from 'react-router-dom';
import { useWishlist } from '../hooks/useWishlist';
import type { Wallet } from '../types';
import AccountSwitcher from './AccountSwitcher';
import WalletDisplay from './WalletDisplay';

interface AppHeaderProps {
  wallet?: Wallet | null;
}

function navClass({ isActive }: { isActive: boolean }): string {
  return `flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium uppercase tracking-wider transition-colors ${
    isActive ? 'bg-bg-card text-text-primary' : 'text-text-secondary hover:text-text-primary'
  }`;
}

export default function AppHeader({ wallet }: AppHeaderProps) {
  const { skins } = useWishlist();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg-secondary/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <div className="flex items-center gap-4">
          <h1
            className="text-lg tracking-wider text-text-primary"
            style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700 }}
          >
            VAL<span className="text-accent-red">SHOP</span>
          </h1>

          <nav className="flex items-center gap-1" aria-label="Main">
            <NavLink to="/shop" className={navClass}>
              Shop
            </NavLink>
            <NavLink to="/wishlist" className={navClass}>
              Wishlist
              {skins.length > 0 && (
                <span className="rounded-full bg-accent-red px-1.5 text-[10px] font-bold leading-4 text-white">
                  {skins.length}
                </span>
              )}
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {wallet && <WalletDisplay wallet={wallet} />}
          <AccountSwitcher />
        </div>
      </div>
    </header>
  );
}
