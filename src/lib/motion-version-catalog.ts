/**
 * Unified language + version catalog for Motion projects (render versions + language exports).
 */

import { resolveSlotFromStableSelectionParam } from "@/lib/bundle-slot-identity";
import { isCleanUrlAlignedWithRenderVersion } from "@/lib/render-output-lineage";
import { formatMotionVersionLabel, parseVersionQueryParam } from "@/lib/motion-version-display";
import { formatLanguageVersionName } from "@/lib/smart-version-naming";
import { resolveProjectDisplayTitle } from "@/lib/project-display-title";

export const MOTION_PRIMARY_LANGUAGE_CODE = "nl";
export const MOTION_PRIMARY_LANGUAGE_LABEL = "NL";

export type MotionVersionSlot = {
  selectionKey: string;
  projectId: string;
  languageCode: string;
  languageLabel: string;
  /** @deprecated Prefer catalogVersionNumber — kept equal for API compat. */
  versionNumber: number;
  versionNote: string | null;
  displayLabel: string;
  status: string;
  finalVideoUrl: string | null;
  cleanVideoUrl: string | null;
  thumbnailUrl: string | null;
  thumbnailFallbackUrl: string | null;
  durationSeconds: number | null;
  createdAt: string | null;
  kind: "render" | "language_export" | "baseline";
  renderVersionId?: string;
  languageExportId?: string;
  /** V22.6 — stable source identity for deep links and downloads. */
  sourceProjectId: string;
  /** Merged bundle display ordinal (V1, V2, …). */
  catalogVersionNumber: number;
  /** ProjectRenderVersion.renderVersionNumber (render/baseline). */
  sourceRenderVersionNumber?: number;
  /** VideoLanguageExport.version (language_export). */
  sourceLanguageExportVersion?: number;
  displayVersionLabel: string;
};

export function attachMotionSlotIdentity(
  slot: Omit<
    MotionVersionSlot,
    | "sourceProjectId"
    | "catalogVersionNumber"
    | "displayVersionLabel"
    | "sourceRenderVersionNumber"
    | "sourceLanguageExportVersion"
  > & {
    sourceProjectId?: string;
    catalogVersionNumber?: number;
    displayVersionLabel?: string;
    sourceRenderVersionNumber?: number;
    sourceLanguageExportVersion?: number;
  }
): MotionVersionSlot {
  const catalogVersionNumber = slot.catalogVersionNumber ?? slot.versionNumber;
  const displayVersionLabel = slot.displayVersionLabel ?? slot.displayLabel;
  return {
    ...slot,
    sourceProjectId: slot.sourceProjectId ?? slot.projectId,
    catalogVersionNumber,
    versionNumber: catalogVersionNumber,
    displayVersionLabel,
    displayLabel: displayVersionLabel,
    sourceRenderVersionNumber:
      slot.sourceRenderVersionNumber ??
      (slot.kind === "render" || slot.kind === "baseline"
        ? catalogVersionNumber
        : undefined),
    sourceLanguageExportVersion:
      slot.sourceLanguageExportVersion ??
      (slot.kind === "language_export" ? catalogVersionNumber : undefined),
  };
}

export type MotionVersionCatalog = {
  languages: Array<{ code: string; label: string }>;
  slotsByLanguage: Record<string, MotionVersionSlot[]>;
  defaultLanguageCode: string;
  defaultSelectionKey: string | null;
};

export type MotionRenderVersionRow = {
  id: string;
  renderVersionNumber: number;
  status: string;
  isDefault: boolean;
  versionNote: string | null;
  finalVideoUrl: string | null;
  cleanVideoUrl: string | null;
  createdAt: string;
};

export type MotionLanguageExportRow = {
  id: string;
  languageCode: string;
  languageLabel: string;
  status: string;
  outputVideoUrl: string | null;
  sourceCleanVideoUrl?: string | null;
  version: number;
  isDefault: boolean;
  versionNote?: string | null;
  createdAt: string;
};

function formatVersionDisplayLabel(
  versionNumber: number,
  versionNote: string | null,
  locale: "en" | "nl" = "nl",
  createdAt?: string | null,
  languageLabel?: string
): string {
  if (versionNote?.trim()) {
    return formatMotionVersionLabel(versionNumber, versionNote, locale, createdAt);
  }
  if (languageLabel) {
    return formatLanguageVersionName(languageLabel, versionNumber);
  }
  return formatMotionVersionLabel(versionNumber, versionNote, locale, createdAt);
}

function sortSlots(slots: MotionVersionSlot[]): MotionVersionSlot[] {
  return [...slots].sort((a, b) => a.versionNumber - b.versionNumber);
}

