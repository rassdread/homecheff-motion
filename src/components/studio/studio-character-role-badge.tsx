"use client";

import {
  STUDIO_CHARACTER_ROLE_BADGE_CLASS,
  isStudioCharacterRole,
  type StudioCharacterRole,
} from "@/lib/studio-character-roles";
import type { TranslationKey } from "@/i18n";
import { useActiveTranslator } from "@/i18n/client";

const ROLE_LABEL_KEYS: Record<StudioCharacterRole, TranslationKey> = {
  human: "studio.characters.role.human",
  mascot: "studio.characters.role.mascot",
  animal: "studio.characters.role.animal",
  object: "studio.characters.role.object",
  other: "studio.characters.role.other",
};

type StudioCharacterRoleBadgeProps = {
  role: StudioCharacterRole | string;
  className?: string;
};

export function StudioCharacterRoleBadge({ role, className = "" }: StudioCharacterRoleBadgeProps) {
  const t = useActiveTranslator();
  const label = isStudioCharacterRole(role) ? t(ROLE_LABEL_KEYS[role]) : role;
  const style =
    role in STUDIO_CHARACTER_ROLE_BADGE_CLASS
      ? STUDIO_CHARACTER_ROLE_BADGE_CLASS[role as StudioCharacterRole]
      : STUDIO_CHARACTER_ROLE_BADGE_CLASS.other;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${style} ${className}`}
    >
      {label}
    </span>
  );
}
