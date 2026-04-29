export type InstantPremiumMode = "test" | "paid";

export function getInstantPremiumMode(): InstantPremiumMode {
  return process.env.INSTANT_PREMIUM_MODE === "paid" ? "paid" : "test";
}