export function buildMotionVersionCatalogForProject(input: {
  projectId: string;
  title?: string | null;
  exportOutputUrl: string | null;
  exportStatus: string | null;
  projectStatus: string;
  projectCleanUrl: string | null;
  thumbnailUrl?: string | null;
  thumbnailFallbackUrl?: string | null;
  durationSeconds?: number | null;
  renderVersions: MotionRenderVersionRow[];
  languageExports: MotionLanguageExportRow[];
  locale?: "en" | "nl";
}): MotionVersionCatalog {
  const thumb =
    input.thumbnailUrl?.trim() || input.thumbnailFallbackUrl?.trim() || null;
  const thumbFallback = input.thumbnailFallbackUrl?.trim() || null;
  const duration =
    typeof input.durationSeconds === "number" && Number.isFinite(input.durationSeconds)
      ? input.durationSeconds
      : null;
  const slotMedia = {
    thumbnailUrl: thumb,
    thumbnailFallbackUrl: thumbFallback,
    durationSeconds: duration,
  };
  const slotsByLanguage: Record<string, MotionVersionSlot[]> = {};
  const locale = input.locale ?? "nl";
  const primaryCode = MOTION_PRIMARY_LANGUAGE_CODE;
  const primaryLabel = MOTION_PRIMARY_LANGUAGE_LABEL;

  const renderRows = [...input.renderVersions].sort(
    (a, b) => a.renderVersionNumber - b.renderVersionNumber
  );

  if (renderRows.length > 0) {
    for (const row of renderRows) {
      const clean =
        row.cleanVideoUrl?.trim() &&
        isCleanUrlAlignedWithRenderVersion(row.cleanVideoUrl, row.renderVersionNumber)
          ? row.cleanVideoUrl.trim()
          : null;
      const displayLabel = formatVersionDisplayLabel(
        row.renderVersionNumber,
        row.versionNote,
        locale,
        row.createdAt,
        primaryLabel
      );
      const slot = attachMotionSlotIdentity({
        selectionKey: `render:${row.id}`,
        projectId: input.projectId,
        languageCode: primaryCode,
        languageLabel: primaryLabel,
        versionNumber: row.renderVersionNumber,
        versionNote: row.versionNote,
        displayLabel,
        status: row.status,
        finalVideoUrl: row.finalVideoUrl?.trim() ?? null,
        cleanVideoUrl: clean,
        ...slotMedia,
        createdAt: row.createdAt,
        kind: "render",
        renderVersionId: row.id,
        catalogVersionNumber: row.renderVersionNumber,
        sourceRenderVersionNumber: row.renderVersionNumber,
      });
      const list = slotsByLanguage[primaryCode] ?? [];
      list.push(slot);
      slotsByLanguage[primaryCode] = list;
    }
  } else if (input.exportOutputUrl?.trim()) {
    const clean =
      input.projectCleanUrl?.trim() &&
      isCleanUrlAlignedWithRenderVersion(input.projectCleanUrl, 1)
        ? input.projectCleanUrl.trim()
        : input.projectCleanUrl?.trim() ?? null;
    slotsByLanguage[primaryCode] = [
      attachMotionSlotIdentity({
        selectionKey: `baseline:${input.projectId}:${primaryCode}:1`,
        projectId: input.projectId,
        languageCode: primaryCode,
        languageLabel: primaryLabel,
        versionNumber: 1,
        versionNote: null,
        displayLabel: formatVersionDisplayLabel(1, null, locale, null, primaryLabel),
        status: input.exportStatus ?? input.projectStatus,
        finalVideoUrl: input.exportOutputUrl.trim(),
        cleanVideoUrl: clean,
        ...slotMedia,
        createdAt: null,
        kind: "baseline",
        catalogVersionNumber: 1,
        sourceRenderVersionNumber: 1,
      }),
    ];
  }

  const exportsByCode = new Map<string, MotionLanguageExportRow[]>();
  for (const row of input.languageExports) {
    if (row.languageCode === "original" || row.languageCode === primaryCode) {
      continue;
    }
    const list = exportsByCode.get(row.languageCode) ?? [];
    list.push(row);
    exportsByCode.set(row.languageCode, list);
  }

  for (const [code, rows] of exportsByCode) {
    const sorted = [...rows].sort((a, b) => a.version - b.version);
    const label = sorted[0]?.languageLabel ?? code.toUpperCase();
    slotsByLanguage[code] = sorted.map((row) => {
      const displayLabel = formatVersionDisplayLabel(
        row.version,
        row.versionNote ?? null,
        locale,
        row.createdAt,
        label
      );
      return attachMotionSlotIdentity({
        selectionKey: `lang:${row.id}`,
        projectId: input.projectId,
        languageCode: code,
        languageLabel: label,
        versionNumber: row.version,
        versionNote: row.versionNote ?? null,
        displayLabel,
        status: row.status,
        finalVideoUrl: row.outputVideoUrl?.trim() ?? null,
        cleanVideoUrl: row.sourceCleanVideoUrl?.trim() ?? null,
        ...slotMedia,
        createdAt: row.createdAt,
        kind: "language_export",
        languageExportId: row.id,
        catalogVersionNumber: row.version,
        sourceLanguageExportVersion: row.version,
      });
    });
  }

  for (const code of Object.keys(slotsByLanguage)) {
    slotsByLanguage[code] = sortSlots(slotsByLanguage[code]!);
  }

  const languages = Object.keys(slotsByLanguage)
    .map((code) => ({
      code,
      label: slotsByLanguage[code]?.[0]?.languageLabel ?? code.toUpperCase(),
    }))
    .sort((a, b) => {
      if (a.code === primaryCode) {
        return -1;
      }
      if (b.code === primaryCode) {
        return 1;
      }
      return a.label.localeCompare(b.label);
    });

  const defaultLanguageCode = languages[0]?.code ?? primaryCode;
  const defaultSlot =
    slotsByLanguage[defaultLanguageCode]?.find((s) => s.status === "completed" && s.finalVideoUrl) ??
    slotsByLanguage[defaultLanguageCode]?.[slotsByLanguage[defaultLanguageCode]!.length - 1] ??
    null;

  void resolveProjectDisplayTitle(input.title, input.locale);

  return {
    languages,
    slotsByLanguage,
    defaultLanguageCode,
    defaultSelectionKey: defaultSlot?.selectionKey ?? null,
  };
}

