export const STUDIO_CHARACTER_ROLES = [
  "human",
  "mascot",
  "animal",
  "object",
  "other",
] as const;

export type StudioCharacterRole = (typeof STUDIO_CHARACTER_ROLES)[number];

export function isStudioCharacterRole(value: string): value is StudioCharacterRole {
  return (STUDIO_CHARACTER_ROLES as readonly string[]).includes(value);
}

/** HomeCheff brand accents for role badges (UI). */
export const STUDIO_CHARACTER_ROLE_BADGE_CLASS: Record<StudioCharacterRole, string> = {
  mascot: "border-[#006D52]/35 bg-[#006D52]/10 text-[#006D52]",
  human: "border-[#0067B1]/35 bg-[#0067B1]/10 text-[#0067B1]",
  animal: "border-amber-300/80 bg-amber-50 text-amber-800",
  object: "border-violet-300/80 bg-violet-50 text-violet-800",
  other: "border-zinc-200 bg-zinc-100 text-zinc-600",
};

export function roleSetsMascotFlag(role: StudioCharacterRole): boolean {
  return role === "mascot";
}
