import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import * as api from '../api/client';
import type { Account } from '../types';

const OSWALD = { fontFamily: "'Oswald', sans-serif" } as const;

export default function AccountSwitcher() {
  const { state, dispatch, activeAccount } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function handleSelect(account: Account) {
    dispatch({ type: 'SWITCH_ACCOUNT', puuid: account.puuid });
    setOpen(false);
  }

  function handleRemove(account: Account) {
    // Best effort: the server session is dropped, but the UI doesn't wait for it.
    api.logout(account.token).catch(() => {});
    dispatch({ type: 'REMOVE_ACCOUNT', puuid: account.puuid });
  }

  function handleAddOrReconnect() {
    setOpen(false);
    navigate('/add-account');
  }

  function handleLogoutAll() {
    state.accounts.forEach((account) => {
      api.logout(account.token).catch(() => {});
    });
    dispatch({ type: 'LOGOUT_ALL' });
    setOpen(false);
    navigate('/', { replace: true });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex max-w-48 items-center gap-2 rounded border border-border px-3 py-1.5 text-xs font-medium tracking-wider text-text-primary transition-colors hover:border-accent-red"
      >
        <span className="h-2 w-2 shrink-0 rounded-full bg-accent-teal" aria-hidden="true" />
        <span className="truncate">{activeAccount?.label ?? 'Account'}</span>
        <svg
          className={`h-3 w-3 shrink-0 text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="animate-slide-in absolute right-0 z-20 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-border bg-bg-secondary shadow-2xl"
        >
          <p
            className="border-b border-border px-4 py-2 text-[10px] uppercase tracking-widest text-text-secondary"
            style={OSWALD}
          >
            Accounts ({state.accounts.length})
          </p>

          <ul className="max-h-72 overflow-y-auto py-1">
            {state.accounts.map((account) => {
              const isActive = account.puuid === state.puuid;
              return (
                <li key={account.puuid} className="flex items-center gap-1 pr-2">
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={isActive}
                    disabled={account.expired}
                    onClick={() => handleSelect(account)}
                    className="flex min-w-0 flex-1 items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-bg-card disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        account.expired
                          ? 'bg-accent-red'
                          : isActive
                            ? 'bg-accent-teal'
                            : 'bg-text-secondary/40'
                      }`}
                      aria-hidden="true"
                    />
                    <span
                      className={`truncate ${isActive ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}
                    >
                      {account.label}
                    </span>
                  </button>

                  {account.expired && (
                    <button
                      type="button"
                      onClick={handleAddOrReconnect}
                      className="shrink-0 rounded border border-accent-red/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-red transition-colors hover:bg-accent-red hover:text-white"
                    >
                      Reconnect
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemove(account)}
                    aria-label={`Remove ${account.label}`}
                    title="Remove account"
                    className="shrink-0 rounded p-1 text-text-secondary transition-colors hover:text-accent-red"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <line x1="6" y1="6" x2="18" y2="18" />
                      <line x1="18" y1="6" x2="6" y2="18" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="space-y-1 border-t border-border p-2">
            <button
              type="button"
              role="menuitem"
              onClick={handleAddOrReconnect}
              className="w-full rounded bg-accent-red px-3 py-2 text-xs font-bold uppercase tracking-widest text-white transition-all hover:brightness-110"
              style={OSWALD}
            >
              + Add account
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogoutAll}
              className="w-full rounded px-3 py-2 text-xs uppercase tracking-widest text-text-secondary transition-colors hover:text-accent-red"
              style={OSWALD}
            >
              Log out of all accounts
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