export function mergeMotionVersionCatalogs(
  catalogs: Array<{ catalog: MotionVersionCatalog; memberCreatedAt: string }>
): MotionVersionCatalog {
  const sortedMembers = [...catalogs].sort(
    (a, b) => new Date(a.memberCreatedAt).getTime() - new Date(b.memberCreatedAt).getTime()
  );
  const slotsByLanguage: Record<string, MotionVersionSlot[]> = {};
  const counters = new Map<string, number>();

  for (const { catalog } of sortedMembers) {
    for (const lang of catalog.languages) {
      const existing = slotsByLanguage[lang.code] ?? [];
      const rows = catalog.slotsByLanguage[lang.code] ?? [];
      for (const row of rows) {
        const nextVersion = (counters.get(lang.code) ?? 0) + 1;
        counters.set(lang.code, nextVersion);
        const mergedDisplay = formatVersionDisplayLabel(
          nextVersion,
          row.versionNote,
          undefined,
          row.createdAt
        );
        existing.push(
          attachMotionSlotIdentity({
            ...row,
            catalogVersionNumber: nextVersion,
            versionNumber: nextVersion,
            displayLabel: mergedDisplay,
            selectionKey: `${row.projectId}:${lang.code}:${nextVersion}:${row.kind}:${row.renderVersionId ?? row.languageExportId ?? "base"}`,
          })
        );
      }
      slotsByLanguage[lang.code] = existing;
    }
  }

  const languages = Object.keys(slotsByLanguage)
    .map((code) => ({
      code,
      label: slotsByLanguage[code]?.[0]?.languageLabel ?? code.toUpperCase(),
    }))
    .sort((a, b) => {
      if (a.code === MOTION_PRIMARY_LANGUAGE_CODE) {
        return -1;
      }
      if (b.code === MOTION_PRIMARY_LANGUAGE_CODE) {
        return 1;
      }
      return a.label.localeCompare(b.label);
    });

  const defaultLanguageCode = languages[0]?.code ?? MOTION_PRIMARY_LANGUAGE_CODE;
  const defaultSlot =
    slotsByLanguage[defaultLanguageCode]?.find((s) => s.finalVideoUrl) ??
    slotsByLanguage[defaultLanguageCode]?.[slotsByLanguage[defaultLanguageCode]!.length - 1] ??
    null;

  return {
    languages,
    slotsByLanguage,
    defaultLanguageCode,
    defaultSelectionKey: defaultSlot?.selectionKey ?? null,
  };
}

