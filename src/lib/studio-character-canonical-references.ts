import { randomUUID } from "node:crypto";
import { parseStructuredKeywordsFromVisualKeywords } from "@/lib/studio-character-visual-keywords";
import type {
  CanonicalCharacterIdentity,
  CanonicalCharacterReferencesView,
  CanonicalPrimaryReference,
  CharacterArchivedReference,
  CharacterReferencesBundle,
  CharacterSupportingReference,
  CharacterSupportingReferenceRole,
} from "@/types/studio-character-canonical-references";

export const CHARACTER_REFS_MARKER = "[identity:refs]";

const EMPTY_BUNDLE: CharacterReferencesBundle = {
  version: 1,
  primarySetAt: null,
  supporting: [],
  archive: [],
};

export function emptyCharacterReferencesBundle(): CharacterReferencesBundle {
  return { ...EMPTY_BUNDLE, supporting: [], archive: [] };
}

export function parseCharacterReferencesBundle(rawNotes: string | null | undefined): {
  humanNotes: string;
  bundle: CharacterReferencesBundle;
} {
  const trimmed = (rawNotes ?? "").trim();
  const markerIndex = trimmed.indexOf(CHARACTER_REFS_MARKER);
  if (markerIndex === -1) {
    return { humanNotes: trimmed, bundle: emptyCharacterReferencesBundle() };
  }

  const humanNotes = trimmed.slice(0, markerIndex).trim();
  const jsonPart = trimmed.slice(markerIndex + CHARACTER_REFS_MARKER.length).trim();
  if (!jsonPart) {
    return { humanNotes, bundle: emptyCharacterReferencesBundle() };
  }

  try {
    const parsed = JSON.parse(jsonPart) as Partial<CharacterReferencesBundle>;
    if (parsed.version !== 1) {
      return { humanNotes, bundle: emptyCharacterReferencesBundle() };
    }
    return {
      humanNotes,
      bundle: {
        version: 1,
        primarySetAt: typeof parsed.primarySetAt === "string" ? parsed.primarySetAt : null,
        supporting: Array.isArray(parsed.supporting)
          ? parsed.supporting.filter(isValidSupportingReference)
          : [],
        archive: Array.isArray(parsed.archive)
          ? parsed.archive.filter(isValidArchivedReference)
          : [],
      },
    };
  } catch {
    return { humanNotes, bundle: emptyCharacterReferencesBundle() };
  }
}

function isValidSupportingReference(value: unknown): value is CharacterSupportingReference {
  if (!value || typeof value !== "object") return false;
  const row = value as CharacterSupportingReference;
  return (
    typeof row.id === "string" &&
    typeof row.role === "string" &&
    typeof row.imageUrl === "string" &&
    typeof row.storageKey === "string" &&
    typeof row.uploadedAt === "string" &&
    (row.status === "active" || row.status === "archived")
  );
}

function isValidArchivedReference(value: unknown): value is CharacterArchivedReference {
  if (!value || typeof value !== "object") return false;
  const row = value as CharacterArchivedReference;
  return (
    typeof row.id === "string" &&
    typeof row.imageUrl === "string" &&
    typeof row.storageKey === "string" &&
    typeof row.archivedAt === "string"
  );
}

export function serializeCharacterReferenceNotes(
  humanNotes: string,
  bundle: CharacterReferencesBundle
): string {
  const hasMachineData =
    bundle.primarySetAt ||
    bundle.supporting.length > 0 ||
    bundle.archive.length > 0;

  if (!hasMachineData) {
    return humanNotes.trim();
  }

  const parts: string[] = [];
  if (humanNotes.trim()) {
    parts.push(humanNotes.trim());
  }
  parts.push(CHARACTER_REFS_MARKER);
  parts.push(JSON.stringify(bundle));
  return parts.join("\n");
}

