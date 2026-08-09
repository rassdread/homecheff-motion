import Stripe from "stripe";
import {
  assertPriceLivemodeMatchesKey,
  resolveStripeSecretKeyMode,
  type StripeKeyMode,
} from "@/lib/stripe-mode";

let stripeSingleton: Stripe | null = null;
let stripeSingletonKey: string | null = null;

export function assertStripeSecretKeyConfigured(): void {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to enable Instant Premium checkout."
    );
  }
}

export function getStripeSecretKeyMode(): StripeKeyMode {
  return resolveStripeSecretKeyMode();
}

export function getStripeClient(): Stripe {
  assertStripeSecretKeyConfigured();
  const key = process.env.STRIPE_SECRET_KEY!.trim();
  if (!stripeSingleton || stripeSingletonKey !== key) {
    stripeSingleton = new Stripe(key, {
      typescript: true,
    });
    stripeSingletonKey = key;
  }
  return stripeSingleton;
}

/** Fail closed when a configured Price ID does not match the secret key mode. */
export async function assertConfiguredStripePriceMatchesKeyMode(
  priceId: string
): Promise<void> {
  const keyMode = getStripeSecretKeyMode();
  if (keyMode !== "live" && keyMode !== "test") return;
  const stripe = getStripeClient();
  const price = await stripe.prices.retrieve(priceId);
  assertPriceLivemodeMatchesKey({
    priceId,
    priceLivemode: price.livemode,
    keyMode,
  });
}
