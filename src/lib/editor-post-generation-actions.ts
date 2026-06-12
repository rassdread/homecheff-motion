import {
  downloadGenerationImage,
  downloadGenerationPackageZip,
  downloadGenerationVideo,
  downloadSequenceFramesZip,
} from "@/lib/editor-generation-package-download";
import { saveGenerationPackageToLibrary } from "@/lib/editor-generation-package-save";
import { exportEditorDocumentAsHcProject } from "@/lib/homecheff-project-export";
import type { EditorNextBestActionId } from "@/types/editor-generation-package";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type PostGenerationActionResult =
  | { ok: true; messageKey: string }
  | { ok: false; messageKey: string; error?: string };

export async function executePostGenerationAction(input: {
  actionId: EditorNextBestActionId | string;
  document: EditorCanvasDocument;
  resultType: "image" | "sequence" | "animation" | "export";
  primaryUrl?: string;
}): Promise<PostGenerationActionResult> {
  const pkg = input.document.instructionStudioState?.generationPackage;
  const workflow = String(pkg?.workflow ?? input.document.instructionStudioState?.combineIntent ?? "editor");

  try {
    switch (input.actionId) {
      case "download": {
        const url = input.primaryUrl ?? pkg?.motionOutputs[0]?.url ?? pkg?.generatedImages[0]?.url;
        if (!url) {
          return { ok: false, messageKey: "editor.postGen.error.noAsset" };
        }
        if (input.resultType === "animation" || url.includes(".mp4") || url.includes(".webm")) {
          await downloadGenerationVideo(url, { workflow });
        } else {
          await downloadGenerationImage(url, { workflow });
        }
        return { ok: true, messageKey: "editor.postGen.success.download" };
      }
      case "download_frames":
      case "download_package": {
        if (!pkg) {
          return { ok: false, messageKey: "editor.postGen.error.noPackage" };
        }
        if (input.actionId === "download_package") {
          await downloadGenerationPackageZip(pkg);
        } else {
          await downloadSequenceFramesZip(pkg);
        }
        return { ok: true, messageKey: "editor.postGen.success.downloadPackage" };
      }
      case "save_library": {
        const result = await saveGenerationPackageToLibrary(input.document);
        return result.ok
          ? { ok: true, messageKey: result.messageKey }
          : { ok: false, messageKey: "editor.postGen.error.saveFailed" };
      }
      case "export_hc": {
        exportEditorDocumentAsHcProject({
          document: input.document,
          shareMode: "editable_copy",
          syncToServer: true,
        });
        return { ok: true, messageKey: "hcProject.export.success" };
      }
      default:
        return { ok: false, messageKey: "editor.postGen.error.unsupported" };
    }
  } catch (error) {
    return {
      ok: false,
      messageKey: "editor.postGen.error.actionFailed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
