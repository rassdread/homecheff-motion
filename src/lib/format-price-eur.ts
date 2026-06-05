export function formatPriceEur(amount: number, locale: "nl" | "en" = "nl"): string {
  const formatted = amount.toFixed(2).replace(".", locale === "nl" ? "," : ".");
  return `€${formatted}`;
}
