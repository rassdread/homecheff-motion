/**
 * Studio opens the one HomeCheff affiliate environment.
 * It does not host a second dashboard, programme, or careers site.
 */

export const CENTRAL_AFFILIATE_DASHBOARD_HREF = "https://homecheff.eu/affiliate/dashboard";

export const STUDIO_PROMOTE_HREF = "https://homecheff.eu/affiliate/dashboard/promoten/studio";

export const STUDIO_PROMO_LIBRARY_HREF =
  "https://homecheff.eu/affiliate/promotiemateriaal?platform=studio";

/** Existing ecosystem activation page. Not a Studio signup. */
export const BECOME_AFFILIATE_HREF = "https://homecheff.eu/affiliate";

export function studioCareersHref(locale: string): string {
  return locale === "en" ? "https://homecheff.eu/careers" : "https://homecheff.eu/werken-bij";
}

export type StudioAffiliateNavKind = "dashboard" | "activate";

export function studioAffiliateNavEntry(input: { dashboardAccess: boolean }): {
  href: string;
  kind: StudioAffiliateNavKind;
} {
  if (input.dashboardAccess) {
    return { href: CENTRAL_AFFILIATE_DASHBOARD_HREF, kind: "dashboard" };
  }
  return { href: BECOME_AFFILIATE_HREF, kind: "activate" };
}
