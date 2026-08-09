/**
 * S.6E — Explicit aspect ratio resolution.
 * Current Studio handoff frequently forces 9:16 — preserve that as product default unless overridden.
 *
 * Precedence (highest wins when present):
 * 1. userOverride
 * 2. platformDefault (when platform selected and no user override)
 * 3. experienceDefault
 * 4. productDefault (Studio handoff: 9:16)
 * 5. providerSupported (pick closest / first supported if current unsupported)
 */

export type AspectProvenance =
  | "user_override"
  | "platform_default"
  | "experience_default"
  | "product_default"
  | "provider_supported"
  | "unresolved";

export type AspectSources = {
  requested?: string | null;
  userOverride?: string | null;
  experienceDefault?: string | null;
  platformDefault?: string | null;
  productDefault?: string | null;
  providerSupported?: string[] | null;
};

export type ResolvedAspect = {
  resolved: string | null;
  requested: string | null;
  provenance: AspectProvenance;
  sources: AspectSources;
  why: string;
};

const PRODUCT_DEFAULT_ASPECT = "9:16";

export function resolveAspect(sources: AspectSources): ResolvedAspect {
  const userOverride = sources.userOverride?.trim() || null;
  const requested = sources.requested?.trim() || userOverride;
  const experienceDefault = sources.experienceDefault?.trim() || null;
  const platformDefault = sources.platformDefault?.trim() || null;
  const productDefault = sources.productDefault?.trim() || PRODUCT_DEFAULT_ASPECT;
  const supported = (sources.providerSupported ?? []).map((s) => s.trim()).filter(Boolean);

  let resolved: string | null = null;
  let provenance: AspectProvenance = "unresolved";
  let why = "no aspect source";

  if (userOverride) {
    resolved = userOverride;
    provenance = "user_override";
    why = "explicit user aspect choice";
  } else if (platformDefault) {
    resolved = platformDefault;
    provenance = "platform_default";
    why = "platform distribution default";
  } else if (experienceDefault) {
    resolved = experienceDefault;
    provenance = "experience_default";
    why = "experience default aspect";
  } else if (productDefault) {
    resolved = productDefault;
    provenance = "product_default";
    why = "Studio product default (handoff historically 9:16)";
  }

  if (resolved && supported.length > 0 && !supported.includes(resolved)) {
    const fallback = supported[0] ?? null;
    if (fallback) {
      resolved = fallback;
      provenance = "provider_supported";
      why = `requested aspect unsupported; using provider-supported ${fallback}`;
    }
  }

  return {
    resolved,
    requested: requested ?? null,
    provenance,
    sources: {
      requested,
      userOverride,
      experienceDefault,
      platformDefault,
      productDefault,
      providerSupported: supported,
    },
    why,
  };
}

export { PRODUCT_DEFAULT_ASPECT };
