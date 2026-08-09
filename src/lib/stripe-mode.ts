/**
 * Stripe LIVE/TEST mode helpers — fail closed on mixed catalog configuration.
 */

export type StripeKeyMode = "live" | "test" | "missing" | "unknown";

export function resolveStripeSecretKeyMode(
  secretKey = process.env.STRIPE_SECRET_KEY?.trim() ?? ""
): StripeKeyMode {
  if (!secretKey) return "missing";
  if (secretKey.startsWith("sk_live_") || secretKey.startsWith("rk_live_") || secretKey.startsWith("rkcs_live_")) {
    return "live";
  }
  if (
    secretKey.startsWith("sk_test_") ||
    secretKey.startsWith("rk_test_") ||
    secretKey.startsWith("rkcs_test_")
  ) {
    return "test";
  }
  return "unknown";
}

export function isStripeCheckoutSessionIdMatchingMode(
  sessionId: string,
  mode: StripeKeyMode
): boolean {
  if (mode === "live") return sessionId.startsWith("cs_live_");
  if (mode === "test") return sessionId.startsWith("cs_test_");
  return false;
}

/**
 * Price IDs are opaque; we cannot classify from the string alone.
 * Callers that retrieve Stripe Price objects must compare `price.livemode`
 * to the secret key mode and reject mismatches.
 */
export function assertPriceLivemodeMatchesKey(input: {
  priceId: string;
  priceLivemode: boolean;
  keyMode: StripeKeyMode;
}): void {
  if (input.keyMode === "live" && !input.priceLivemode) {
    throw new Error(
      `STRIPE_MODE_MIXED: price ${input.priceId} is TEST but secret key is LIVE`
    );
  }
  if (input.keyMode === "test" && input.priceLivemode) {
    throw new Error(
      `STRIPE_MODE_MIXED: price ${input.priceId} is LIVE but secret key is TEST`
    );
  }
}
