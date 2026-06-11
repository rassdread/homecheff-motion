"use client";

import { useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { listInstructionDetectedObjects } from "@/lib/editor-instruction-objects";
import {
  buildEditorInstructionPrompt,
  buildEditorInstructionVariantPayload,
} from "@/lib/editor-instruction-prompt-builder";
import { isLegacyCanvasEditorDocument, mergeInstructionSelection } from "@/lib/editor-instruction-studio";
import { executeEditorInstructionVariantApi } from "@/lib/editor-instruction-variant-client";
import {
  appendInstructionVariant,
  createPendingInstructionVariant,
  instructionVariantWithStatus,
  listInstructionVariants,
  patchInstructionVariant,
  setActiveInstructionVariant,
} from "@/lib/editor-instruction-version";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type {
  EditorInstructionAction,
  EditorInstructionObjectId,
  EditorInstructionSelection,
} from "@/types/editor-instruction-studio";
import {
  EDITOR_INSTRUCTION_ACTIONS,
  EDITOR_INSTRUCTION_OBJECT_IDS,
} from "@/types/editor-instruction-studio";

type Props = {
  document: EditorCanvasDocument;
  busy?: boolean;
  onDocumentChange: (document: EditorCanvasDocument) => void;
  onSave?: () => void;
  onOpenStudio?: () => void;
  onOpenMotion?: () => void;
};

const ACTION_LABEL_KEYS: Record<EditorInstructionAction, string> = {
  remove: "editor.instructionStudio.action.remove",
  replace: "editor.instructionStudio.action.replace",
  change_color: "editor.instructionStudio.action.changeColor",
  change_style: "editor.instructionStudio.action.changeStyle",
  change_background: "editor.instructionStudio.action.changeBackground",
  duplicate: "editor.instructionStudio.action.duplicate",
  detach_asset: "editor.instructionStudio.action.detachAsset",
};

const OBJECT_LABEL_KEYS: Record<EditorInstructionObjectId, string> = {
  character: "editor.instructionStudio.object.character",
  person: "editor.instructionStudio.object.person",
  mascot: "editor.instructionStudio.object.mascot",
  object: "editor.instructionStudio.object.object",
  globe: "editor.instructionStudio.object.globe",
  logo: "editor.instructionStudio.object.logo",
  text: "editor.instructionStudio.object.text",
  background: "editor.instructionStudio.object.background",
  style: "editor.instructionStudio.object.style",
};

export function EditorInstructionStudioPanel({
  document,
  busy = false,
  onDocumentChange,
  onSave,
  onOpenStudio,
  onOpenMotion,
}: Props) {
  const t = useActiveTranslator();
  const detectedObjects = useMemo(() => listInstructionDetectedObjects(document), [document]);
  const [generating, setGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const storedSelection = document.instructionStudioState?.selection;
  const initialObject = detectedObjects[0];
  const selection = mergeInstructionSelection(storedSelection, {
    objectId: storedSelection?.objectId ?? initialObject?.id ?? "object",
    objectLabel: storedSelection?.objectLabel ?? initialObject?.label ?? "object",
  });

  const promptPreview = buildEditorInstructionPrompt({
    ...selection,
    assetName: document.name,
    brandIdentity: document.assetProfile?.humanSummaryKey,
  });

  const variants = listInstructionVariants(document);
  const activeVariantId = document.instructionStudioState?.activeVariantId ?? null;
  const legacyReadOnly = isLegacyCanvasEditorDocument(document);

  const updateSelection = (patch: Partial<EditorInstructionSelection>) => {
    const next = mergeInstructionSelection(selection, patch);
    onDocumentChange({
      ...document,
      instructionStudioState: {
        ...document.instructionStudioState,
        selection: next,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const handleGenerateVariant = async () => {
    if (legacyReadOnly) {
      setStatusMessage(t("editor.instructionStudio.legacyReadOnly" as never));
      return;
    }
    setGenerating(true);
    setStatusMessage(t("editor.instructionStudio.generating" as never));
    const payload = buildEditorInstructionVariantPayload(selection);
    let nextDoc = appendInstructionVariant(
      document,
      createPendingInstructionVariant({
        sourceImageUrl: document.backgroundUrl,
        sourceImageId: payload.sourceImageId,
        instruction: payload.instruction,
        prompt: payload.prompt,
        provider: "openai",
      })
    );
    onDocumentChange(nextDoc);

    const pendingId = nextDoc.instructionStudioState?.activeVariantId;
    if (!pendingId) {
      setGenerating(false);
      return;
    }

    nextDoc = patchInstructionVariant(
      nextDoc,
      pendingId,
      instructionVariantWithStatus(
        nextDoc.instructionVariants!.find((v) => v.id === pendingId)!,
        "running"
      )
    );
    onDocumentChange(nextDoc);

    const result = await executeEditorInstructionVariantApi({
      sessionId: document.sessionId,
      imageUrl: document.backgroundUrl,
      prompt: payload.prompt,
      instruction: payload.instruction,
    });

    if (!result.ok || !result.resultUrl) {
      nextDoc = patchInstructionVariant(
        nextDoc,
        pendingId,
        instructionVariantWithStatus(
          nextDoc.instructionVariants!.find((v) => v.id === pendingId)!,
          "failed",
          { error: result.error ?? t("editor.instructionStudio.generateFailed" as never) }
        )
      );
      onDocumentChange(nextDoc);
      setStatusMessage(result.error ?? t("editor.instructionStudio.generateFailed" as never));
      setGenerating(false);
      return;
    }

    nextDoc = patchInstructionVariant(
      nextDoc,
      pendingId,
      instructionVariantWithStatus(
        nextDoc.instructionVariants!.find((v) => v.id === pendingId)!,
        "completed",
        {
          resultUrl: result.resultUrl,
          resultStorageKey: result.storageKey,
          provider: result.provider,
          model: result.model,
          costEstimateUsd: result.costEstimateUsd,
          versionNote: result.versionNote,
        }
      )
    );
    onDocumentChange(nextDoc);
    setStatusMessage(t("editor.instructionStudio.generateSuccess" as never));
    setGenerating(false);
  };

  return (
    <aside className="flex w-full flex-col gap-4 lg:max-w-md">
      {legacyReadOnly ?
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t("editor.instructionStudio.legacyReadOnly" as never)}
        </p>
      : null}

      <section className="rounded-2xl border border-[#0067B1]/20 bg-[#0067B1]/5 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">
          {t("editor.instructionStudio.whatISee" as never)}
        </h2>
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          {detectedObjects.map((item) => (
            <li key={item.id}>• {t(item.labelKey as never)}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          {t("editor.instructionStudio.whatToChange" as never)}
        </h2>

        <label className="mt-3 block text-xs font-medium text-zinc-600">
          {t("editor.instructionStudio.objectLabel" as never)}
          <select
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={selection.objectId}
            onChange={(e) => {
              const objectId = e.target.value as EditorInstructionObjectId;
              const match = detectedObjects.find((o) => o.id === objectId);
              updateSelection({
                objectId,
                objectLabel: match?.label ?? objectId,
              });
            }}
          >
            {(detectedObjects.length > 0 ? detectedObjects.map((o) => o.id) : EDITOR_INSTRUCTION_OBJECT_IDS).map(
              (id) => (
                <option key={id} value={id}>
                  {t(OBJECT_LABEL_KEYS[id] as never)}
                </option>
              )
            )}
          </select>
        </label>

        <label className="mt-3 block text-xs font-medium text-zinc-600">
          {t("editor.instructionStudio.actionLabel" as never)}
          <select
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={selection.action}
            onChange={(e) =>
              updateSelection({ action: e.target.value as EditorInstructionAction })
            }
          >
            {EDITOR_INSTRUCTION_ACTIONS.map((action) => (
              <option key={action} value={action}>
                {t(ACTION_LABEL_KEYS[action] as never)}
              </option>
            ))}
          </select>
        </label>

        {selection.action === "replace" ?
          <label className="mt-3 block text-xs font-medium text-zinc-600">
            {t("editor.instructionStudio.replacementLabel" as never)}
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={selection.replacement ?? ""}
              placeholder={t("editor.instructionStudio.replacementPlaceholder" as never)}
              onChange={(e) => updateSelection({ replacement: e.target.value })}
            />
          </label>
        : null}

        <label className="mt-3 block text-xs font-medium text-zinc-600">
          {t("editor.instructionStudio.promptLabel" as never)}
          <textarea
            className="mt-1 min-h-[88px] w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={selection.customPrompt ?? ""}
            placeholder={t("editor.instructionStudio.promptPlaceholder" as never)}
            onChange={(e) => updateSelection({ customPrompt: e.target.value })}
          />
        </label>

        <div className="mt-4 space-y-3">
          {(
            [
              ["preserveStyle", "editor.instructionStudio.slider.preserveStyle"],
              ["changeStrength", "editor.instructionStudio.slider.changeStrength"],
              ["brandPreservation", "editor.instructionStudio.slider.brandPreservation"],
              ["creativity", "editor.instructionStudio.slider.creativity"],
            ] as const
          ).map(([key, labelKey]) => (
            <label key={key} className="block text-xs font-medium text-zinc-600">
              {t(labelKey as never)}
              <input
                type="range"
                min={0}
                max={100}
                value={selection.sliders[key]}
                className="mt-1 w-full"
                onChange={(e) =>
                  updateSelection({
                    sliders: { ...selection.sliders, [key]: Number(e.target.value) },
                  })
                }
              />
            </label>
          ))}
        </div>

        <details className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          <summary className="cursor-pointer font-medium text-zinc-800">
            {t("editor.instructionStudio.promptPreview" as never)}
          </summary>
          <p className="mt-2 whitespace-pre-wrap">{promptPreview}</p>
        </details>
      </section>

      {variants.length > 0 ?
        <section className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            {t("editor.instructionStudio.variantsTitle" as never)}
          </h2>
          <ul className="mt-2 space-y-2">
            {variants.map((variant) => (
              <li key={variant.id}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-lg border px-2 py-2 text-left text-sm ${
                    activeVariantId === variant.id
                      ? "border-[#0067B1] bg-[#0067B1]/5"
                      : "border-zinc-200"
                  }`}
                  onClick={() => onDocumentChange(setActiveInstructionVariant(document, variant.id))}
                >
                  {variant.resultUrl ?
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={variant.resultUrl}
                      alt=""
                      className="h-12 w-12 rounded object-cover"
                    />
                  : <span className="flex h-12 w-12 items-center justify-center rounded bg-zinc-100 text-xs text-zinc-500">
                      …
                    </span>
                  }
                  <span>
                    <span className="font-medium">{variant.instruction.objectLabel}</span>
                    <span className="block text-xs text-zinc-500">{variant.status}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      : null}

      {statusMessage ?
        <p className="text-sm text-zinc-600" role="status">
          {statusMessage}
        </p>
      : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || generating || legacyReadOnly}
          onClick={() => void handleGenerateVariant()}
          className="min-h-11 flex-1 rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005a9c] disabled:opacity-50"
        >
          {t("editor.instructionStudio.generateVariant" as never)}
        </button>
        {onSave ?
          <button
            type="button"
            disabled={busy}
            onClick={onSave}
            className="min-h-11 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800"
          >
            {t("editor.instructionStudio.save" as never)}
          </button>
        : null}
        {onOpenStudio ?
          <button
            type="button"
            onClick={onOpenStudio}
            className="min-h-11 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800"
          >
            {t("editor.instructionStudio.toStudio" as never)}
          </button>
        : null}
        {onOpenMotion ?
          <button
            type="button"
            onClick={onOpenMotion}
            className="min-h-11 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800"
          >
            {t("editor.instructionStudio.toMotion" as never)}
          </button>
        : null}
      </div>
    </aside>
  );
}
