"use client";

import { useMemo, useRef, useState } from "react";
import { EditorCanvasPreview } from "@/components/editor/editor-canvas-preview";
import { EditorInstructionComparisonCenter } from "@/components/editor/editor-instruction-comparison-center";
import { useActiveTranslator } from "@/i18n/client";
import {
  actionLabelKey,
  actionsForInstructionCategory,
  categoryLabelKey,
  isBrandingAction,
} from "@/lib/editor-instruction-actions";
import {
  approveInstructionVariant,
  archiveInstructionVariant,
  activeApprovedVariant,
  previewInstructionVariant,
  setActiveApprovedVariant,
} from "@/lib/editor-instruction-approval";
import { defaultBrandingPlacementHint, brandingWorkflowRequiresLogo } from "@/lib/editor-instruction-branding";
import { buildGenericBulkPlans, buildBulkVariantPlansFromPreset } from "@/lib/editor-instruction-bulk";
import {
  editorHandoffMotionUrl,
  editorHandoffStudioUrl,
} from "@/lib/editor-instruction-handoff";
import {
  defaultSelectionForObject,
  findInstructionObjectV2,
  listInstructionObjectsV2,
} from "@/lib/editor-instruction-object-v2";
import {
  buildEditorInstructionPromptV2,
  buildEditorInstructionVariantPayload,
} from "@/lib/editor-instruction-prompt-builder";
import {
  appendBrandReference,
  buildInstructionReferences,
  createBrandReferenceAsset,
  createUploadedReference,
  findBrandReference,
  setProductReference,
  setStyleReference,
} from "@/lib/editor-instruction-references";
import { listCreatorPresets } from "@/lib/editor-instruction-presets";
import { isLegacyCanvasEditorDocument, mergeInstructionSelection } from "@/lib/editor-instruction-studio";
import {
  executeEditorInstructionBulkVariantApi,
  executeEditorInstructionVariantApi,
} from "@/lib/editor-instruction-variant-client";
import {
  appendInstructionVariant,
  createPendingInstructionVariant,
  deleteInstructionVariant,
  instructionVariantWithStatus,
  listInstructionVariants,
  patchInstructionVariant,
  renameInstructionVariant,
  setPreviewInstructionVariant,
} from "@/lib/editor-instruction-version";
import { uploadEditorSourceImage } from "@/lib/editor-image-upload";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type {
  EditorCreatorPresetId,
  EditorInstructionDynamicAction,
} from "@/types/editor-instruction-studio";

type Props = {
  document: EditorCanvasDocument;
  busy?: boolean;
  onDocumentChange: (document: EditorCanvasDocument) => void;
  onSave?: () => void;
};

