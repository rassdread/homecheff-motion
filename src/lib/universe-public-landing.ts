import { loginHref } from "@/lib/auth-login-href";
import type { TranslationKey } from "@/i18n";
import { UNIVERSE_PLANETS, resolveUniverseWelcomeMessages, type UniversePlanetId } from "@/lib/universe-home-config";
import type { HomeCheffProductId } from "@/types/homecheff-product-suite";

export const UNIVERSE_GLOBE_SPHERICAL_CLASS = "universe-globe-spherical";
export const UNIVERSE_HOW_IT_WORKS_PATH = "/hoe-het-werkt";
export const UNIVERSE_WHY_STUDIO_PATH = "/hoe-werkt-studio";

export const UNIVERSE_HERO_PIPELINE_KEYS = [
  "universe.hero.pipeline.images",
  "universe.hero.pipeline.stories",
  "universe.hero.pipeline.scenes",
  "universe.hero.pipeline.publish",
] as const satisfies readonly TranslationKey[];

export const UNIVERSE_HERO_HIGHLIGHT_KEYS = [
  "universe.hero.highlight.voiceovers",
  "universe.hero.highlight.music",
  "universe.hero.highlight.languages",
  "universe.hero.highlight.subtitles",
  "universe.hero.highlight.branding",
  "universe.hero.highlight.ctas",
] as const satisfies readonly TranslationKey[];

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
  return isAuthenticated ? "universe.welcome.signedInHeadline" : "universe.hero.welcomeSignedOut";
}

export function resolveUniversePublicSubheadlineKey(isAuthenticated: boolean): TranslationKey {
  return isAuthenticated ? "universe.hero.signedInReady" : "universe.hero.leadA";
}

export function resolveUniverseStartProjectHref(isAuthenticated: boolean): string {
  return isAuthenticated ? "/editor" : loginHref("/editor");
}

export function resolveUniverseHowItWorksHref(): string {
  return UNIVERSE_WHY_STUDIO_PATH;
}

export function resolveUniverseWhyStudioHref(): string {
  return UNIVERSE_WHY_STUDIO_PATH;
}

export function resolveUniversePrimaryCtaHref(isAuthenticated: boolean): string {
  return resolveUniverseStartProjectHref(isAuthenticated);
}

export function resolveUniversePrimaryCtaKey(isAuthenticated: boolean): TranslationKey {
  return isAuthenticated
    ? "universe.public.continueCreating"
    : "universe.hero.cta.startProject";
}

export function resolveUniverseSecondaryCtaHref(isAuthenticated: boolean): string {
  return isAuthenticated ? "/library" : "/login";
}

export function resolveUniverseSecondaryCtaKey(isAuthenticated: boolean): TranslationKey {
  return isAuthenticated ? "universe.quick.openLibrary" : "universe.hero.cta.signIn";
}

export function resolveSuiteNavHref(
  href: string,
  isAuthenticated: boolean,
  productId?: HomeCheffProductId
): string {
  if (isAuthenticated || !productId) {
    return href;
  }
  if (href === "/maak") {
    return "/";
  }
  if (href === "/") {
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

export function resolveUniversePlanetShortKey(planetId: UniversePlanetId): TranslationKey {
  return `universe.planet.${planetId}.short` as TranslationKey;
}

export function resolveUniverseWelcomeMessagesPublic(
  email: string | undefined,
  isAuthenticated: boolean
): TranslationKey[] {
  if (!isAuthenticated) {
    return ["universe.hero.welcomeSignedOut"];
  }
  return resolveUniverseWelcomeMessages(email);
}
