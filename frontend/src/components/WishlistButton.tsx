interface WishlistButtonProps {
  active: boolean;
  onToggle: () => void;
  /** Skin name, used for the accessible label. */
  skinName: string;
  className?: string;
  size?: 'sm' | 'md';
}

export default function WishlistButton({
  active,
  onToggle,
  skinName,
  className = '',
  size = 'md',
}: WishlistButtonProps) {
  const label = active ? `Remove ${skinName} from wishlist` : `Add ${skinName} to wishlist`;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`rounded-full bg-bg-primary/70 p-1.5 backdrop-blur transition-colors ${
        active ? 'text-accent-red' : 'text-text-secondary hover:text-accent-red'
      } ${className}`}
    >
      <svg
        className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'}
        viewBox="0 0 24 24"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    </button>
  );
}
