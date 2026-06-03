/** Build a URL-safe slug base from a display name. */
export function slugifyCharacterName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base.length > 0 ? base : "character";
}

/** Append numeric suffix when slug collides (chef, chef-2, …). */
export function nextSlugCandidate(base: string, attempt: number): string {
  if (attempt <= 0) {
    return base;
  }
  const suffix = `-${attempt + 1}`;
  const maxBase = Math.max(1, 48 - suffix.length);
  return `${base.slice(0, maxBase)}${suffix}`;
}
