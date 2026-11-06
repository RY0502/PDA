export const FREEDIUM_WEB_BASE_URL =
  process.env.NEXT_PUBLIC_FREEDIUM_WEB_BASE_URL ||
  'https://freedium-mirror-web.vercel.app';

export const FREEDIUM_PREPEND_BASE_URL =
  process.env.NEXT_PUBLIC_FREEDIUM_PREPEND_BASE_URL ||
  process.env.NEXT_PUBLIC_FREEDIUM_PREPEND_URL ||
  process.env.NEXT_PUBLIC_FREEDIUM_MIRROR_URL ||
  process.env.NEXT_PUBLIC_FREEDIUM_BASE_URL ||
  'https://freedium-mirror.cfd';

export type FreediumMode = 'web' | 'prepend';

export const FREEDIUM_STORAGE_KEY = 'medium_article_opener_mode';
export const FREEDIUM_MODE_CHANGE_EVENT = 'medium_opener_mode_changed';

/**
 * Reads the active Freedium opener mode from localStorage.
 * Defaults to 'web' (the current / first mechanism).
 */
export function getStoredFreediumMode(): FreediumMode {
  if (typeof window === 'undefined') return 'web';
  try {
    const val = localStorage.getItem(FREEDIUM_STORAGE_KEY);
    if (val === 'prepend' || val === 'web') {
      return val;
    }
  } catch {
    // ignore
  }
  return 'web';
}

/**
 * Stores the active Freedium opener mode in localStorage and notifies listeners.
 */
export function setStoredFreediumMode(mode: FreediumMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FREEDIUM_STORAGE_KEY, mode);
    window.dispatchEvent(
      new CustomEvent(FREEDIUM_MODE_CHANGE_EVENT, { detail: mode })
    );
  } catch {
    // ignore
  }
}

/**
 * Normalizes input article URL so that it is a valid web URL.
 */
export function normalizeArticleUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

/**
 * Builds the URL to open Medium article via the specified mode.
 * - 'web': https://freedium-mirror-web.vercel.app/read?url=<articleUrl>
 * - 'prepend': https://freedium-mirror.cfd/<articleUrl>
 */
export function buildFreediumUrl(
  articleUrl: string,
  mode: FreediumMode = 'web'
): string {
  const normalized = normalizeArticleUrl(articleUrl);
  if (!normalized) return '';

  if (mode === 'prepend') {
    const base = FREEDIUM_PREPEND_BASE_URL.replace(/\/+$/, '');
    // If articleUrl already includes the prepend base, don't duplicate it
    if (normalized.startsWith(base)) {
      return normalized;
    }
    return `${base}/${normalized}`;
  }

  // Web query parameter mode
  const base = FREEDIUM_WEB_BASE_URL.replace(/\/+$/, '');
  const urlObj = new URL('/read', base);
  urlObj.searchParams.set('url', normalized);
  return urlObj.toString();
}
