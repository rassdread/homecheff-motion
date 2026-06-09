"use client";

import { useMemo, useState } from "react";
import { StudioWizardInfoButton } from "@/components/studio/studio-wizard-info-button";
import { StudioWizardSourceReferenceBanner } from "@/components/studio/studio-wizard-source-reference-banner";
import { useActiveTranslator } from "@/i18n/client";
import { postWizardImageUpload } from "@/lib/instant-image-upload-client";
import {
  buildSmartPlacementSuggestions,
  createEmptyReferencePlacement,
} from "@/lib/studio-asset-reference-placement";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import type { AssetDerivationSourceListItem } from "@/types/studio-asset-derivation";
import {
  REFERENCE_PLACEMENT_IMPORTANCE,
  REFERENCE_PLACEMENT_SIZES,
  REFERENCE_PLACEMENT_TARGETS,
  REFERENCE_PLACEMENT_TYPES,
  type AssetReferencePlacement,
} from "@/types/studio-asset-generation-workbench";

type DraftPatch = Partial<AssetWizardDraft> | ((d: AssetWizardDraft) => AssetWizardDraft);

type Props = {
  draft: AssetWizardDraft;
  librarySources: AssetDerivationSourceListItem[];
  onDraftChange: (patch: DraftPatch) => void;
};

