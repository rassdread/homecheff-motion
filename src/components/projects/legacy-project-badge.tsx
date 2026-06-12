"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  convertAndPersistLegacyEditor,
  convertAndPersistLegacyMotion,
  convertAndPersistLegacyPublish,
  convertAndPersistLegacyStudio,
  legacyMotionToPublishShortcut,
} from "@/lib/homecheff-project-legacy-convert";
import { resolveLegacyProjectOpenPath, resolveHcProjectOpenOptions } from "@/lib/homecheff-project-legacy-open";
import { archiveLegacyProject, restoreLegacyProject } from "@/lib/homecheff-project-legacy-registry";
import { buildHcHandoffUrl } from "@/lib/homecheff-project-package-core";
import { loadHomeCheffProject } from "@/lib/homecheff-project-persist";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type {
  LegacyEditorProjectInput,
  LegacyMotionProjectInput,
  LegacyProjectRegistryEntry,
  LegacyPublishProjectInput,
  LegacyStudioProjectInput,
} from "@/types/homecheff-legacy-project";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

type LegacyProps = {
  entry: LegacyProjectRegistryEntry;
  motionInput?: LegacyMotionProjectInput;
  editorInput?: LegacyEditorProjectInput;
  publishInput?: LegacyPublishProjectInput;
  studioInput?: LegacyStudioProjectInput;
  compact?: boolean;
};

type HcProps = {
  project: HomeCheffProjectPackage;
  compact?: boolean;
};

export function LegacyProjectBadge({ entry, compact = false }: { entry: LegacyProjectRegistryEntry; compact?: boolean }) {
  const t = useActiveTranslator();
  return (
    <span
      className={
        compact
          ? "inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900"
          : "inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900"
      }
      title={t("hcLegacy.badge.tooltip" as never)}
      data-testid="legacy-project-badge"
    >
      {t("hcLegacy.badge.label" as never)}
    </span>
  );
}

export function LegacyProjectActions({
  entry,
  motionInput,
  editorInput,
  publishInput,
  studioInput,
  compact = false,
}: LegacyProps) {
  const t = useActiveTranslator();
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openLegacy = () => {
    router.push(resolveLegacyProjectOpenPath(entry));
  };

  const convert = () => {
    setError(null);
    let result;
    if (entry.service === "motion" && motionInput) {
      result = convertAndPersistLegacyMotion(motionInput);
    } else if (entry.service === "editor" && editorInput) {
      result = convertAndPersistLegacyEditor(editorInput);
    } else if (entry.service === "publish" && publishInput) {
      result = convertAndPersistLegacyPublish(publishInput);
    } else if (entry.service === "studio" && studioInput) {
      result = convertAndPersistLegacyStudio(studioInput);
    } else {
      setError("hcLegacy.error.noPayload");
      return;
    }

    if (!result.ok) {
      setError("hcLegacy.error.convertFailed");
      setStatus(null);
      return;
    }
    setStatus("hcLegacy.convert.success");
    const hc = loadHomeCheffProject(result.hcProjectId);
    if (hc) {
      router.push(buildHcHandoffUrl(hc.id, hc.projectType));
    }
  };

  const sendToPublish = () => {
    if (!motionInput) {
      setError("hcLegacy.error.noPayload");
      return;
    }
    setError(null);
    const result = legacyMotionToPublishShortcut(motionInput);
    if (!result.ok) {
      setError("hcLegacy.error.convertFailed");
      return;
    }
    setStatus("hcLegacy.publishShortcut.success");
    router.push(buildHcHandoffUrl(result.hcProjectId, "publish"));
  };

  const archive = () => {
    archiveLegacyProject(entry.service, entry.legacyId);
    setStatus("hcLegacy.archive.success");
  };

  const restore = () => {
    restoreLegacyProject(entry.service, entry.legacyId);
    setStatus("hcLegacy.restore.success");
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-3 rounded-2xl border border-zinc-200 bg-white p-4"} data-testid="legacy-project-actions">
      <div className="flex flex-wrap items-center gap-2">
        <LegacyProjectBadge entry={entry} compact={compact} />
        {!compact ? <p className="text-xs text-zinc-600">{t("hcLegacy.lead" as never)}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={studioVisual.btnOutline} onClick={openLegacy}>
          {t("hcLegacy.action.open" as never)}
        </button>
        <button type="button" className={studioVisual.btnOutline} onClick={convert}>
          {t("hcLegacy.action.convert" as never)}
        </button>
        {entry.service === "motion" ?
          <button type="button" className={studioVisual.btnOutline} onClick={sendToPublish}>
            {t("hcLegacy.action.sendPublish" as never)}
          </button>
        : null}
        {entry.isArchived ?
          <button type="button" className={studioVisual.btnOutline} onClick={restore}>
            {t("hcLegacy.action.restore" as never)}
          </button>
        : <button type="button" className={studioVisual.btnOutline} onClick={archive}>
            {t("hcLegacy.action.archive" as never)}
          </button>
        }
      </div>
      {error ?
        <p className="text-xs text-amber-900">{t(error as never)}</p>
      : null}
      {error ?
        <p className="text-xs text-zinc-600">{t("hcLegacy.fallback.openLegacy" as never)}</p>
      : null}
      {status ?
        <p className="text-xs text-emerald-800">{t(status as never)}</p>
      : null}
    </div>
  );
}

export function HcProjectOpenActions({ project, compact = false }: HcProps) {
  const t = useActiveTranslator();
  const router = useRouter();
  const options = resolveHcProjectOpenOptions(project);

  return (
    <div className={compact ? "flex flex-wrap gap-2" : "space-y-2"} data-testid="hc-project-open-actions">
      {!compact ?
        <p className="text-xs font-semibold text-zinc-700">{t("hcProject.openTitle" as never)}</p>
      : null}
      {options.map((option) => (
        <button
          key={option.service}
          type="button"
          className={studioVisual.btnOutline}
          onClick={() => router.push(option.href)}
        >
          {t(option.labelKey as never)}
        </button>
      ))}
    </div>
  );
}
