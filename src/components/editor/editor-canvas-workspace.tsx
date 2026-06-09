"use client";

import { useMemo, useState } from "react";
import { EditorCanvasPreview } from "@/components/editor/editor-canvas-preview";
import { EditorLayerTree } from "@/components/editor/editor-layer-tree";
import { EditorPropertiesPanel } from "@/components/editor/editor-properties-panel";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import { buildEditorSavePayload } from "@/lib/editor-canvas-export";
import {
  applyEditorLayerOperation,
  markEditorDocumentDraftSaved,
  patchEditorLayerFields,
  patchEditorLayerTransform,
  saveEditorCanvasDocument,
} from "@/lib/editor-canvas-session";
import { buildEditorDownloadFilename } from "@/lib/editor-canvas-session";
import type { EditorCanvasDocument, EditorObjectOperation } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  onBack: () => void;
  onDocumentChange: (document: EditorCanvasDocument) => void;
};

export function EditorCanvasWorkspace({ document, onBack, onDocumentChange }: Props) {
  const t = useActiveTranslator();
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
    document.objects.find((o) => o.layerType !== "background")?.id ?? null
  );
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const selectedLayer = useMemo(
    () => document.objects.find((o) => o.id === selectedLayerId) ?? null,
    [document.objects, selectedLayerId]
  );

  const persist = (next: EditorCanvasDocument) => {
    const saved = saveEditorCanvasDocument(next);
    onDocumentChange(saved);
    return saved;
  };

  const handleOperation = (operation: EditorObjectOperation) => {
    if (!selectedLayerId) {
      return;
    }
    const next = applyEditorLayerOperation(document, selectedLayerId, operation);
    persist(next);
    if (operation === "delete") {
      setSelectedLayerId(next.objects.find((o) => o.layerType !== "background")?.id ?? null);
    }
  };

  const parentLabel =
    selectedLayer?.parentObjectId
      ? (document.objects.find((o) => o.id === selectedLayer.parentObjectId)?.label ?? null)
      : null;

  const handleToggleVisibility = (layerId: string) => {
    persist(applyEditorLayerOperation(document, layerId, "visibility"));
  };

  const handleToggleLock = (layerId: string) => {
    persist(applyEditorLayerOperation(document, layerId, "lock"));
  };

  const handleSaveDraft = () => {
    setSaving(true);
    const saved = markEditorDocumentDraftSaved(document);
    const payload = buildEditorSavePayload(saved);
    persist(saved);
    setSaveMessage(
      t("editor.canvas.saveDraftSuccess", {
        count: String(payload.semanticLayers.filter((l) => l.type !== "background").length),
      })
    );
    setSaving(false);
  };

  const handleDownload = () => {
    const link = window.document.createElement("a");
    link.href = document.backgroundUrl;
    link.download = buildEditorDownloadFilename(document);
    link.target = "_blank";
    link.rel="noopener noreferrer";
    link.click();
  };

  return (
    <StudioAuthGate authTitleKey="editor.start.authTitle" authBodyKey="editor.start.authBody">
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
          <header className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("suite.breadcrumb.editor")} / {t("editor.canvas.breadcrumb")}
            </p>
            <h1 className="mt-1 text-xl font-bold text-slate-900">{document.name}</h1>
            <p className="text-sm text-zinc-600">{t(`editor.canvas.step.${document.workflowStep}` as never)}</p>
          </header>

          <EditorToolbar
            onBack={onBack}
            onDownload={handleDownload}
            onSaveDraft={handleSaveDraft}
            saving={saving}
          />

          {saveMessage ?
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              {saveMessage}
            </p>
          : null}

          <div className="mt-4 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
            <div className="order-2 lg:order-1">
              <EditorLayerTree
                layers={document.objects}
                selectedLayerId={selectedLayerId}
                onSelect={setSelectedLayerId}
                onToggleVisibility={handleToggleVisibility}
                onToggleLock={handleToggleLock}
              />
            </div>
            <div className="order-1 lg:order-2">
              <EditorCanvasPreview
                backgroundUrl={document.backgroundUrl}
                layers={document.objects}
                selectedLayerId={selectedLayerId}
                onSelectLayer={setSelectedLayerId}
                onMoveLayer={(layerId, x, y) => persist(patchEditorLayerTransform(document, layerId, { x, y }))}
              />
            </div>
            <div className="order-3">
              <EditorPropertiesPanel
                layer={selectedLayer}
                parentLabel={parentLabel}
                onOperation={handleOperation}
                onPatch={(patch) => {
                  if (!selectedLayerId) {
                    return;
                  }
                  persist(patchEditorLayerFields(document, selectedLayerId, patch));
                }}
              />
            </div>
          </div>

          <div className="mt-4 lg:hidden">
            <EditorLayerTree
              layers={document.objects}
              selectedLayerId={selectedLayerId}
              onSelect={setSelectedLayerId}
              onToggleVisibility={handleToggleVisibility}
              onToggleLock={handleToggleLock}
            />
          </div>
        </section>
      </main>
    </StudioAuthGate>
  );
}
