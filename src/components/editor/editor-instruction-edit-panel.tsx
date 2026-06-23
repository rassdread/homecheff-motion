"use client";

import { useRef } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { brandingWorkflowRequiresLogo } from "@/lib/editor-instruction-branding";
import { buildBrandAssetProtectionLayer } from "@/lib/brand-asset-protection-layer";
import { buildLogoPlacementWizardRoute } from "@/lib/assistant-editor-routes";
import { objectSupportsLogoPlacement } from "@/lib/logo-placement-blueprint";
import { EditorBrandProtectionBanner } from "@/components/editor/editor-brand-protection-banner";
import {
  actionOptionKey,
  listAccessoryTypesForObject,
  resolveDynamicActionsForObject,
  type DynamicActionOption,
} from "@/lib/editor-instruction-dynamic-actions";
import {
  accessoryAddActionLabelKey,
  accessoryTypeLabelKey,
  buildAccessorySelectionPatch,
} from "@/lib/editor-instruction-accessory-actions";
import { buildEditorInstructionPromptV2 } from "@/lib/editor-instruction-prompt-builder";
import {
  buildTargetOnlyPromptForSelection,
  resolveTargetOnlyEdit,
} from "@/lib/editor-instruction-target-precision";
import { findBrandReference } from "@/lib/editor-instruction-references";
import { buildEditorRecommendationContext } from "@/lib/editor-recommendation-context";
import { resolveStyleActionsForContext } from "@/lib/editor-personalized-recommendations";
import { styleAttributeLabelKey } from "@/lib/editor-style-actions";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type {
  EditorInstructionObjectV2,
  EditorInstructionSelection,
  EditorStyleAttribute,
} from "@/types/editor-instruction-studio";

type ObjectEditorProps = {
  mode: "object";
  document: EditorCanvasDocument;
  object: EditorInstructionObjectV2;
  selection: EditorInstructionSelection;
  colorInput: string;
  addPlanReason: string;
  uploadingLogo: boolean;
  onUpdateSelection: (patch: Partial<EditorInstructionSelection> & { color?: string }) => void;
  onColorInputChange: (value: string) => void;
  onLogoUpload: (file: File) => void;
  onStyleReferenceUpload: (file: File) => void;
  onAddToChangePlan: () => void;
  selectedActionKey: string;
  onActionKeyChange: (key: string, option: DynamicActionOption) => void;
  estimatedSelection?: boolean;
  onExtractPart?: () => void;
};

