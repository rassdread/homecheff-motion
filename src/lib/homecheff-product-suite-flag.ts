/**
 * HomeCheff AI Suite five-product navigation — enabled by default.
 * Set NEXT_PUBLIC_HOMECHEFF_PRODUCT_SUITE_NAV=false to use legacy nav.
 */
export function isHomeCheffProductSuiteNavEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_HOMECHEFF_PRODUCT_SUITE_NAV?.trim().toLowerCase();
  if (raw === "false" || raw === "0") {
    return false;
  }
  return true;
}
