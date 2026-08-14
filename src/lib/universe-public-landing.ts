import { loginHref } from "@/lib/auth-login-href";
import type { TranslationKey } from "@/i18n";
import { UNIVERSE_PLANETS, resolveUniverseWelcomeMessages, type UniversePlanetId } from "@/lib/universe-home-config";
import type { HomeCheffProductId } from "@/types/homecheff-product-suite";

export const UNIVERSE_GLOBE_SPHERICAL_CLASS = "universe-globe-spherical";
export const UNIVERSE_HOW_IT_WORKS_PATH = "/hoe-het-werkt";
export const UNIVERSE_WHY_STUDIO_PATH = "/hoe-werkt-studio";
/** SP.3 — guided public creation entry (Experience Packs / intent funnel). */
export const UNIVERSE_GUIDED_CREATION_PATH = "/studio/experience";

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

/** Public product discovery landings — information before auth (SP.3). */
const PUBLIC_PRODUCT_DISCOVERY_HREFS = new Set([
  "/editor",
  "/studio",
  "/motion",
  "/publish",
  "/library",
  "/studio/experience",
  "/pricing",
  UNIVERSE_HOW_IT_WORKS_PATH,
  UNIVERSE_WHY_STUDIO_PATH,
]);

function isPublicProductDiscoveryHref(href: string): boolean {
  if (PUBLIC_PRODUCT_DISCOVERY_HREFS.has(href)) return true;
  if (href.startsWith("/editor/examples")) return true;
  if (href.startsWith("/studio/examples")) return true;
  if (href.startsWith("/motion/examples")) return true;
  if (href.startsWith("/publish/examples")) return true;
  if (href.startsWith("/pricing")) return true;
  if (href.startsWith("/help")) return true;
  return false;
}

export function resolveUniversePlanetHref(href: string, isAuthenticated: boolean): string {
  // SP.3: planets open public product pages; creation CTAs on those pages gate auth.
  if (isAuthenticated || isPublicProductDiscoveryHref(href)) {
    return href;
  }
  return loginHref(href);
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

/** Primary CTA: guided creation entry — not Editor-as-product-center (SP.3). */
export function resolveUniverseStartProjectHref(isAuthenticated: boolean): string {
  void isAuthenticated;
  return UNIVERSE_GUIDED_CREATION_PATH;
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
    : "universe.hero.cta.startWithIdea";
}

export function resolveUniverseSecondaryCtaHref(isAuthenticated: boolean): string {
  return isAuthenticated ? "/library" : UNIVERSE_WHY_STUDIO_PATH;
}

export function resolveUniverseSecondaryCtaKey(isAuthenticated: boolean): TranslationKey {
  return isAuthenticated ? "universe.quick.openLibrary" : "universe.hero.cta.howItWorks";
}

/**
 * Suite nav: anonymous users land on public product pages.
 * Auth is required only when they start creation from those pages.
 */
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
  if (isPublicProductDiscoveryHref(href)) {
    return href;
  }
  // Map product ids to public landings when href is a private start path
  const publicByProduct: Partial<Record<HomeCheffProductId, string>> = {
    editor: "/editor",
    studio: "/studio",
    motion: "/motion",
    presentation: "/publish",
    assets: "/library",
  };
  const discovery = publicByProduct[productId];
  if (discovery) {
    return discovery;
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
