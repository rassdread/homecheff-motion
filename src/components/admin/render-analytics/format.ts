export function usd(value: number): string {
  if (!Number.isFinite(value)) {
    return "$0.00";
  }
  return `$${value.toFixed(2)}`;
}

export function projectLabel(title: string | null, projectId: string, max = 28): string {
  const raw = title?.trim() || projectId;
  return raw.length > max ? `${raw.slice(0, max)}…` : raw;
}
