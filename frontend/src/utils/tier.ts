const TIER_COLOR_MAP: Record<string, string> = {
  select: 'var(--color-tier-select)',
  deluxe: 'var(--color-tier-deluxe)',
  premium: 'var(--color-tier-premium)',
  ultra: 'var(--color-tier-ultra)',
  exclusive: 'var(--color-tier-exclusive)',
};

export function getTierColor(tierName: string, apiColor: string): string {
  const key = tierName.toLowerCase().replace(/\s*edition$/i, '');
  return TIER_COLOR_MAP[key] || (apiColor ? `#${apiColor.slice(0, 6)}` : 'var(--color-text-secondary)');
}
