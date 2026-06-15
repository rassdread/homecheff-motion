"use client";

import { useSyncExternalStore } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { shouldShowLanguageExportAdminDebug } from "@/lib/debug-ui";
import {
  listEditorVariantTraces,
  subscribeEditorVariantTraces,
  type EditorVariantTraceEntry,
} from "@/lib/editor-instruction-variant-trace";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  isAdmin?: boolean;
  adminDebugExpanded?: boolean;
};

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function statusLabel(row: EditorVariantTraceEntry): string {
  if (row.blocked || row.responseStatus === "blocked" || row.responseStatus === "client_blocked") {
    return "blocked";
  }
  if (typeof row.responseStatus === "number") {
    return String(row.responseStatus);
  }
  return row.sent ? "sent" : "—";
}

export function EditorVariantCallDebugPanel({
  isAdmin = false,
  adminDebugExpanded = false,
}: Props) {
  const t = useActiveTranslator();
  const traces = useSyncExternalStore(
    subscribeEditorVariantTraces,
    listEditorVariantTraces,
    () => []
  );

  if (!shouldShowLanguageExportAdminDebug(isAdmin, adminDebugExpanded)) {
    return null;
  }

  return (
    <section
      className={`rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-950 ${studioVisual.editorSurface}`}
      data-testid="editor-variant-call-debug"
    >
      <h3 className="font-semibold">{t("editor.instructionStudio.variantTrace.title" as never)}</h3>
      {traces.length === 0 ?
        <p className="mt-2 text-amber-900/80">{t("editor.instructionStudio.variantTrace.empty" as never)}</p>
      : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-amber-200/80 text-[10px] uppercase tracking-wide text-amber-800">
                <th className="py-1 pr-2">{t("editor.instructionStudio.variantTrace.col.time" as never)}</th>
                <th className="py-1 pr-2">{t("editor.instructionStudio.variantTrace.col.trigger" as never)}</th>
                <th className="py-1 pr-2">{t("editor.instructionStudio.variantTrace.col.component" as never)}</th>
                <th className="py-1 pr-2">{t("editor.instructionStudio.variantTrace.col.blocked" as never)}</th>
                <th className="py-1 pr-2">{t("editor.instructionStudio.variantTrace.col.sent" as never)}</th>
                <th className="py-1">{t("editor.instructionStudio.variantTrace.col.status" as never)}</th>
              </tr>
            </thead>
            <tbody>
              {traces.map((row) => (
                <tr key={row.id} className="border-b border-amber-100/80 align-top" data-testid="editor-variant-trace-row">
                  <td className="py-1.5 pr-2 whitespace-nowrap">{formatTimestamp(row.timestamp)}</td>
                  <td className="py-1.5 pr-2">{row.triggerSource}</td>
                  <td className="py-1.5 pr-2">
                    <span className="font-medium">{row.componentName}</span>
                    <span className="block text-[10px] text-amber-800">{row.buttonName}</span>
                  </td>
                  <td className="py-1.5 pr-2">{row.blocked ? "✓" : "—"}</td>
                  <td className="py-1.5 pr-2">{row.sent ? "✓" : "—"}</td>
                  <td className="py-1.5">{statusLabel(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