type StyleEditorProps = {
  mode: "style";
  document: EditorCanvasDocument;
  styleAttribute: EditorStyleAttribute;
  selectedActionId: string;
  onActionIdChange: (actionId: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  onAddToChangePlan: () => void;
};

type Props = ObjectEditorProps | StyleEditorProps;

export function EditorInstructionEditPanel(props: Props) {
  const t = useActiveTranslator();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const styleInputRef = useRef<HTMLInputElement>(null);

  if (props.mode === "style") {
    const recCtx = buildEditorRecommendationContext({ document: props.document });
    const actions = resolveStyleActionsForContext(recCtx, props.styleAttribute);
    return (
      <section
        className={`p-4 ${studioVisual.editorSurface}`}
        data-testid="instruction-style-editor"
      >
        <h2 className="text-sm font-semibold text-zinc-900">
          {t(styleAttributeLabelKey(props.styleAttribute) as never)}
        </h2>
        <p className="mt-1 text-xs text-zinc-600">
          {t("editor.instructionStudio.v2.workspace.styleEditorLead" as never)}
        </p>

        <label className="mt-4 block text-xs font-medium text-zinc-700">
          {t("editor.instructionStudio.actionLabel" as never)}
          <select
            className="mt-1 w-full rounded-lg border border-zinc-300/90 bg-white px-3 py-2 text-sm"
            value={props.selectedActionId}
            onChange={(e) => props.onActionIdChange(e.target.value)}
          >
            {actions.map((action) => (
              <option key={action.id} value={action.id}>
                {t(action.labelKey as never)}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block text-xs font-medium text-zinc-700">
          {t("editor.instructionStudio.promptLabel" as never)}
          <textarea
            className="mt-1 min-h-[72px] w-full rounded-lg border border-zinc-300/90 bg-white px-3 py-2 text-sm"
            value={props.description}
            placeholder={t("editor.instructionStudio.promptPlaceholder" as never)}
            onChange={(e) => props.onDescriptionChange(e.target.value)}
          />
        </label>

        <button
          type="button"
          data-testid="add-style-to-plan"
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#006D52] to-[#0067B1] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_16px_-4px_rgba(0,109,82,0.45)]"
          onClick={props.onAddToChangePlan}
        >
          {t("editor.instructionStudio.v2.changePlan.add" as never)}
        </button>
      </section>
    );
  }

  const {
    document,
    object,
    selection,
    colorInput,
    addPlanReason,
    uploadingLogo,
    onUpdateSelection,
    onColorInputChange,
    onLogoUpload,
    onStyleReferenceUpload,
    onAddToChangePlan,
    selectedActionKey,
    onActionKeyChange,
    estimatedSelection,
    onExtractPart,
  } = props;

  const dynamicActions = resolveDynamicActionsForObject(object);
  const accessoryTypes = listAccessoryTypesForObject(object);
  const logoRef = findBrandReference(document, selection.logoReferenceId);
  const showBranding = brandingWorkflowRequiresLogo(selection.action);
  const canPlaceLogoHere = objectSupportsLogoPlacement(object);
  const brandingProtection = buildBrandAssetProtectionLayer({
    workflowType: "logo_placement",
    logoAssets: logoRef ? [{ referenceId: logoRef.id, url: logoRef.url, name: logoRef.name }] : [],
    userPreserveLogoExact: true,
  });
  const references = selection.logoReferenceId ? [] : [];
  const targetOnly = resolveTargetOnlyEdit(document);
  const promptPreview =
    targetOnly
      ? buildTargetOnlyPromptForSelection(document, selection, {
          brandIdentity: document.assetProfile?.humanSummaryKey,
        })
      : buildEditorInstructionPromptV2({
          ...selection,
          assetName: document.name,
          brandIdentity: document.assetProfile?.humanSummaryKey,
          logoReference: logoRef,
          references,
          brandingPlacementHint: selection.brandingPlacementHint,
        });

  return (
    <section
      className={`p-4 ${studioVisual.editorSurface}`}
      data-testid="instruction-object-editor"
    >
      <h2 className="text-sm font-semibold text-zinc-900">{object.label}</h2>
      <p className="mt-1 text-xs text-zinc-600">
        {t("editor.instructionStudio.v2.workspace.objectEditorLead" as never)}
      </p>
      {estimatedSelection ?
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {t("editor.instructionStudio.v2.partActions.estimatedHint" as never)}
        </p>
      : null}

      {canPlaceLogoHere ?
        <div className="mt-3">
          <a
            href={buildLogoPlacementWizardRoute({ targetObjectId: object.id })}
            className="inline-flex w-full items-center justify-center rounded-lg border border-[#0067B1]/30 bg-white px-3 py-2 text-xs font-semibold text-[#0067B1]"
            data-testid="logo-place-here-action"
          >
            {t("editor.logoPlacement.placeHere" as never)}
          </a>
        </div>
      : null}

      {(showBranding || logoRef) && brandingProtection.active ?
        <div className="mt-3">
          <EditorBrandProtectionBanner protection={brandingProtection} compact />
        </div>
      : null}

      <label className="mt-4 block text-xs font-medium text-zinc-700">
        {t("editor.instructionStudio.actionLabel" as never)}
        <select
          className="mt-1 w-full rounded-lg border border-zinc-300/90 bg-white px-3 py-2 text-sm"
          value={selectedActionKey}
          onChange={(e) => {
            const index = Number(e.target.selectedOptions[0]?.dataset.index ?? 0);
            const option = dynamicActions[index];
            if (option) {
              onActionKeyChange(e.target.value, option);
            }
          }}
        >
          {dynamicActions.map((option, index) => (
            <option
              key={actionOptionKey(option, index)}
              value={actionOptionKey(option, index)}
              data-index={index}
            >
              {t(option.labelKey as never)}
            </option>
          ))}
        </select>
      </label>

      {selection.action === "change_color" ?
        <label className="mt-3 block text-xs font-medium text-zinc-700">
          {t("editor.instructionStudio.v2.changePlan.colorLabel" as never)}
          <input
            type="text"
            className="mt-1 w-full rounded-lg border border-zinc-300/90 bg-white px-3 py-2 text-sm"
            value={colorInput}
            placeholder={t("editor.rec.generic.colorPlaceholder" as never)}
            onChange={(e) => onColorInputChange(e.target.value)}
          />
        </label>
      : null}

      {selection.action === "replace" ?
        <label className="mt-3 block text-xs font-medium text-zinc-700">
          {t("editor.instructionStudio.v2.changePlan.replacementLabel" as never)}
          <input
            type="text"
            className="mt-1 w-full rounded-lg border border-zinc-300/90 bg-white px-3 py-2 text-sm"
            value={selection.replacement ?? ""}
            onChange={(e) => onUpdateSelection({ replacement: e.target.value })}
          />
        </label>
      : null}

      {selection.action === "accessory_add" ?
        <section
          className="mt-3 rounded-xl border border-zinc-200/90 bg-white/90 px-3 py-3"
          data-testid="instruction-accessory-picker"
        >
          <p className="text-xs font-semibold text-zinc-800">
            {t("editor.instructionStudio.v2.accessory.typeLabel" as never)}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {accessoryTypes.map((type) => (
              <button
                key={type}
                type="button"
                data-testid={`accessory-type-${type}`}
                className={`rounded-lg border px-2 py-2 text-left text-xs font-medium transition ${
                  selection.accessoryType === type
                    ? "border-[#006D52] bg-[#006D52]/10 text-[#006D52]"
                    : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-zinc-300"
                }`}
                onClick={() =>
                  onUpdateSelection(buildAccessorySelectionPatch(type, selection.customPrompt))
                }
              >
                {t(accessoryTypeLabelKey(type) as never)}
              </button>
            ))}
          </div>
          {selection.accessoryType === "custom" ?
            <label className="mt-3 block text-xs font-medium text-zinc-700">
              {t("editor.instructionStudio.v2.accessory.addCustom" as never)}
              <textarea
                className="mt-1 min-h-[56px] w-full rounded-lg border border-zinc-300/90 bg-white px-3 py-2 text-sm"
                value={selection.customPrompt ?? ""}
                placeholder={t("editor.instructionStudio.v2.accessory.customPlaceholder" as never)}
                onChange={(e) =>
                  onUpdateSelection(
                    buildAccessorySelectionPatch("custom", e.target.value)
                  )
                }
              />
            </label>
          : selection.accessoryType ?
            <p className="mt-2 text-xs text-zinc-600">
              {t(accessoryAddActionLabelKey(selection.accessoryType) as never)}
            </p>
          : null}
        </section>
      : null}

      {showBranding ?
        <section className="mt-4 rounded-xl border border-[#0067B1]/20 bg-[#0067B1]/5 px-3 py-3">
          <h3 className="text-xs font-semibold text-[#0067B1]">
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
                void onLogoUpload(file);
              }
            }}
          />
          <button
            type="button"
            disabled={uploadingLogo}
            className="mt-2 w-full rounded-lg border border-[#0067B1]/30 bg-white px-3 py-2 text-xs font-semibold text-[#0067B1]"
            onClick={() => logoInputRef.current?.click()}
          >
            {logoRef
              ? t("editor.instructionStudio.v2.branding.replaceLogo" as never)
              : t("editor.instructionStudio.v2.branding.uploadLogo" as never)}
          </button>
          {logoRef ?
            <p className="mt-2 text-xs text-zinc-700">{logoRef.name}</p>
          : null}
          <label className="mt-2 block text-xs font-medium text-zinc-700">
            {t("editor.instructionStudio.v2.branding.placementHint" as never)}
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300/90 bg-white px-2 py-1.5 text-xs"
              value={selection.brandingPlacementHint ?? ""}
              onChange={(e) => onUpdateSelection({ brandingPlacementHint: e.target.value })}
            />
          </label>
        </section>
      : null}

      <input
        ref={styleInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onStyleReferenceUpload(file);
          }
        }}
      />

      <label className="mt-3 block text-xs font-medium text-zinc-700">
        {t("editor.instructionStudio.promptLabel" as never)}
        <textarea
          className="mt-1 min-h-[72px] w-full rounded-lg border border-zinc-300/90 bg-white px-3 py-2 text-sm"
          value={selection.customPrompt ?? ""}
          placeholder={t("editor.instructionStudio.promptPlaceholder" as never)}
          onChange={(e) => onUpdateSelection({ customPrompt: e.target.value })}
          disabled={selection.action === "accessory_add" && selection.accessoryType !== "custom"}
        />
      </label>

      <details className="mt-3 rounded-lg border border-zinc-200/80 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-600">
        <summary className="cursor-pointer font-medium text-zinc-800">
          {t("editor.instructionStudio.promptPreview" as never)}
        </summary>
        <p className="mt-2 whitespace-pre-wrap">{promptPreview}</p>
      </details>

      {selection.action === "detach_asset" && onExtractPart ?
        <button
          type="button"
          className="mt-4 w-full rounded-xl border border-[#0067B1]/30 bg-[#0067B1]/5 px-4 py-2.5 text-sm font-semibold text-[#0067B1]"
          onClick={onExtractPart}
        >
          {t("editor.instructionStudio.v2.partActions.extractNow" as never)}
        </button>
      : null}

      <button
        type="button"
        data-testid="add-object-to-plan"
        className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#006D52] to-[#0067B1] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_16px_-4px_rgba(0,109,82,0.45)]"
        onClick={onAddToChangePlan}
      >
        {t("editor.instructionStudio.v2.changePlan.add" as never)}
      </button>
      {addPlanReason ?
        <p className="mt-1 text-xs text-amber-800">{addPlanReason}</p>
      : null}
    </section>
  );
}
