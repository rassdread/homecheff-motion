import { executeLanguageExportRender } from "@/server/instant-premium/language-export-render-execution";

export type LanguageExportWorkerJobResult = {
  ok: boolean;
  exportId: string;
  status: string;
  message?: string;
};

export async function runLanguageExportWorkerRender(
  exportId: string
): Promise<LanguageExportWorkerJobResult> {
  const id = exportId.trim();
  if (!id) {
    return { ok: false, exportId: id, status: "failed", message: "exportId is required." };
  }
  try {
    await executeLanguageExportRender(id);
    return { ok: true, exportId: id, status: "completed" };
  } catch (error) {
    return {
      ok: false,
      exportId: id,
      status: "failed",
      message: error instanceof Error ? error.message : "Language export render failed.",
    };
  }
}
