export function formatPriceEur(amount: number | null | undefined, locale: "nl" | "en" = "nl"): string {
  const n = Number(amount);
  const safe = Number.isFinite(n) ? n : 0;
  const formatted = safe.toFixed(2).replace(".", locale === "nl" ? "," : ".");
  return `€${formatted}`;
}