type CharacterReferenceRow = {
  id: string;
  referenceImageUrl: string;
  referenceStorageKey: string;
  primaryReferenceImageId: string | null;
  referenceNotes: string;
  visualKeywords: string;
  defaultClothing: string;
  name: string;
  role: string;
  description: string;
  personality: string;
  appearanceMemory: string;
  worldProfileId: string | null;
  worldProfile?: { id: string; name: string } | null;
};

export function resolveCanonicalCharacterReferences(
  row: CharacterReferenceRow
): CanonicalCharacterReferencesView {
  const { humanNotes, bundle } = parseCharacterReferencesBundle(row.referenceNotes);
  const hasPrimaryUrl = Boolean((row.referenceImageUrl ?? "").trim());

  const primary: CanonicalPrimaryReference | null = hasPrimaryUrl
    ? {
        id: row.primaryReferenceImageId ?? row.id,
        imageUrl: row.referenceImageUrl,
        storageKey: row.referenceStorageKey,
        isOfficial: true,
      }
    : null;

  const activeSupporting = bundle.supporting.filter((ref) => ref.status === "active");

  return {
    primary,
    supporting: activeSupporting,
    archive: bundle.archive,
    humanNotes,
  };
}

export function buildCanonicalCharacterIdentity(
  row: CharacterReferenceRow
): CanonicalCharacterIdentity {
  const refs = resolveCanonicalCharacterReferences(row);
  const structured = parseStructuredKeywordsFromVisualKeywords(row.visualKeywords);

  return {
    primaryReference: refs.primary,
    supportingReferences: refs.supporting,
    visualStyle: structured.visualStyle,
    outfit: (row.defaultClothing ?? "").trim(),
    colorTheme: structured.colorTheme,
    worldProfileId: row.worldProfileId,
    worldProfileName: row.worldProfile?.name ?? null,
    identityMetadata: {
      name: row.name,
      role: row.role,
      description: row.description,
      personality: row.personality,
      appearanceMemory: row.appearanceMemory,
      visualKeywords: row.visualKeywords,
    },
  };
}

export function archivePreviousPrimaryReference(params: {
  existing: CharacterReferenceRow;
  newReferenceImageUrl: string;
  newReferenceStorageKey: string;
  now?: Date;
}): {
  referenceNotes: string;
  primaryReferenceImageId: string;
  primarySetAt: string;
} {
  const now = params.now ?? new Date();
  const nowIso = now.toISOString();
  const { humanNotes, bundle } = parseCharacterReferencesBundle(params.existing.referenceNotes);

  const previousUrl = (params.existing.referenceImageUrl ?? "").trim();
  if (
    previousUrl &&
    previousUrl !== params.newReferenceImageUrl.trim()
  ) {
    const archivedEntry: CharacterArchivedReference = {
      id: params.existing.primaryReferenceImageId ?? randomUUID(),
      imageUrl: previousUrl,
      storageKey: params.existing.referenceStorageKey,
      label: "Previous primary",
      archivedAt: nowIso,
      wasPrimary: true,
    };
    bundle.archive = [archivedEntry, ...bundle.archive];
  }

  bundle.primarySetAt = nowIso;

  const newPrimaryId = randomUUID();
  return {
    referenceNotes: serializeCharacterReferenceNotes(humanNotes, bundle),
    primaryReferenceImageId: newPrimaryId,
    primarySetAt: nowIso,
  };
}

export function isCharacterReferenceStale(params: {
  updatedAt: string;
  bundle: CharacterReferencesBundle;
}): boolean {
  if (!params.bundle.primarySetAt) {
    return false;
  }
  const updated = Date.parse(params.updatedAt);
  const primarySet = Date.parse(params.bundle.primarySetAt);
  if (!Number.isFinite(updated) || !Number.isFinite(primarySet)) {
    return false;
  }
  return updated > primarySet + 1000;
}

export function isCharacterSupportingReferenceRole(
  value: string
): value is CharacterSupportingReferenceRole {
  return value === "face" || value === "outfit" || value === "style" || value === "expression";
}
