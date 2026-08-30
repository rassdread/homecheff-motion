/**
 * HomeCheff ecosystem IP → default language (Marketplace / Growth / Studio parity).
 *
 * Rule (when no saved preference):
 *   NL | BE | SR → nl
 *   all other / unknown → en
 *
 * Preference priority:
 *   1. Explicit preference (switcher / hc_locale_pref)
 *   2. Account preferredLanguage (caller supplies)
 *   3. Existing language cookie (any prior visit, including IP-seeded)
 *   4. IP country (this request)
 *   5. English
 *
 * Shared cookie: `hc_locale` (+ `hc_locale_pref`) on Domain=.homecheff.eu in production.
 * Does not touch auth/session cookies.
 */

export type EcosystemLanguage = 'nl' | 'en';

/** Canonical shared preference cookie across *.homecheff.eu */
export const ECOSYSTEM_LOCALE_COOKIE = 'hc_locale';

/** Set to "1" when the user (or account sync) explicitly chose a language. */
export const ECOSYSTEM_LOCALE_PREF_COOKIE = 'hc_locale_pref';

/** Legacy Marketplace cookie — still read/written for compatibility. */
export const MARKETPLACE_LEGACY_LOCALE_COOKIE = 'homecheff-language';

export const DUTCH_DEFAULT_COUNTRIES = new Set(['NL', 'BE', 'SR']);

export function normalizeCountryCode(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const c = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return null;
  if (c === 'XX' || c === 'T1' || c === 'A1' || c === 'A2') return null;
  return c;
}

/** Country-only → UI language. Unknown / invalid → en. */
export function languageFromCountryCode(
  country: string | null | undefined,
): EcosystemLanguage {
  const c = normalizeCountryCode(country);
  if (!c) return 'en';
  return DUTCH_DEFAULT_COUNTRIES.has(c) ? 'nl' : 'en';
}

export function parseEcosystemLanguage(
  raw: string | null | undefined,
): EcosystemLanguage | null {
  if (!raw || typeof raw !== 'string') return null;
  const v = raw.trim().toLowerCase();
  if (v === 'nl' || v === 'en') return v;
  return null;
}

export function countryFromRequestHeaders(
  getHeader: (name: string) => string | null,
): string | null {
  return (
    normalizeCountryCode(getHeader('x-vercel-ip-country')) ??
    normalizeCountryCode(getHeader('cf-ipcountry'))
  );
}

export type ResolveEcosystemLanguageInput = {
  /** Switcher / explicit pref cookie (hc_locale_pref=1) + language cookie/storage */
  explicitLanguage?: string | null;
  /** Account profile preferredLanguage */
  accountLanguage?: string | null;
  /** Existing hc_locale / homecheff-language / localStorage without requiring explicit flag */
  cookieLanguage?: string | null;
  /** ISO country from Vercel/CF geo — country only, never city/coords */
  countryCode?: string | null;
  /**
   * Optional SEO/path hint (e.g. /en/…). Does not count as saved preference.
   * Applied only when nothing above resolved.
   */
  pathLanguage?: string | null;
};

/**
 * Full priority resolver for the ecosystem.
 * IP is never used when any preference (explicit, account, or cookie) exists.
 */
export function resolveEcosystemLanguage(
  input: ResolveEcosystemLanguageInput,
): EcosystemLanguage {
  const explicit = parseEcosystemLanguage(input.explicitLanguage);
  if (explicit) return explicit;

  const account = parseEcosystemLanguage(input.accountLanguage);
  if (account) return account;

  const cookie = parseEcosystemLanguage(input.cookieLanguage);
  if (cookie) return cookie;

  const path = parseEcosystemLanguage(input.pathLanguage);
  if (path) return path;

  return languageFromCountryCode(input.countryCode);
}

export type EcosystemLocaleCookieOptions = {
  language: EcosystemLanguage;
  /** true = user/account chose this; false = IP seed only */
  explicit: boolean;
  /** From getAuthSessionCookieDomain() / production → '.homecheff.eu' */
  domain?: string;
  maxAgeSec?: number;
  secure?: boolean;
};

/** Attributes for Set-Cookie / document.cookie (language only — never auth). */
export function ecosystemLocaleCookieAttributes(
  opts: EcosystemLocaleCookieOptions,
): { name: string; value: string; path: string; maxAge: number; sameSite: 'lax'; secure: boolean; domain?: string }[] {
  const maxAge = opts.maxAgeSec ?? 60 * 60 * 24 * 400;
  const secure = opts.secure ?? true;
  const base = {
    path: '/',
    maxAge,
    sameSite: 'lax' as const,
    secure,
    ...(opts.domain ? { domain: opts.domain } : {}),
  };
  const out = [
    { name: ECOSYSTEM_LOCALE_COOKIE, value: opts.language, ...base },
    {
      name: ECOSYSTEM_LOCALE_PREF_COOKIE,
      value: opts.explicit ? '1' : '0',
      ...base,
    },
  ];
  return out;
}

/** Client document.cookie writer for shared ecosystem locale. */
export function formatEcosystemLocaleDocumentCookies(
  opts: EcosystemLocaleCookieOptions,
): string[] {
  const attrs = ecosystemLocaleCookieAttributes(opts);
  return attrs.map((a) => {
    const expires = new Date(Date.now() + a.maxAge * 1000).toUTCString();
    const domainPart = a.domain ? `; Domain=${a.domain}` : '';
    const securePart = a.secure ? '; Secure' : '';
    return `${a.name}=${encodeURIComponent(a.value)}; Path=${a.path}; Max-Age=${a.maxAge}; Expires=${expires}; SameSite=Lax${securePart}${domainPart}`;
  });
}

export function shouldUseSharedHomecheffLocaleDomain(hostname: string): boolean {
  const h = hostname.toLowerCase().split(':')[0];
  return h === 'homecheff.eu' || h.endsWith('.homecheff.eu');
}