export function EditorInstructionStudioWorkspace({
  document,
  busy = false,
  onDocumentChange,
  onSave,
}: Props) {
  const t = useActiveTranslator();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const styleInputRef = useRef<HTMLInputElement>(null);
  const [generating, setGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const objectsV2 = useMemo(() => listInstructionObjectsV2(document), [document]);
  const variants = listInstructionVariants(document);
  const legacyReadOnly = isLegacyCanvasEditorDocument(document);
  const previewVariant = previewInstructionVariant(document);
  const approvedActive = activeApprovedVariant(document);
  const previewVariantId = document.instructionStudioState?.previewVariantId ?? null;

  const storedSelection = document.instructionStudioState?.selection;
  const initialObject = objectsV2[0];
  const selection = mergeInstructionSelection(document, storedSelection, {
    objectKey: storedSelection?.objectKey ?? initialObject?.id ?? "obj_main",
    objectLabel: storedSelection?.objectLabel ?? initialObject?.label ?? "Main subject",
    category: storedSelection?.category ?? initialObject?.category ?? "other",
    action: storedSelection?.action ?? initialObject?.suggestedActions[0] ?? "replace",
  });

  const categoryActions = actionsForInstructionCategory(selection.category);
  const logoRef = findBrandReference(document, selection.logoReferenceId);
  const showBranding = brandingWorkflowRequiresLogo(selection.action);

  const promptPreview = buildEditorInstructionPromptV2({
    ...selection,
    assetName: document.name,
    brandIdentity: document.assetProfile?.humanSummaryKey,
    logoReference: logoRef,
    references: buildInstructionReferences(document, selection),
    brandingPlacementHint:
      selection.brandingPlacementHint ?? defaultBrandingPlacementHint(selection.category),
  });

  const updateSelection = (patch: Parameters<typeof mergeInstructionSelection>[2]) => {
    const next = mergeInstructionSelection(document, selection, patch);
    onDocumentChange({
      ...document,
      instructionStudioState: { ...document.instructionStudioState, selection: next },
      updatedAt: new Date().toISOString(),
    });
  };

  const runVariantGeneration = async (params: {
    prompt: string;
    instruction: typeof selection;
    references: ReturnType<typeof buildInstructionReferences>;
    variantName?: string;
    parentVariantId?: string | null;
    presetId?: string;
  }) => {
    let nextDoc = appendInstructionVariant(
      document,
      createPendingInstructionVariant({
        sourceImageUrl: document.backgroundUrl,
        sourceImageId: "background",
        instruction: params.instruction,
        prompt: params.prompt,
        references: params.references,
        provider: "openai",
        name: params.variantName,
        parentVariantId: params.parentVariantId ?? approvedActive?.id ?? null,
        presetId: params.presetId,
      })
    );
    onDocumentChange(nextDoc);
    const pendingId = nextDoc.instructionStudioState?.previewVariantId;
    if (!pendingId) {
      return null;
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
      prompt: params.prompt,
      instruction: params.instruction,
      references: params.references,
      variantName: params.variantName,
      parentVariantId: params.parentVariantId,
    });

    const variant = nextDoc.instructionVariants!.find((v) => v.id === pendingId)!;
    if (!result.ok || !result.resultUrl) {
      onDocumentChange(
        patchInstructionVariant(
          nextDoc,
          pendingId,
          instructionVariantWithStatus(variant, "failed", {
            error: result.error ?? t("editor.instructionStudio.generateFailed" as never),
          })
        )
      );
      return null;
    }

    onDocumentChange(
      patchInstructionVariant(
        nextDoc,
        pendingId,
        instructionVariantWithStatus(variant, "completed", {
          resultUrl: result.resultUrl,
          resultStorageKey: result.storageKey,
          provider: result.provider,
          model: result.model,
          costEstimateUsd: result.costEstimateUsd,
          versionNote: result.versionNote,
        })
      )
    );
    return pendingId;
  };

  const handleGenerateVariant = async () => {
    if (legacyReadOnly) {
      setStatusMessage(t("editor.instructionStudio.legacyReadOnly" as never));
      return;
    }
    if (showBranding && !logoRef) {
      setStatusMessage(t("editor.instructionStudio.v2.branding.logoRequired" as never));
      return;
    }
    setGenerating(true);
    setStatusMessage(t("editor.instructionStudio.generating" as never));
    const payload = buildEditorInstructionVariantPayload({
      ...selection,
      logoReference: logoRef,
      references: buildInstructionReferences(document, selection),
      brandingPlacementHint:
        selection.brandingPlacementHint ?? defaultBrandingPlacementHint(selection.category),
    });
    const id = await runVariantGeneration({
      prompt: payload.prompt,
      instruction: payload.instruction,
      references: payload.references,
    });
    setGenerating(false);
    setStatusMessage(
      id
        ? t("editor.instructionStudio.v2.generateDraftSuccess" as never)
        : t("editor.instructionStudio.generateFailed" as never)
    );
  };

  const handleBulkGenerate = async (presetId?: EditorCreatorPresetId) => {
    if (legacyReadOnly) {
      return;
    }
    setGenerating(true);
    const plans = presetId ? buildBulkVariantPlansFromPreset(presetId) : buildGenericBulkPlans(4);
    const references = buildInstructionReferences(document, selection);
    const basePrompt = buildEditorInstructionPromptV2({ ...selection, references, logoReference: logoRef });
    const response = await executeEditorInstructionBulkVariantApi({
      sessionId: document.sessionId,
      imageUrl: document.backgroundUrl,
      instruction: selection,
      references,
      plans,
    });
    let nextDoc = document;
    for (const result of response.results) {
      if (!result.ok || !result.resultUrl) {
        continue;
      }
      const pending = createPendingInstructionVariant({
        sourceImageUrl: document.backgroundUrl,
        sourceImageId: "background",
        instruction: result.instruction ?? selection,
        prompt: result.prompt ?? basePrompt,
        references,
        name: result.variantName,
        presetId: presetId,
      });
      nextDoc = appendInstructionVariant(nextDoc, pending);
      nextDoc = patchInstructionVariant(
        nextDoc,
        pending.id,
        instructionVariantWithStatus(pending, "completed", {
          resultUrl: result.resultUrl,
          resultStorageKey: result.storageKey,
          provider: result.provider,
          model: result.model,
          versionNote: result.versionNote,
        })
      );
    }
    onDocumentChange(nextDoc);
    setGenerating(false);
    setStatusMessage(t("editor.instructionStudio.v2.bulkSuccess" as never));
  };

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const uploaded = await uploadEditorSourceImage(file);
      const asset = createBrandReferenceAsset({
        name: file.name,
        url: uploaded.workingImageUrl,
        transparentBackground: true,
      });
      let nextDoc = appendBrandReference(document, asset);
      const obj = findInstructionObjectV2(nextDoc, selection.objectKey);
      nextDoc = {
        ...nextDoc,
        instructionStudioState: {
          ...nextDoc.instructionStudioState,
          selection: {
            ...selection,
            logoReferenceId: asset.id,
            action: isBrandingAction(selection.action) ? selection.action : "add_logo",
            brandingPlacementHint:
              selection.brandingPlacementHint ??
              defaultBrandingPlacementHint(obj?.category ?? selection.category),
          },
        },
      };
      onDocumentChange(nextDoc);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleReferenceUpload = async (
    file: File,
    kind: "style" | "product"
  ) => {
    const uploaded = await uploadEditorSourceImage(file);
    const ref = createUploadedReference(
      kind === "style" ? "STYLE_REFERENCE" : "PRODUCT_REFERENCE",
      { url: uploaded.workingImageUrl, label: file.name }
    );
    onDocumentChange(
      kind === "style" ? setStyleReference(document, ref) : setProductReference(document, ref)
    );
  };

  const previewUrl =
    previewVariant?.resultUrl && previewVariantId
      ? previewVariant.resultUrl
      : approvedActive?.resultUrl ?? null;

  return (
    <div className="mt-4 space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">
          {t("editor.instructionStudio.title" as never)}
        </h1>
        <p className="text-sm text-zinc-600">{t("editor.instructionStudio.lead" as never)}</p>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="w-full shrink-0 space-y-3 xl:max-w-xs">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("editor.instructionStudio.v2.previewColumn" as never)}
          </p>
          <div>
            <p className="mb-1 text-xs text-zinc-600">
              {t("editor.instructionStudio.originalLabel" as never)}
            </p>
            <EditorCanvasPreview
              document={document}
              selectedLayerId={null}
              selectedPlacementId={null}
              previewOnly
              onSelectLayer={() => undefined}
              onSelectPlacement={() => undefined}
              onMoveLayer={() => undefined}
              onMovePlacement={() => undefined}
              onResizePlacement={() => undefined}
            />
          </div>
          {previewUrl ?
            <div>
              <p className="mb-1 text-xs text-zinc-600">
                {approvedActive
                  ? t("editor.instructionStudio.v2.activeApproved" as never)
                  : t("editor.instructionStudio.variantLabel" as never)}
              </p>
              <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-[#0067B1]/30 bg-zinc-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="" className="h-full w-full object-contain" />
              </div>
            </div>
          : null}
        </div>

        <EditorInstructionComparisonCenter
          document={document}
          variants={variants}
          previewVariantId={previewVariantId}
          compareVariantIds={compareIds}
          onPreview={(id) =>
            onDocumentChange(setPreviewInstructionVariant(document, id || null))
          }
          onToggleCompare={(id) =>
            setCompareIds((prev) =>
              prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 3)
            )
          }
          onRename={(id, name) => onDocumentChange(renameInstructionVariant(document, id, name))}
          onDelete={(id) => onDocumentChange(deleteInstructionVariant(document, id))}
          onNote={(id, note) =>
            onDocumentChange(patchInstructionVariant(document, id, { userNote: note }))
          }
        />

        <aside className="w-full shrink-0 space-y-4 xl:max-w-sm">
          <section className="rounded-2xl border border-[#0067B1]/20 bg-[#0067B1]/5 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              {t("editor.instructionStudio.whatISee" as never)}
            </h2>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              {objectsV2.map((obj) => (
                <li key={obj.id}>
                  <span className="font-medium">{obj.label}</span>
                  <span className="block text-xs text-zinc-500">
                    {t(categoryLabelKey(obj.category) as never)} · {obj.description}
                  </span>
                </li>
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
                value={selection.objectKey}
                onChange={(e) => {
                  const obj = findInstructionObjectV2(document, e.target.value);
                  if (obj) {
                    updateSelection(defaultSelectionForObject(obj));
                  }
                }}
              >
                {objectsV2.map((obj) => (
                  <option key={obj.id} value={obj.id}>
                    {obj.label} ({t(categoryLabelKey(obj.category) as never)})
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 block text-xs font-medium text-zinc-600">
              {t("editor.instructionStudio.actionLabel" as never)}
              <select
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                value={selection.action}
                onChange={(e) =>
                  updateSelection({ action: e.target.value as EditorInstructionDynamicAction })
                }
              >
                {categoryActions.map((action) => (
                  <option key={action} value={action}>
                    {t(actionLabelKey(action) as never)}
                  </option>
                ))}
              </select>
            </label>

            {showBranding ?
              <section className="mt-4 rounded-xl border border-violet-200 bg-violet-50 px-3 py-3">
                <h3 className="text-xs font-semibold text-violet-900">
                  {t("editor.instructionStudio.v2.branding.title" as never)}
                </h3>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void handleLogoUpload(file);
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={uploadingLogo}
                  className="mt-2 w-full rounded-lg border border-violet-300 bg-white px-3 py-2 text-xs font-semibold text-violet-900"
                  onClick={() => logoInputRef.current?.click()}
                >
                  {logoRef
                    ? t("editor.instructionStudio.v2.branding.replaceLogo" as never)
                    : t("editor.instructionStudio.v2.branding.uploadLogo" as never)}
                </button>
                {logoRef ?
                  <p className="mt-2 text-xs text-violet-800">{logoRef.name}</p>
                : null}
                <input
                  className="mt-2 w-full rounded-lg border border-violet-200 px-2 py-1 text-xs"
                  value={selection.brandingPlacementHint ?? ""}
                  placeholder={t("editor.instructionStudio.v2.branding.placementHint" as never)}
                  onChange={(e) => updateSelection({ brandingPlacementHint: e.target.value })}
                />
              </section>
            : null}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <input
                ref={styleInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void handleReferenceUpload(file, "style");
                  }
                }}
              />
              <button
                type="button"
                className="rounded-lg border border-zinc-300 px-2 py-2 text-xs font-medium"
                onClick={() => styleInputRef.current?.click()}
              >
                {t("editor.instructionStudio.v2.reference.style" as never)}
              </button>
            </div>

            <label className="mt-3 block text-xs font-medium text-zinc-600">
              {t("editor.instructionStudio.promptLabel" as never)}
              <textarea
                className="mt-1 min-h-[72px] w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                value={selection.customPrompt ?? ""}
                placeholder={t("editor.instructionStudio.promptPlaceholder" as never)}
                onChange={(e) => updateSelection({ customPrompt: e.target.value })}
              />
            </label>

            <div className="mt-3 space-y-2">
              {(
                [
                  ["preserveStyle", "editor.instructionStudio.slider.preserveStyle"],
                  ["brandPreservation", "editor.instructionStudio.v2.slider.preserveBrand"],
                  ["creativity", "editor.instructionStudio.slider.creativity"],
                  ["changeStrength", "editor.instructionStudio.v2.slider.strength"],
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

            <details className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
              <summary className="cursor-pointer font-medium text-zinc-800">
                {t("editor.instructionStudio.promptPreview" as never)}
              </summary>
              <p className="mt-2 whitespace-pre-wrap">{promptPreview}</p>
            </details>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">
              {t("editor.instructionStudio.v2.presets.title" as never)}
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {listCreatorPresets().map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  disabled={generating || legacyReadOnly}
                  className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-800"
                  onClick={() => void handleBulkGenerate(preset.id)}
                >
                  {t(preset.labelKey as never)}
                </button>
              ))}
              <button
                type="button"
                disabled={generating || legacyReadOnly}
                className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-800"
                onClick={() => void handleBulkGenerate()}
              >
                {t("editor.instructionStudio.v2.bulk.generate4" as never)}
              </button>
            </div>
          </section>

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
              className="min-h-11 flex-1 rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t("editor.instructionStudio.generateVariant" as never)}
            </button>
            {previewVariantId && previewVariant ?
              <>
                <button
                  type="button"
                  className="min-h-11 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900"
                  onClick={() =>
                    onDocumentChange(approveInstructionVariant(document, previewVariantId))
                  }
                >
                  {t("editor.instructionStudio.v2.approve" as never)}
                </button>
                <button
                  type="button"
                  className="min-h-11 rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800"
                  onClick={() =>
                    onDocumentChange(archiveInstructionVariant(document, previewVariantId))
                  }
                >
                  {t("editor.instructionStudio.v2.reject" as never)}
                </button>
                {previewVariant.approvalStatus === "approved" ?
                  <button
                    type="button"
                    className="min-h-11 rounded-full border border-[#0067B1] px-4 py-2 text-sm font-semibold text-[#0067B1]"
                    onClick={() => {
                      const next = setActiveApprovedVariant(document, previewVariantId);
                      if (next) {
                        onDocumentChange(next);
                      }
                    }}
                  >
                    {t("editor.instructionStudio.v2.setActive" as never)}
                  </button>
                : null}
              </>
            : null}
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
            <button
              type="button"
              className="min-h-11 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800"
              onClick={() => window.open(editorHandoffStudioUrl(document), "_blank", "noopener,noreferrer")}
            >
              {t("editor.instructionStudio.toStudio" as never)}
            </button>
            <button
              type="button"
              className="min-h-11 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800"
              onClick={() => window.open(editorHandoffMotionUrl(document), "_blank", "noopener,noreferrer")}
            >
              {t("editor.instructionStudio.toMotion" as never)}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
