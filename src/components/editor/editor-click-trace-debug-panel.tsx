"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { EditorSegmentationUiState } from "@/lib/editor-segmentation-state";
import type { EditorShapePoint } from "@/types/homecheff-visual-editor";

type Props = {
  lastClickPoint: EditorShapePoint | null;
  pickedLayerId: string | null;
  pickedLayerLabel: string | null;
  promptVisible: boolean;
  segmentationState: EditorSegmentationUiState;
  segmenting: boolean;
  lastApiStatus: string | null;
  lastHandler: string | null;
};

export function EditorClickTraceDebugPanel({
  lastClickPoint,
  pickedLayerId,
  pickedLayerLabel,
  promptVisible,
  segmentationState,
  segmenting,
  lastApiStatus,
  lastHandler,
}: Props) {
  const t = useActiveTranslator();

  return (
    <details
      className="rounded-lg border border-violet-300 bg-violet-50/90 p-3 text-xs text-violet-950"
      open
    >
      <summary className="cursor-pointer font-semibold">
        {t("editor.clickTrace.debugTitle" as never)}
      </summary>
      <dl className="mt-2 space-y-1 font-mono">
        <div>
          <dt className="font-semibold">{t("editor.clickTrace.handler" as never)}</dt>
          <dd>{lastHandler ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-semibold">{t("editor.clickTrace.lastClick" as never)}</dt>
          <dd>
            {lastClickPoint
              ? `${lastClickPoint.x.toFixed(3)}, ${lastClickPoint.y.toFixed(3)}`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="font-semibold">{t("editor.clickTrace.pickedLayer" as never)}</dt>
          <dd>
            {pickedLayerLabel ? `${pickedLayerLabel} (${pickedLayerId})` : pickedLayerId ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="font-semibold">{t("editor.clickTrace.promptVisible" as never)}</dt>
          <dd>{promptVisible ? "yes" : "no"}</dd>
        </div>
        <div>
          <dt className="font-semibold">{t("editor.clickTrace.segmentationState" as never)}</dt>
          <dd>{segmentationState}{segmenting ? " (busy)" : ""}</dd>
        </div>
        <div>
          <dt className="font-semibold">{t("editor.clickTrace.lastApi" as never)}</dt>
          <dd>{lastApiStatus ?? "—"}</dd>
        </div>
      </dl>
    </details>
  );
}
