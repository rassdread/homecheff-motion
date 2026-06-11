"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { editorHandoffMotionUrl } from "@/lib/editor-instruction-handoff";
import { evaluateMotionReadiness } from "@/lib/editor-motion-workflow";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
};

export function EditorMotionWorkspace({ document }: Props) {
  const t = useActiveTranslator();
  const report = useMemo(() => evaluateMotionReadiness(document), [document]);
  const handoffUrl = editorHandoffMotionUrl(document);

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
      <div>
        <h2 className="text-base font-bold text-zinc-900">
          {t("editor.workflow.motion.title" as never)}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          {t("editor.workflow.motion.lead" as never)}
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <p className="text-xs font-semibold uppercase text-zinc-500">
          {t("editor.workflow.motion.readiness" as never)}
        </p>
        <p className="mt-1 text-2xl font-bold text-[#0067B1]">{report.score}%</p>
        <p className="text-sm text-zinc-600">{t(report.labelKey as never)}</p>
      </div>

      <ul className="space-y-2">
        {report.checks.map((check) => (
          <li
            key={check.id}
            className={`rounded-lg border px-3 py-2 text-sm ${
              check.ok ?
                "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            {check.ok ? "✓ " : "○ "}
            {t(check.labelKey as never)}
          </li>
        ))}
      </ul>

      {report.warnings.map((key) => (
        <p key={key} className="text-sm text-amber-800">
          {t(key as never)}
        </p>
      ))}

      <div className="flex flex-wrap gap-2">
        <Link
          href={handoffUrl}
          className={`rounded-full px-4 py-2 text-xs font-semibold ${
            report.usesApprovedVariant ?
              "bg-[#0067B1] text-white"
            : "pointer-events-none bg-zinc-200 text-zinc-500"
          }`}
        >
          {t("editor.workflow.motion.handoff" as never)}
        </Link>
      </div>
    </div>
  );
}
