import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

export function assertStripeSecretKeyConfigured(): void {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to enable Instant Premium checkout."
    );
  }
}

export function getStripeClient(): Stripe {
  assertStripeSecretKeyConfigured();
  const key = process.env.STRIPE_SECRET_KEY!.trim();
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, {
      typescript: true,
    });
  }
  return stripeSingleton;
}
