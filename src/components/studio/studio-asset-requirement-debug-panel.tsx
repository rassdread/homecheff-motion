"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { RequirementDebugEntry } from "@/lib/studio-asset-requirement-routing";

type Props = {
  entry: RequirementDebugEntry | null;
};

export function StudioAssetRequirementDebugPanel({ entry }: Props) {
  const t = useActiveTranslator();

  if (!entry) {
    return null;
  }

  return (
    <aside
      className="rounded-xl border border-dashed border-amber-300 bg-amber-50/80 p-3 text-xs"
      data-testid="studio-asset-requirement-debug"
    >
      <p className="font-semibold text-amber-950">{t("studio.generateMissing.debug.title" as never)}</p>
      <dl className="mt-2 space-y-1 text-amber-900">
        <div>
          <dt className="inline font-medium">{t("studio.generateMissing.debug.action" as never)}: </dt>
          <dd className="inline">{entry.action}</dd>
        </div>
        <div>
          <dt className="inline font-medium">{t("studio.generateMissing.debug.endpoint" as never)}: </dt>
          <dd className="inline font-mono">{entry.endpoint}</dd>
        </div>
        <div>
          <dt className="inline font-medium">{t("studio.generateMissing.debug.at" as never)}: </dt>
          <dd className="inline">{entry.at}</dd>
        </div>
        {entry.ok != null ?
          <div>
            <dt className="inline font-medium">{t("studio.generateMissing.debug.ok" as never)}: </dt>
            <dd className="inline">{entry.ok ? "✓" : "✗"}</dd>
          </div>
        : null}
        {entry.error ?
          <div>
            <dt className="inline font-medium">{t("studio.generateMissing.debug.error" as never)}: </dt>
            <dd className="inline text-red-800">{entry.error}</dd>
          </div>
        : null}
      </dl>
    </aside>
  );
}
