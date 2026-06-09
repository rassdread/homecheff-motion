/**
 * HomeCheff AI Suite five-product navigation — disabled by default.
 * Set NEXT_PUBLIC_HOMECHEFF_PRODUCT_SUITE_NAV=true to activate Editor / Studio / Motion / Publish / Library nav.
 */
export function isHomeCheffProductSuiteNavEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_HOMECHEFF_PRODUCT_SUITE_NAV?.trim().toLowerCase();
  return raw === "true" || raw === "1";
}
