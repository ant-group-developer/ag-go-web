/**
 * Pages that must be reachable without signing in. Google OAuth verification requires the
 * homepage, privacy policy and terms of service to be publicly accessible on the app domain.
 */
export const LEGAL_PATHS = {
  about: '/about',
  privacy: '/privacy',
  terms: '/terms',
} as const;

export type LegalPageKey = keyof typeof LEGAL_PATHS;

export function matchLegalPage(pathname: string): LegalPageKey | null {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  const entry = Object.entries(LEGAL_PATHS).find(([, path]) => path === normalized);
  return entry ? (entry[0] as LegalPageKey) : null;
}

/** Date shown as "last updated" on the policy pages; bump it whenever the wording changes. */
export const LEGAL_EFFECTIVE_DATE = '2026-09-25';
