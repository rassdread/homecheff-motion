/** Official plan storage limits (GB) — shared by server config, billing policy, and UI. */

export const OFFICIAL_PLAN_STORAGE_GB = {
  free: 1,
  creator: 5,
  pro: 25,
  studio: 100,
} as const;

export type OfficialStoragePlanId = keyof typeof OFFICIAL_PLAN_STORAGE_GB;

export const OFFICIAL_STORAGE_PLAN_IDS: OfficialStoragePlanId[] = [
  "free",
  "creator",
  "pro",
  "studio",
];

/** Format storage for plan cards (always whole GB). */
export function formatPlanStorageGb(gb: number, locale: "nl" | "en" = "nl"): string {
  const value = Number.isFinite(gb) ? Math.round(gb) : 0;
  return locale === "nl" ? `${value} GB` : `${value} GB`;
}
