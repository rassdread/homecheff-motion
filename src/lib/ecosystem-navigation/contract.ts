/**
 * Canonical HomeCheff ecosystem navigation contract (UX SSOT).
 * Keep this file aligned across HomeCheff / Studio / Growth repositories.
 *
 * Navigation only — never mint studio_session / growth_session / shared cookies.
 */

export type EcosystemProductId = "homecheff" | "studio" | "growth";

export const ECOSYSTEM_NAV_LABEL = "Ontdek HomeCheff";
export const ECOSYSTEM_PANEL_HEADING = "Meer van HomeCheff";
export const ECOSYSTEM_PANEL_SUPPORT =
  "Ontdek wat je nog meer kunt doen met HomeCheff.";

/** Canonical square mark on the identity owner (cache-busted). */
export const ECOSYSTEM_BRAND_MARK_URL =
  "https://homecheff.eu/icon-192.png?v=hc8";

export type EcosystemProduct = {
  id: EcosystemProductId;
  name: string;
  compactName: string;
  benefit: string;
  detail?: string;
  href: string;
};

export const ECOSYSTEM_PRODUCTS: readonly EcosystemProduct[] = [
  {
    id: "homecheff",
    name: "HomeCheff",
    compactName: "HomeCheff",
    benefit: "Ontdek, deel en verdien lokaal.",
    detail: "Zelfgemaakte producten, diensten en lokaal vakmanschap.",
    href: "https://homecheff.eu",
  },
  {
    id: "studio",
    name: "HomeCheff Studio",
    compactName: "Studio",
    benefit: "Maak content met creatieve AI.",
    detail: "Van idee tot beeld, video, stem en verhaal.",
    href: "https://studio.homecheff.eu",
  },
  {
    id: "growth",
    name: "HomeCheff Growth",
    compactName: "Growth",
    benefit: "Vind klanten en laat je bedrijf groeien.",
    detail: "Slimmer zoeken, leads vinden en kansen omzetten in groei.",
    href: "https://growth.homecheff.eu/auth/sso/silent?mode=ecosystem&returnTo=%2F",
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
