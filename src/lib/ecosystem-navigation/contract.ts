/**
 * Canonical HomeCheff ecosystem navigation contract (UX SSOT).
 * Keep this file aligned across HomeCheff / Studio / Growth repositories.
 *
 * U4 — one ecosystem shell. Navigation only —
 * never mint studio_session / growth_session / shared cookies.
 */

export type EcosystemProductId = "homecheff" | "studio" | "growth" | "affiliate";

export const ECOSYSTEM_MASTER_BRAND = "HomeCheff";
export const ECOSYSTEM_MASTER_SLOGAN = "Everybody Eats.";
export const ECOSYSTEM_NAV_LABEL = "Ontdek HomeCheff";
export const ECOSYSTEM_PANEL_HEADING = "Meer van HomeCheff";
export const ECOSYSTEM_PANEL_SUPPORT =
  "Eén HomeCheff — Marketplace, Studio, Growth en Affiliate.";

/** Authenticated personal ecosystem hub (Marketplace host). */
export const ECOSYSTEM_HUB_LABEL = "Mijn HomeCheff";
export const ECOSYSTEM_HUB_HREF = "https://homecheff.eu/mijn-homecheff";
export const ECOSYSTEM_HUB_PUBLIC_HREF = "https://homecheff.eu/mijn-homecheff";

/** Canonical square mark — local synced copy of HC Production icon-192 (SP.2C). */
export const ECOSYSTEM_BRAND_MARK_URL = "/brand/homecheff-mark.png";

export type EcosystemProduct = {
  id: EcosystemProductId;
  name: string;
  compactName: string;
  benefit: string;
  detail?: string;
  /** Authenticated / in-app deep link (may use silent SSO). */
  href: string;
  /** Public product root — preferred for marketing, footer, and crawlable surfaces. */
  publicHref: string;
  /** Optional pricing / earnings rules entry. */
  pricingHref?: string;
};

export const ECOSYSTEM_PRODUCTS: readonly EcosystemProduct[] = [
  {
    id: "homecheff",
    name: "HomeCheff Marketplace",
    compactName: "Marketplace",
    benefit: "Koop, verkoop en ontdek lokaal.",
    detail: "Zelfgemaakte producten, diensten en lokaal vakmanschap.",
    href: "https://homecheff.eu",
    publicHref: "https://homecheff.eu/",
    pricingHref: "https://homecheff.eu/pricing",
  },
  {
    id: "studio",
    name: "HomeCheff Studio",
    compactName: "Studio",
    benefit: "Maak content voor wat je maakt en verkoopt.",
    detail: "Van idee tot beeld, video, stem en verhaal.",
    href: "https://studio.homecheff.eu/auth/sso/silent?mode=ecosystem&returnTo=%2F",
    publicHref: "https://studio.homecheff.eu/",
    pricingHref: "https://studio.homecheff.eu/pricing",
  },
  {
    id: "growth",
    name: "HomeCheff Growth",
    compactName: "Growth",
    benefit: "Vind en ontwikkel nieuwe klanten.",
    detail: "Slimmer zoeken, leads vinden en kansen omzetten in groei.",
    href: "https://growth.homecheff.eu/auth/sso/silent?mode=ecosystem&returnTo=%2F",
    publicHref: "https://growth.homecheff.eu/",
    pricingHref: "https://growth.homecheff.eu/",
  },
  {
    id: "affiliate",
    name: "HomeCheff Affiliate",
    compactName: "Affiliate",
    benefit: "Deel HomeCheff en verdien op in aanmerking komende omzet.",
    detail:
      "Regels verschillen per product. Credits/HC horen niet automatisch bij 50/50.",
    href: "https://homecheff.eu/affiliate",
    publicHref: "https://homecheff.eu/affiliate",
    pricingHref: "https://homecheff.eu/affiliate",
  },
] as const;

export type EcosystemNavSurface =
  | "sidebar"
  | "header"
  | "account_menu"
  | "mobile_menu"
  | "marketing"
  | "footer";

export function ecosystemProductById(id: EcosystemProductId): EcosystemProduct {
  const found = ECOSYSTEM_PRODUCTS.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown ecosystem product: ${id}`);
  return found;
}

/** Marketing/footer surfaces use public roots so crawlers see clean product URLs. */
export function ecosystemProductHref(
  product: EcosystemProduct,
  surface: EcosystemNavSurface,
): string {
  if (surface === "marketing" || surface === "footer") {
    return product.publicHref;
  }
  return product.href;
}

export function ecosystemCurrentModuleLabel(id: EcosystemProductId): string {
  return ecosystemProductById(id).compactName;
}
