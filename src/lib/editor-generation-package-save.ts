import { buildEditorSavePayload } from "@/lib/editor-canvas-export";
import { loadEditorCanvasDocument, saveEditorCanvasDocument } from "@/lib/editor-canvas-session";
import {
  persistGenerationLibraryRecord,
  persistGenerationPackage,
  loadGenerationLibraryRecord,
  loadGenerationPackageBySession,
  type EditorGenerationLibraryRecord,
} from "@/lib/editor-generation-package-persist";
import { primaryResultUrlFromPackage } from "@/lib/editor-generation-package-download";
import { patchDocumentGenerationPackage } from "@/lib/editor-generation-package";
import {
  persistEditorSave,
  persistEditorSaveLocalFallback,
  type EditorLibraryPersistResult,
} from "@/lib/editor-library-persist";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type { EditorGenerationPackage } from "@/types/editor-generation-package";

export function workflowDisplayName(workflow: string): string {
  const map: Record<string, string> = {
    outfit_from_reference: "Outfit Transfer",
    how_will_i_look: "Future Self",
    human_into_animal: "Animal Fusion",
    human_into_mascot: "Character Evolution",
    character_fusion: "Character Fusion",
    character_upgrade: "Character Upgrade",
    transformation_sequence: "Motion Sequence",
  };
  return map[workflow] ?? workflow.replace(/_/g, " ");
}

export function buildGenerationLibraryRecord(
  document: EditorCanvasDocument,
  pkg: EditorGenerationPackage
): EditorGenerationLibraryRecord {
  const primaryUrl = primaryResultUrlFromPackage(pkg) ?? document.backgroundUrl;
  return {
    sessionId: document.sessionId,
    packageId: pkg.id,
    workflow: String(pkg.workflow),
    name: `${workflowDisplayName(String(pkg.workflow))} · ${document.name}`,
    primaryUrl,
    savedAt: new Date().toISOString(),
    package: pkg,
  };
}

export async function saveGenerationPackageToLibrary(
  document: EditorCanvasDocument
): Promise<EditorLibraryPersistResult> {
  const patched = patchDocumentGenerationPackage(document);
  const pkg = persistGenerationPackage(patched.instructionStudioState!.generationPackage!);
  const record = buildGenerationLibraryRecord(patched, pkg);
  persistGenerationLibraryRecord(record);

  const primaryUrl = record.primaryUrl;
  const saveDoc: EditorCanvasDocument = {
    ...patched,
    backgroundUrl: primaryUrl,
    instructionStudioState: {
      ...patched.instructionStudioState,
      generationPackage: pkg,
    },
    libraryExports: [
      ...(patched.libraryExports ?? []),
      {
        id: pkg.id,
        category: "composition" as const,
        label: record.name,
        url: primaryUrl,
        createdAt: record.savedAt,
        metadata: { workflow: String(pkg.workflow), packageId: pkg.id },
      },
    ],
  };
  saveEditorCanvasDocument(saveDoc);

  const payload = buildEditorSavePayload(saveDoc);
  payload.semanticRecordPatch = {
    ...payload.semanticRecordPatch,
    continuityNotes: `Editor generation package ${pkg.id} · ${record.workflow}`,
    changeRules: [workflowDisplayName(record.workflow), ...payload.semanticRecordPatch.changeRules ?? []],
  };

  try {
    return await persistEditorSave(saveDoc, payload, "composition");
  } catch {
    return persistEditorSaveLocalFallback(payload, "composition");
  }
}

export function reopenEditorDocumentFromLibrary(sessionId: string): EditorCanvasDocument | null {
  if (typeof window === "undefined") {
    return null;
  }

  const doc = loadEditorCanvasDocument(sessionId);
  if (!doc) {
    return null;
  }

  const libraryRecord = loadGenerationLibraryRecord(sessionId);
  const pkg =
    doc.instructionStudioState?.generationPackage ??
    libraryRecord?.package ??
    loadGenerationPackageBySession(sessionId);

  if (!pkg) {
    return doc;
  }

  return {
    ...doc,
    instructionStudioState: {
      ...doc.instructionStudioState,
      generationPackage: pkg,
      combineIntent: doc.instructionStudioState?.combineIntent ?? (pkg.workflow as never),
    },
  };
}
