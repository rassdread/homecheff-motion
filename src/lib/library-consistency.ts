import type {
  LibraryConsistencyCategory,
  LibraryGenerationType,
  LibrarySourceModule,
} from "@/types/library-consistency";

/** Maps generation type → library category per spec. */
export function resolveLibraryCategory(
  generationType: LibraryGenerationType,
  options?: { isMascot?: boolean; isLogo?: boolean }
): LibraryConsistencyCategory {
  if (options?.isLogo || generationType === "logo") {
    return "logos";
  }
  switch (generationType) {
    case "character":
    case "character_extraction":
      return "characters";
    case "mascot":
      return "mascots";
    case "location":
      return "locations";
    case "prop":
      return "props";
    case "world":
      return "worlds";
    case "editor_variant":
    case "editor_output":
    case "image":
      return "images";
    case "music":
      return "music";
    case "sfx":
      return "sfx";
    case "voice":
      return "voices";
    case "motion_output":
      return "video";
    case "publish_export":
      return "exports";
    default:
      return "images";
  }
}

export function resolveEditorVariantGenerationType(
  action: string | undefined
): LibraryGenerationType {
  return action === "accessory_add" || action ? "editor_variant" : "editor_output";
}

export function libraryBrowseHrefForCategory(
  category: LibraryConsistencyCategory
): string {
  switch (category) {
    case "characters":
      return "/studio/assets/creative/characters";
    case "mascots":
      return "/studio/assets/creative/characters";
    case "locations":
      return "/studio/assets/creative/locations";
    case "props":
      return "/studio/assets/creative/props";
    case "worlds":
      return "/studio/assets/creative/worlds";
    case "logos":
      return "/studio/assets/creative/props";
    case "images":
      return "/studio/assets/library/generated";
    case "music":
    case "sfx":
    case "audio":
      return "/studio/assets/media/audio";
    case "voices":
      return "/studio/assets/media/voices";
    case "video":
      return "/videos";
    case "exports":
      return "/studio/assets/library/uploads";
    default:
      return "/studio/assets/browse";
  }
}

export function projectOpenHref(projectId: string | null, sourceModule: LibrarySourceModule): string | null {
  if (!projectId?.trim()) {
    return null;
  }
  const id = encodeURIComponent(projectId.trim());
  switch (sourceModule) {
    case "editor":
      return `/editor?project=${id}`;
    case "motion":
      return `/motion?project=${id}`;
    case "publish":
      return `/publish?project=${id}`;
    case "studio":
    case "wizard":
    case "extraction":
      return `/studio?project=${id}`;
    default:
      return `/studio?project=${id}`;
  }
}

export const LIBRARY_CONSISTENCY_AUDIT_ENDPOINTS: Array<{
  endpoint: string;
  generationType: LibraryGenerationType;
  wired: boolean;
  notes?: string;
}> = [
  { endpoint: "POST /api/studio/characters", generationType: "character", wired: true },
  { endpoint: "POST /api/studio/characters/extract", generationType: "character_extraction", wired: true },
  { endpoint: "POST /api/studio/characters (mascot)", generationType: "mascot", wired: true },
  { endpoint: "POST /api/studio/locations", generationType: "location", wired: true },
  { endpoint: "POST /api/studio/props", generationType: "prop", wired: true },
  { endpoint: "POST /api/studio/worlds", generationType: "world", wired: true },
  { endpoint: "POST /api/editor/save (logo)", generationType: "logo", wired: true },
  { endpoint: "studio-asset-reference-blob", generationType: "image", wired: true },
  { endpoint: "POST /api/editor/instruction/variant", generationType: "editor_variant", wired: true },
  { endpoint: "POST /api/editor/save", generationType: "editor_output", wired: true },
  {
    endpoint: "animation export complete",
    generationType: "motion_output",
    wired: true,
    notes: "Registers via syncCompletedMotionExportToLibrary on export completion",
  },
  {
    endpoint: "POST /api/publish/export",
    generationType: "publish_export",
    wired: true,
    notes: "Persists blob + registerPublishExportInLibrary",
  },
  { endpoint: "POST /api/studio/audio-library/generate-music", generationType: "music", wired: true },
  { endpoint: "POST /api/studio/audio-library/generate-sfx", generationType: "sfx", wired: true },
  { endpoint: "voice clone completion", generationType: "voice", wired: true },
];
