/**
 * Unified language + version catalog for Motion projects (render versions + language exports).
 */

import { isCleanUrlAlignedWithRenderVersion } from "@/lib/render-output-lineage";
import { formatMotionVersionLabel, parseVersionQueryParam } from "@/lib/motion-version-display";
import { resolveProjectDisplayTitle } from "@/lib/project-display-title";

export const MOTION_PRIMARY_LANGUAGE_CODE = "nl";
export const MOTION_PRIMARY_LANGUAGE_LABEL = "NL";

export type MotionVersionSlot = {
  selectionKey: string;
  projectId: string;
  languageCode: string;
  languageLabel: string;
  versionNumber: number;
  versionNote: string | null;
  displayLabel: string;
  status: string;
  finalVideoUrl: string | null;
  cleanVideoUrl: string | null;
  createdAt: string | null;
  kind: "render" | "language_export" | "baseline";
  renderVersionId?: string;
  languageExportId?: string;
};

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
  locale: "en" | "nl" = "nl"
): string {
  return formatMotionVersionLabel(versionNumber, versionNote, locale);
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
  renderVersions: MotionRenderVersionRow[];
  languageExports: MotionLanguageExportRow[];
  locale?: "en" | "nl";
}): MotionVersionCatalog {
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
      const slot: MotionVersionSlot = {
        selectionKey: `render:${row.id}`,
        projectId: input.projectId,
        languageCode: primaryCode,
        languageLabel: primaryLabel,
        versionNumber: row.renderVersionNumber,
        versionNote: row.versionNote,
        displayLabel: formatVersionDisplayLabel(row.renderVersionNumber, row.versionNote, locale),
        status: row.status,
        finalVideoUrl: row.finalVideoUrl?.trim() ?? null,
        cleanVideoUrl: clean,
        createdAt: row.createdAt,
        kind: "render",
        renderVersionId: row.id,
      };
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
      {
        selectionKey: `baseline:${input.projectId}:${primaryCode}:1`,
        projectId: input.projectId,
        languageCode: primaryCode,
        languageLabel: primaryLabel,
        versionNumber: 1,
        versionNote: null,
        displayLabel: formatVersionDisplayLabel(1, null, locale),
        status: input.exportStatus ?? input.projectStatus,
        finalVideoUrl: input.exportOutputUrl.trim(),
        cleanVideoUrl: clean,
        createdAt: null,
        kind: "baseline",
      },
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
    slotsByLanguage[code] = sorted.map((row) => ({
      selectionKey: `lang:${row.id}`,
      projectId: input.projectId,
      languageCode: code,
      languageLabel: label,
      versionNumber: row.version,
      versionNote: row.versionNote ?? null,
      displayLabel: formatVersionDisplayLabel(row.version, row.versionNote ?? null, locale),
      status: row.status,
      finalVideoUrl: row.outputVideoUrl?.trim() ?? null,
      cleanVideoUrl: row.sourceCleanVideoUrl?.trim() ?? null,
      createdAt: row.createdAt,
      kind: "language_export",
      languageExportId: row.id,
    }));
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
        existing.push({
          ...row,
          versionNumber: nextVersion,
          displayLabel: formatVersionDisplayLabel(nextVersion, row.versionNote),
          selectionKey: `${row.projectId}:${lang.code}:${nextVersion}:${row.kind}:${row.renderVersionId ?? row.languageExportId ?? "base"}`,
        });
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
  verFromUrl: string | null | undefined
): { languageCode: string; selectionKey: string; slot: MotionVersionSlot } | null {
  const explicitVer = Boolean(verFromUrl?.trim());
  const explicitLang = Boolean(langFromUrl?.trim());
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
    const slot = slots.find((s) => s.versionNumber === parsed.versionNumber);
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
