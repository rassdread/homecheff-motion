"use client";

import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioContinuityStrength } from "@/lib/studio-continuity-strength";
import type { StudioIdentityStrength } from "@/lib/studio-memory-validation";

type MemoryField = { label: string; value: string };

function MemoryBlock({ title, fields }: { title: string; fields: MemoryField[] }) {
  const visible = fields.filter((f) => f.value.trim());
  if (visible.length === 0) {
    return null;
  }
  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-800">{title}</h3>
      <dl className="mt-2 space-y-2">
        {visible.map((field) => (
          <div key={field.label}>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {field.label}
            </dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-800">{field.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

type StudioAssetMemoryTabProps = {
  kind: "character" | "location" | "prop" | "world";
  worldName?: string | null;
  continuityStrength?: StudioContinuityStrength;
  identityStrength?: StudioIdentityStrength;
  fields: MemoryField[];
};

export function StudioAssetMemoryTab({
  kind,
  worldName,
  continuityStrength,
  identityStrength,
  fields,
}: StudioAssetMemoryTabProps) {
  const t = useActiveTranslator();

  return (
    <AppCard className="mt-6 p-6">
      <h2 className="text-lg font-semibold text-zinc-900">{t("studio.memory.tabTitle")}</h2>
      <p className="mt-1 text-sm text-zinc-600">{t(`studio.memory.tabHint.${kind}`)}</p>

      <div className="mt-6 space-y-6">
        {worldName ? (
          <p className="text-sm text-zinc-700">
            <span className="font-medium">{t("studio.memory.worldAssignment")}: </span>
            {worldName}
          </p>
        ) : null}
        {continuityStrength ? (
          <p className="text-sm text-zinc-700">
            <span className="font-medium">{t("studio.memory.continuityStrengthLabel")}: </span>
            {t(`studio.memory.continuityStrength.${continuityStrength}`)}
          </p>
        ) : null}
        {identityStrength ? (
          <p className="text-sm text-zinc-700">
            <span className="font-medium">{t("studio.memory.identityStrengthLabel")}: </span>
            {t(`studio.memory.identityStrength.${identityStrength}`)}
          </p>
        ) : null}
        <MemoryBlock title={t("studio.memory.visualIdentity")} fields={fields} />
      </div>
    </AppCard>
  );
}
