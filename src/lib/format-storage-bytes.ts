/** Human-readable byte sizes for storage UI. */
export function formatStorageBytes(bytes: number | null | undefined, locale = "en"): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) {
    return "—";
  }
  if (bytes === 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  const formatted = value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${Number(formatted).toLocaleString(locale === "nl" ? "nl-NL" : "en-US")} ${units[index]}`;
}

export function sumNullableBytes(values: Array<number | null | undefined>): number {
  return values.reduce<number>((total, value) => {
    if (value == null || !Number.isFinite(value)) {
      return total;
    }
    return total + value;
  }, 0);
}
