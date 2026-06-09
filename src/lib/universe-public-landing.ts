import { loginHref } from "@/lib/auth-login-href";
import type { TranslationKey } from "@/i18n";
import { UNIVERSE_PLANETS, resolveUniverseWelcomeMessages, type UniversePlanetId } from "@/lib/universe-home-config";
import type { HomeCheffProductId } from "@/types/homecheff-product-suite";

export const UNIVERSE_GLOBE_SPHERICAL_CLASS = "universe-globe-spherical";

export function resolveUniversePlanetHref(href: string, isAuthenticated: boolean): string {
  return isAuthenticated ? href : loginHref(href);
}

export function resolveUniversePlanetHrefs(
  isAuthenticated: boolean
): Record<UniversePlanetId, string> {
  const map = {} as Record<UniversePlanetId, string>;
  for (const planet of UNIVERSE_PLANETS) {
    map[planet.id] = resolveUniversePlanetHref(planet.href, isAuthenticated);
  }
  return map;
}

export function resolveUniverseQuickActionHref(href: string, isAuthenticated: boolean): string {
  return resolveUniversePlanetHref(href, isAuthenticated);
}

export function resolveUniversePublicHeadlineKey(isAuthenticated: boolean): TranslationKey {
  return isAuthenticated ? "universe.welcome.signedInHeadline" : "universe.public.headline";
}

export function resolveUniversePublicSubheadlineKey(isAuthenticated: boolean): TranslationKey {
  return isAuthenticated ? "universe.welcome.create" : "universe.public.subheadline";
}

export function resolveUniversePrimaryCtaHref(isAuthenticated: boolean): string {
  return isAuthenticated ? "/editor" : loginHref("/editor");
}

export function resolveUniversePrimaryCtaKey(isAuthenticated: boolean): TranslationKey {
  return isAuthenticated ? "universe.public.continueCreating" : "universe.public.startCreating";
}

export function resolveUniverseSecondaryCtaHref(isAuthenticated: boolean): string {
  return isAuthenticated ? "/library" : "/login";
}

export function resolveUniverseSecondaryCtaKey(isAuthenticated: boolean): TranslationKey {
  return isAuthenticated ? "universe.quick.openLibrary" : "nav.login";
}

export function resolveSuiteNavHref(
  href: string,
  isAuthenticated: boolean,
  productId?: HomeCheffProductId
): string {
  if (isAuthenticated || !productId) {
    return href;
  }
  if (href === "/maak" || href === "/") {
    return href;
  }
  if (href === "/pricing" || href.startsWith("/pricing")) {
    return href;
  }
  return loginHref(href);
}

export function resolveUniversePlanetLabel(planetId: UniversePlanetId): string {
  return planetId.toUpperCase();
}

export function resolveUniverseWelcomeMessagesPublic(
  email: string | undefined,
  isAuthenticated: boolean
): TranslationKey[] {
  if (!isAuthenticated) {
    return ["universe.public.headline"];
  }
  return resolveUniverseWelcomeMessages(email);
}
