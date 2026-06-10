import type { EditorSaveMode } from "@/lib/editor-library-persist";
import type {
  EditorCanvasDocument,
  EditorExportProfileId,
  EditorLibraryExportCategory,
  EditorLibraryExportRecord,
  EditorQuickMotionFormat,
} from "@/types/homecheff-visual-editor";

export function categoryForExportProfile(profile: EditorExportProfileId): EditorLibraryExportCategory {
  switch (profile) {
    case "motion_ready":
      return "motion_ready";
    case "print_ready":
      return "print_ready";
    case "production_ready":
      return "edited_image";
  }
}

export function categoryForQuickMotionFormat(format: EditorQuickMotionFormat): EditorLibraryExportCategory {
  return "gif";
}

export function saveModeForCategory(category: EditorLibraryExportCategory): EditorSaveMode {
  switch (category) {
    case "composition":
      return "composition";
    case "cutout":
      return "cutout";
    case "gif":
      return "gif_asset";
    case "motion_ready":
      return "motion_ready_export";
    case "print_ready":
      return "print_export";
    default:
      return "edited_copy";
  }
}

export function upsertLibraryExportRecord(
  records: EditorLibraryExportRecord[] | undefined,
  record: EditorLibraryExportRecord
): EditorLibraryExportRecord[] {
  return [...(records ?? []).filter((r) => r.id !== record.id), record];
}

export function appendLibraryExport(
  document: EditorCanvasDocument,
  record: Omit<EditorLibraryExportRecord, "id" | "createdAt">
): EditorCanvasDocument {
  const entry: EditorLibraryExportRecord = {
    ...record,
    id: `lib_export_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  return {
    ...document,
    libraryExports: upsertLibraryExportRecord(document.libraryExports, entry),
    updatedAt: new Date().toISOString(),
  };
}

export const LIBRARY_CATEGORY_LABEL_KEYS: Record<EditorLibraryExportCategory, string> = {
  edited_image: "editor.v5.library.editedImage",
  composition: "editor.v5.library.composition",
  cutout: "editor.v5.library.cutout",
  gif: "editor.v5.library.gif",
  motion_ready: "editor.v5.library.motionReady",
  print_ready: "editor.v5.library.printReady",
};
