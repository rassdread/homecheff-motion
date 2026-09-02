/**
 * Studio referral cookie — survives landing → signup → checkout until centralUserId bind.
 */
export const STUDIO_AFFILIATE_REF_COOKIE = "hc_studio_aff_ref";
export const STUDIO_AFFILIATE_REF_MAX_AGE_SEC = 30 * 24 * 60 * 60;

export function readStudioAffiliateRefFromSearch(search: string): {
  affiliateCentralUserId?: string;
  affiliateSlug?: string;
} | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const ref = (params.get("ref") || params.get("aff") || "").trim();
  const slug = (params.get("affslug") || params.get("slug") || "").trim();
  if (!ref && !slug) return null;
  // cuid / uuid-like → treat as central/user id; otherwise Growth slug
  if (ref && /^[a-z0-9_-]{8,}$/i.test(ref) && !slug) {
    if (ref.includes("-") || ref.length > 20) {
      return { affiliateCentralUserId: ref };
    }
    return { affiliateSlug: ref.toLowerCase() };
  }
  return {
    ...(ref ? { affiliateCentralUserId: ref } : {}),
    ...(slug ? { affiliateSlug: slug.toLowerCase() } : {}),
  };
}
