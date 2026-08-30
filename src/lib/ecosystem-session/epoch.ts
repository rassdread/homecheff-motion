/**
 * U5 — ecosystem identity epoch (Studio mirror).
 */

export const HC_ECO_EPOCH_COOKIE = "hc_eco_epoch";
export const HC_ECO_EPOCH_LOGGED_OUT = "0";

export function readEcosystemEpochFromCookieJar(get: (name: string) => string | undefined): string | null {
  const v = get(HC_ECO_EPOCH_COOKIE)?.trim();
  return v || null;
}

export type EcosystemEpochCheck =
  | { ok: true; reason: "match" | "legacy_unbound" | "no_cookie_preview" }
  | {
      ok: false;
      reason:
        | "PRODUCT_SESSION_MISMATCH"
        | "ECOSYSTEM_IDENTITY_CHANGED"
        | "ECOSYSTEM_LOGGED_OUT";
    };

export function checkProductEpochBinding(
  boundEpoch: string | null | undefined,
  cookieEpoch: string | null | undefined,
): EcosystemEpochCheck {
  if (cookieEpoch === HC_ECO_EPOCH_LOGGED_OUT) {
    return { ok: false, reason: "ECOSYSTEM_LOGGED_OUT" };
  }
  if (!boundEpoch) {
    return { ok: true, reason: "legacy_unbound" };
  }
  if (!cookieEpoch) {
    return { ok: true, reason: "no_cookie_preview" };
  }
  if (boundEpoch !== cookieEpoch) {
    return { ok: false, reason: "ECOSYSTEM_IDENTITY_CHANGED" };
  }
  return { ok: true, reason: "match" };
}
