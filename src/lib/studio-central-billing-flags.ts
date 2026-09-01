/** Central Studio billing feature gates — mirror Growth CENTRAL_STUDIO_* flags. */

export function isCentralStudioTechnicalReady(): boolean {
  const flag = process.env.CENTRAL_STUDIO_TECHNICAL_READY?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "on";
}

export function isCentralStudioPublicAcquisitionEnabled(): boolean {
  const flag = process.env.CENTRAL_STUDIO_PUBLIC_ACQUISITION_ENABLED?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "on";
}

/** Paid checkout requires BOTH technical ready AND public acquisition ON. */
export function isCentralStudioPaidCheckoutEnabled(): boolean {
  return isCentralStudioTechnicalReady() && isCentralStudioPublicAcquisitionEnabled();
}

/** Legacy Motion Stripe checkout — retired once central technical prep is live. */
export function isLegacyStudioCheckoutRetired(): boolean {
  return isCentralStudioTechnicalReady();
}

/** Legacy Motion Stripe checkout — only when central prep is not deployed. */
export function useLegacyMotionStripeCheckout(): boolean {
  return !isCentralStudioTechnicalReady() && !isCentralStudioPaidCheckoutEnabled();
}
