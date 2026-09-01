/**
 * Studio NL B2C paid checkout eligibility — B2C consumer boundary.
 * Free Studio is NOT gated by this module.
 */

export const STUDIO_NL_BILLING_COUNTRY = "NL" as const;

export const STUDIO_NL_NON_NL_CHECKOUT_MESSAGE =
  "Studio-abonnementen zijn momenteel alleen beschikbaar voor klanten in Nederland. Neem contact op via support@homecheff.nl als je buiten Nederland zit.";

export function isStudioNlBillingCountry(country: string | null | undefined): boolean {
  return (country ?? "").trim().toUpperCase() === STUDIO_NL_BILLING_COUNTRY;
}

export type StudioNlCheckoutGateResult =
  | { ok: true; billingCountry: typeof STUDIO_NL_BILLING_COUNTRY }
  | { ok: false; code: "NON_NL_SELF_SERVICE"; message: string };

export function assertStudioNlSelfServiceCheckout(input: {
  billingCountry: string | null | undefined;
}): StudioNlCheckoutGateResult {
  if (!isStudioNlBillingCountry(input.billingCountry)) {
    return {
      ok: false,
      code: "NON_NL_SELF_SERVICE",
      message: STUDIO_NL_NON_NL_CHECKOUT_MESSAGE,
    };
  }
  return { ok: true, billingCountry: STUDIO_NL_BILLING_COUNTRY };
}
