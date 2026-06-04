"use client";

import { useMemo } from "react";
import { MotionVersionSelectors } from "@/components/videos/motion-version-selectors";
import {
  buildMotionVersionCatalogForProject,
  findMotionVersionSlot,
  type MotionVersionSlot,
} from "@/lib/motion-version-catalog";
import type { AnimationProjectDetailResponse } from "@/types/animation-api";

type Props = {
  detail: AnimationProjectDetailResponse;
  exportOutputUrl: string | null;
  langFromUrl: string | null;
  versionFromUrl: string | null;
  onSelectionChange: (languageCode: string, selectionKey: string) => void;
};

export function useProjectMotionVersionSelection(params: Props): {
  catalog: ReturnType<typeof buildMotionVersionCatalogForProject>;
  selectedSlot: MotionVersionSlot | null;
  showSelectors: boolean;
} {
  const catalog = useMemo(
    () =>
      buildMotionVersionCatalogForProject({
        projectId: params.detail.id,
        title: params.detail.title,
        exportOutputUrl: params.exportOutputUrl,
        exportStatus: params.detail.exports[0]?.status ?? null,
        projectStatus: params.detail.status,
        projectCleanUrl: params.detail.instantCleanFinalVideoUrl ?? null,
        renderVersions: (params.detail.renderVersions ?? []).map((row) => ({
          id: row.id,
          renderVersionNumber: row.renderVersionNumber,
          status: row.status,
          isDefault: row.isDefault,
          versionNote: row.versionNote,
          finalVideoUrl: row.finalVideoUrl,
          cleanVideoUrl: row.cleanVideoUrl,
          createdAt: row.createdAt,
        })),
        languageExports: (params.detail.languageExports ?? []).map((row) => ({
          id: row.id,
          languageCode: row.languageCode,
          languageLabel: row.languageLabel,
          status: row.status,
          outputVideoUrl: row.outputVideoUrl,
          sourceCleanVideoUrl: row.sourceCleanVideoUrl,
          version: row.version,
          isDefault: row.isDefault,
          versionNote: row.versionNote,
          createdAt: row.createdAt,
        })),
      }),
    [params.detail, params.exportOutputUrl]
  );

  const languageCode =
    params.langFromUrl && catalog.slotsByLanguage[params.langFromUrl]
      ? params.langFromUrl
      : catalog.defaultLanguageCode;

  const selectedSlot = useMemo(() => {
    const fromUrl = findMotionVersionSlot(catalog, params.versionFromUrl);
    if (fromUrl && fromUrl.languageCode === languageCode) {
      return fromUrl;
    }
    const slots = catalog.slotsByLanguage[languageCode] ?? [];
    return (
      slots.find((s) => s.status === "completed" && s.finalVideoUrl) ??
      slots[slots.length - 1] ??
      null
    );
  }, [catalog, languageCode, params.versionFromUrl]);

  const versionCount = catalog.languages.reduce(
    (sum, lang) => sum + (catalog.slotsByLanguage[lang.code]?.length ?? 0),
    0
  );
  const showSelectors = catalog.languages.length > 1 || versionCount > 1;

  return { catalog, selectedSlot, showSelectors };
}

export function ProjectDetailMotionVersions({
  detail,
  exportOutputUrl,
  langFromUrl,
  versionFromUrl,
  onSelectionChange,
}: Props) {
  const { catalog, selectedSlot, showSelectors } = useProjectMotionVersionSelection({
    detail,
    exportOutputUrl,
    langFromUrl,
    versionFromUrl,
    onSelectionChange,
  });

  if (!showSelectors) {
    return null;
  }

  const languageCode =
    selectedSlot?.languageCode ?? langFromUrl ?? catalog.defaultLanguageCode;

  return (
    <MotionVersionSelectors
      catalog={{
        languages: catalog.languages,
        slotsByLanguage: Object.fromEntries(
          Object.entries(catalog.slotsByLanguage).map(([code, slots]) => [
            code,
            slots.map((slot) => ({
              selectionKey: slot.selectionKey,
              projectId: slot.projectId,
              languageCode: slot.languageCode,
              languageLabel: slot.languageLabel,
              versionNumber: slot.versionNumber,
              versionNote: slot.versionNote,
              displayLabel: slot.displayLabel,
              status: slot.status,
              finalVideoUrl: slot.finalVideoUrl,
              cleanVideoUrl: slot.cleanVideoUrl,
              kind: slot.kind,
            })),
          ])
        ),
        defaultLanguageCode: catalog.defaultLanguageCode,
        defaultSelectionKey: catalog.defaultSelectionKey,
      }}
      selectedLanguageCode={languageCode}
      selectedSelectionKey={selectedSlot?.selectionKey ?? null}
      onLanguageChange={(code) => {
        const slots = catalog.slotsByLanguage[code] ?? [];
        const latest = slots[slots.length - 1];
        if (latest) {
          onSelectionChange(code, latest.selectionKey);
        }
      }}
      onVersionChange={(key) => {
        const slot = findMotionVersionSlot(catalog, key);
        if (slot) {
          onSelectionChange(slot.languageCode, key);
        }
      }}
      className="mt-1"
      languageSelectId="detail-motion-language"
      versionSelectId="detail-motion-version"
    />
  );
}
