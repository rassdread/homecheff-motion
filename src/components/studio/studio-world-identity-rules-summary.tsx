"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { buildWorldIdentityRulePresence } from "@/lib/studio-world-identity-visual-hints";
import type { StudioWorldProfileListItem } from "@/types/studio-api";

type Props = {
  worlds: StudioWorldProfileListItem[];
};

const RULE_KEYS: Array<{ key: keyof ReturnType<typeof buildWorldIdentityRulePresence>; i18n: TranslationKey }> = [
  { key: "visual", i18n: "studio.worldIdentity.consistency.visual" },
  { key: "color", i18n: "studio.worldIdentity.consistency.color" },
  { key: "audio", i18n: "studio.worldIdentity.consistency.audio" },
  { key: "voice", i18n: "studio.worldIdentity.consistency.voice" },
  { key: "shots", i18n: "studio.worldIdentity.consistency.shots" },
  { key: "motion", i18n: "studio.worldIdentity.consistency.motion" },
  { key: "forbidden", i18n: "studio.worldIdentity.consistency.forbidden" },
];

export function StudioWorldIdentityRulesSummary({ worlds }: Props) {
  const t = useActiveTranslator();

  const primaryWorld = useMemo(
    () => worlds.find((w) => buildWorldIdentityRulePresence(w).visual) ?? worlds[0] ?? null,
    [worlds]
  );

  const presence = useMemo(
    () => (primaryWorld ? buildWorldIdentityRulePresence(primaryWorld) : null),
    [primaryWorld]
  );

  if (!primaryWorld || !presence) {
    return null;
  }

  const activeCount = RULE_KEYS.filter(({ key }) => presence[key]).length;
  if (activeCount === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-[#006D52]/20 bg-[#006D52]/5 p-4">
      <h3 className="text-sm font-semibold text-zinc-900">
        {t("studio.worldIdentity.consistency.title")}
      </h3>
      <p className="mt-1 text-xs text-zinc-600">
        {t("studio.worldIdentity.consistency.subtitle", { name: primaryWorld.name })}
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {RULE_KEYS.map(({ key, i18n }) => (
          <li
            key={key}
            className={`rounded-lg px-3 py-2 text-xs ${
              presence[key] ?
                "bg-white font-medium text-[#006D52]"
              : "bg-white/50 text-zinc-400"
            }`}
          >
            {presence[key] ? "✓ " : "○ "}
            {t(i18n)}
          </li>
        ))}
      </ul>
    </section>
  );
}