export function resolveMotionSelectionFromUrl(
  catalog: MotionVersionCatalog,
  langFromUrl: string | null | undefined,
  verFromUrl: string | null | undefined,
  selFromUrl?: string | null | undefined
): { languageCode: string; selectionKey: string; slot: MotionVersionSlot } | null {
  const explicitSel = Boolean(selFromUrl?.trim());
  const explicitVer = Boolean(verFromUrl?.trim());
  const explicitLang = Boolean(langFromUrl?.trim());

  if (explicitSel) {
    const slot = resolveSlotFromStableSelectionParam(catalog, selFromUrl!.trim());
    if (!slot) {
      return null;
    }
    return {
      languageCode: slot.languageCode,
      selectionKey: slot.selectionKey,
      slot,
    };
  }

  const langKey = langFromUrl?.trim() ?? "";
  if (explicitLang && !catalog.slotsByLanguage[langKey]?.length) {
    return null;
  }
  const languageCode =
    explicitLang && catalog.slotsByLanguage[langKey]
      ? langKey
      : catalog.defaultLanguageCode;
  const slots = catalog.slotsByLanguage[languageCode] ?? [];
  if (!slots.length) {
    return null;
  }
  const parsed = parseVersionQueryParam(verFromUrl);
  if (parsed.selectionKey) {
    const slot = findMotionVersionSlot(catalog, parsed.selectionKey);
    if (slot && slot.languageCode === languageCode) {
      return { languageCode, selectionKey: slot.selectionKey, slot };
    }
    if (explicitVer) {
      return null;
    }
  }
  if (parsed.versionNumber != null) {
    const slot = slots.find((s) => slotMatchesSourceVersionNumber(s, parsed.versionNumber!));
    if (slot) {
      return { languageCode, selectionKey: slot.selectionKey, slot };
    }
    if (explicitVer) {
      return null;
    }
  }
  const fallback =
    pickLatestMotionVersionSlot(catalog, languageCode) ?? slots[slots.length - 1]!;
  return { languageCode, selectionKey: fallback.selectionKey, slot: fallback };
}

function slotMatchesSourceVersionNumber(slot: MotionVersionSlot, versionNumber: number): boolean {
  if (slot.kind === "language_export") {
    return (slot.sourceLanguageExportVersion ?? slot.catalogVersionNumber) === versionNumber;
  }
  return (slot.sourceRenderVersionNumber ?? slot.catalogVersionNumber) === versionNumber;
}

/** Gallery label: `NL (3) · EN (2)` */
export function formatBundleLanguagesLabel(catalog: MotionVersionCatalog): string {
  const stats = summarizeMotionCatalogStats(catalog);
  return catalog.languages
    .map((lang) => `${lang.label} (${stats.languageCounts[lang.code] ?? 0})`)
    .join(" · ");
}

/** True when URL has explicit lang/ver that does not resolve (no silent fallback). */
export function isExplicitMotionUrlSelectionInvalid(
  catalog: MotionVersionCatalog,
  langFromUrl: string | null | undefined,
  verFromUrl: string | null | undefined,
  selFromUrl?: string | null | undefined
): boolean {
  const explicitSel = Boolean(selFromUrl?.trim());
  const explicitVer = Boolean(verFromUrl?.trim());
  const explicitLang = Boolean(langFromUrl?.trim());
  if (!explicitSel && !explicitVer && !explicitLang) {
    return false;
  }
  return resolveMotionSelectionFromUrl(catalog, langFromUrl, verFromUrl, selFromUrl) === null;
}

/** Per-language version counts for bundle validation (tests / diagnostics). */
export function summarizeMotionCatalogStats(catalog: MotionVersionCatalog): {
  languageCounts: Record<string, number>;
  totalSlots: number;
  latestByLanguage: Record<string, MotionVersionSlot | null>;
} {
  const languageCounts: Record<string, number> = {};
  const latestByLanguage: Record<string, MotionVersionSlot | null> = {};
  let totalSlots = 0;
  for (const lang of catalog.languages) {
    const slots = catalog.slotsByLanguage[lang.code] ?? [];
    languageCounts[lang.code] = slots.length;
    totalSlots += slots.length;
    latestByLanguage[lang.code] = pickLatestMotionVersionSlot(catalog, lang.code);
  }
  return { languageCounts, totalSlots, latestByLanguage };
}

export function findMotionVersionSlot(
  catalog: MotionVersionCatalog,
  selectionKey: string | null | undefined
): MotionVersionSlot | null {
  if (!selectionKey?.trim()) {
    return null;
  }
  for (const slots of Object.values(catalog.slotsByLanguage)) {
    const hit = slots.find((s) => s.selectionKey === selectionKey);
    if (hit) {
      return hit;
    }
  }
  return null;
}

export function pickLatestMotionVersionSlot(
  catalog: MotionVersionCatalog,
  languageCode: string
): MotionVersionSlot | null {
  const slots = catalog.slotsByLanguage[languageCode];
  if (!slots?.length) {
    return null;
  }
  const completed = slots.filter((s) => s.status === "completed" && s.finalVideoUrl);
  if (completed.length) {
    return completed[completed.length - 1]!;
  }
  return slots[slots.length - 1]!;
}

export function formatBundleLatestVersionLabel(
  catalog: MotionVersionCatalog,
  locale: "en" | "nl" = "nl"
): string | null {
  const lang = catalog.defaultLanguageCode;
  const slot = pickLatestMotionVersionSlot(catalog, lang);
  if (!slot) {
    return null;
  }
  const langLabel = slot.languageLabel;
  const version = slot.displayLabel;
  return locale === "nl" ? `${langLabel} ${version}` : `${langLabel} ${version}`;
}