export function StudioWizardReferencePlacementStep({ draft, librarySources, onDraftChange }: Props) {
  const t = useActiveTranslator();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const suggestions = useMemo(
    () => (draft.sourceVisionAnalysis ? buildSmartPlacementSuggestions(draft.sourceVisionAnalysis) : []),
    [draft.sourceVisionAnalysis]
  );

  const patchPlacements = (next: AssetReferencePlacement[]) => {
    onDraftChange({ referencePlacements: next });
  };

  const updatePlacement = (id: string, patch: Partial<AssetReferencePlacement>) => {
    patchPlacements(
      draft.referencePlacements.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  };

  const addPlacement = (partial?: Partial<AssetReferencePlacement>) => {
    patchPlacements([...draft.referencePlacements, { ...createEmptyReferencePlacement(), ...partial }]);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("workingImage", file, file.name);
      formData.set("thumbnailImage", file, file.name);
      formData.set("originalFileName", file.name);
      formData.set("mimeType", file.type || "image/png");
      formData.set("sizeBytes", String(file.size));
      formData.set("clientUploadId", crypto.randomUUID());
      const uploaded = await postWizardImageUpload(formData);
      addPlacement({
        previewUrl: uploaded.workingImageUrl,
        storageKey: uploaded.workingStorageKey,
        sourceName: file.name.replace(/\.[^.]+$/, ""),
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <StudioWizardSourceReferenceBanner draft={draft} />
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold text-zinc-900">{t("studio.workbench.placement.title")}</h3>
        <StudioWizardInfoButton infoKey="studio.workbench.info.referencePlacement" />
      </div>
      <p className="text-sm text-zinc-600">{t("studio.workbench.placement.lead")}</p>

      {suggestions.length > 0 ?
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
          <p className="text-xs font-semibold uppercase text-indigo-800">{t("studio.workbench.placement.suggestionsTitle")}</p>
          <ul className="mt-2 space-y-2">
            {suggestions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                <span>{t(s.messageKey as never)} ({Math.round(s.confidence * 100)}%)</span>
                <button
                  type="button"
                  className="rounded-full border border-indigo-200 px-2 py-1 text-xs font-semibold text-indigo-800"
                  onClick={() =>
                    addPlacement({
                      placementType: s.placementType,
                      placementTarget: s.suggestedTarget,
                      sourceName: s.placementType,
                    })
                  }
                >
                  {t("studio.workbench.placement.addSuggestion")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      : null}

      <div className="flex flex-wrap gap-2">
        <label className="min-h-[44px] cursor-pointer rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold">
          {uploading ? t("studio.workbench.placement.uploading") : t("studio.workbench.placement.upload")}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void handleUpload(file);
              }
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="min-h-[44px] rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold"
        >
          {t("studio.workbench.placement.chooseAsset")}
        </button>
        <button
          type="button"
          onClick={() => addPlacement()}
          className="min-h-[44px] rounded-full border border-dashed border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-600"
        >
          {t("studio.workbench.placement.addEmpty")}
        </button>
      </div>

      {draft.referencePlacements.map((placement) => (
        <div key={placement.id} className="space-y-3 rounded-2xl border border-zinc-200 p-4">
          <div className="flex items-start gap-3">
            {placement.previewUrl ?
              <img src={placement.previewUrl} alt="" className="h-14 w-14 rounded-lg border object-cover" />
            : <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-zinc-100 text-xs">—</span>}
            <div className="min-w-0 flex-1">
              <input
                type="text"
                value={placement.sourceName}
                onChange={(e) => updatePlacement(placement.id, { sourceName: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 px-2 py-1 text-sm"
                placeholder={t("studio.workbench.placement.namePlaceholder")}
              />
            </div>
            <button
              type="button"
              onClick={() => patchPlacements(draft.referencePlacements.filter((p) => p.id !== placement.id))}
              className="text-xs text-red-600"
            >
              {t("studio.workbench.placement.remove")}
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <SelectField
              label={t("studio.workbench.placement.type")}
              value={placement.placementType}
              options={REFERENCE_PLACEMENT_TYPES}
              labelPrefix="studio.workbench.placement.type."
              onChange={(v) => updatePlacement(placement.id, { placementType: v as AssetReferencePlacement["placementType"] })}
            />
            <SelectField
              label={t("studio.workbench.placement.target")}
              value={placement.placementTarget}
              options={REFERENCE_PLACEMENT_TARGETS}
              labelPrefix="studio.workbench.placement.target."
              onChange={(v) =>
                updatePlacement(placement.id, { placementTarget: v as AssetReferencePlacement["placementTarget"] })
              }
            />
            <SelectField
              label={t("studio.workbench.placement.size")}
              value={placement.size}
              options={REFERENCE_PLACEMENT_SIZES}
              labelPrefix="studio.workbench.placement.size."
              onChange={(v) => updatePlacement(placement.id, { size: v as AssetReferencePlacement["size"] })}
            />
            <SelectField
              label={t("studio.workbench.placement.importance")}
              value={placement.importance}
              options={REFERENCE_PLACEMENT_IMPORTANCE}
              labelPrefix="studio.workbench.placement.importance."
              onChange={(v) =>
                updatePlacement(placement.id, { importance: v as AssetReferencePlacement["importance"] })
              }
            />
          </div>
          {placement.placementTarget === "custom" ?
            <input
              type="text"
              value={placement.placementTargetCustom ?? ""}
              onChange={(e) => updatePlacement(placement.id, { placementTargetCustom: e.target.value })}
              className="w-full rounded-lg border border-zinc-200 px-2 py-1 text-sm"
              placeholder={t("studio.workbench.placement.customTargetPlaceholder")}
            />
          : null}
        </div>
      ))}

      {pickerOpen ?
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-xs font-semibold text-zinc-700">{t("studio.workbench.placement.pickFromLibrary")}</p>
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
            {librarySources.map((source) => (
              <li key={`${source.assetId}-${source.name}`}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-white"
                  onClick={() => {
                    addPlacement({
                      assetId: source.assetId,
                      previewUrl: source.thumbnailUrl,
                      storageKey: source.referenceStorageKey,
                      sourceName: source.name,
                    });
                    setPickerOpen(false);
                  }}
                >
                  {source.thumbnailUrl ?
                    <img src={source.thumbnailUrl} alt="" className="h-8 w-8 rounded object-cover" />
                  : null}
                  <span>{source.name}</span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-2 text-xs text-zinc-600"
            onClick={() => setPickerOpen(false)}
          >
            {t("studio.workbench.placement.closePicker")}
          </button>
        </div>
      : null}
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  labelPrefix,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  labelPrefix: string;
  onChange: (value: string) => void;
}) {
  const t = useActiveTranslator();
  return (
    <label className="block text-xs">
      <span className="font-medium text-zinc-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {t(`${labelPrefix}${opt}` as never)}
          </option>
        ))}
      </select>
    </label>
  );
}
