/**
 * Studio — All-ages technical invariants (Phase 3).
 *
 * Engineering contract only — NOT Terms/Privacy and NOT legal advice.
 * HomeCheff does not currently impose an additional product-level age gate
 * on these code paths. Provider ToS age rules remain PROVIDER_TERMS_REVIEW_REQUIRED.
 */

export const STUDIO_ALL_AGES_INVARIANTS = {
  GLOBAL_AGE_GATE: "NONE",
  DOB_REQUIRED: false,
  ACCOUNT_AGE_GATE: "NONE",
  STRIPE_REQUIRED_FOR_FREE: false,
  STRIPE_REQUIRED_FOR_PAID: true,
  /** Provider spend ≠ account age eligibility. */
  PROVIDER_ENTITLEMENT_IS_GLOBAL_AGE: false,
  /** Referral bind must not introduce an account-wide age gate. */
  AFFILIATE_BIND_IS_AGE_GATE: false,
} as const;

export const STUDIO_CAPABILITY_LAYERS = [
  "GENERAL_USE",
  "FREE_USE",
  "PAID_USE",
  "STRIPE_CUSTOMER",
  "STRIPE_CONNECT",
  "AFFILIATE_PROMOTION",
  "AFFILIATE_PAYOUT",
  "AI_PROVIDER_ENTITLEMENT",
] as const;

export type StudioCapabilityLayer = (typeof STUDIO_CAPABILITY_LAYERS)[number];

export const STUDIO_FORBIDDEN_USER_AGE_FIELDS = [
  "dateOfBirth",
  "birthDate",
  "birthdate",
  "dob",
  "isAdult",
  "isMinor",
  "parentalConsent",
  "ageVerified",
  "legalAge",
] as const;
