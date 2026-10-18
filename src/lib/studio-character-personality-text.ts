/**
 * Add or remove a chip label without replacing free-form character text.
 * A chip matches only a whole comma-separated part, not a word inside a sentence.
 */

function partsOf(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function personalityChipSelected(value: string, label: string): boolean {
  const needle = label.trim().toLowerCase();
  if (!needle) return false;
  return partsOf(value).some((part) => part.toLowerCase() === needle);
}

export function togglePersonalityChip(value: string, label: string): string {
  const chip = label.trim();
  if (!chip) return value;
  const parts = partsOf(value);
  const index = parts.findIndex((part) => part.toLowerCase() === chip.toLowerCase());
  if (index >= 0) {
    parts.splice(index, 1);
    return parts.join(", ");
  }
  if (!value.trim()) return chip;
  return `${value.trim().replace(/,\s*$/, "")}, ${chip}`;
}
