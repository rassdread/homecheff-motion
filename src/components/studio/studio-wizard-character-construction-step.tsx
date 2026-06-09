"use client";

import { useEffect, useMemo, useRef } from "react";
import { StudioWizardInfoButton } from "@/components/studio/studio-wizard-info-button";
import { StudioWizardSourceReferenceBanner } from "@/components/studio/studio-wizard-source-reference-banner";
import { useActiveTranslator } from "@/i18n/client";
import {
  bodyVisibilityRequiresConstruction,
  defaultConstructionForAssetType,
  detectBodyVisibilityFromVision,
} from "@/lib/studio-asset-animation-readiness";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import type { CharacterConstructionProfile } from "@/types/studio-asset-animation-readiness";

type DraftPatch = Partial<AssetWizardDraft> | ((d: AssetWizardDraft) => AssetWizardDraft);

type Props = {
  draft: AssetWizardDraft;
  onDraftChange: (patch: DraftPatch) => void;
};

function ChipGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-zinc-900">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`min-h-[40px] rounded-full border px-3 py-1.5 text-xs font-semibold ${
              value === opt.id
                ? "border-[#0067B1] bg-[#0067B1]/10 text-[#0067B1]"
                : "border-zinc-300 bg-white text-zinc-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function StudioWizardCharacterConstructionStep({ draft, onDraftChange }: Props) {
  const t = useActiveTranslator();
  const seededRef = useRef(false);
  const vision = draft.sourceVisionAnalysis;
  const assetType = draft.identityAssetType || "character";

  const bodyVisibility = useMemo(
    () => draft.characterConstruction.bodyVisibility ?? (vision ? detectBodyVisibilityFromVision(vision) : "partial"),
    [draft.characterConstruction.bodyVisibility, vision]
  );

  useEffect(() => {
    seededRef.current = false;
  }, [vision?.identityFingerprint.fingerprintHash]);

  useEffect(() => {
    if (seededRef.current || !vision) {
      return;
    }
    seededRef.current = true;
    const defaults = defaultConstructionForAssetType(assetType, vision);
    onDraftChange({
      characterConstruction: {
        ...defaults,
        bodyVisibility: defaults.bodyVisibility ?? detectBodyVisibilityFromVision(vision),
        requiresConstruction: bodyVisibilityRequiresConstruction(
          defaults.bodyVisibility ?? detectBodyVisibilityFromVision(vision)
        ),
        ...draft.characterConstruction,
      },
    });
  }, [assetType, draft.characterConstruction, onDraftChange, vision]);

  const patchConstruction = (patch: Partial<CharacterConstructionProfile>) => {
    onDraftChange({
      characterConstruction: { ...draft.characterConstruction, ...patch },
      characterConstructionConfirmed: false,
    });
  };

  const personFields = (
    <>
      <ChipGroup
        label={t("studio.assetCreation.characterConstruction.bodyType")}
        value={draft.characterConstruction.bodyType ?? ""}
        onChange={(id) => patchConstruction({ bodyType: id })}
        options={[
          { id: "slim", label: t("studio.assetCreation.characterConstruction.bodyType.slim") },
          { id: "average", label: t("studio.assetCreation.characterConstruction.bodyType.average") },
          { id: "athletic", label: t("studio.assetCreation.characterConstruction.bodyType.athletic") },
          { id: "muscular", label: t("studio.assetCreation.characterConstruction.bodyType.muscular") },
          { id: "heavy", label: t("studio.assetCreation.characterConstruction.bodyType.heavy") },
          { id: "custom", label: t("studio.assetCreation.characterConstruction.custom") },
        ]}
      />
      {draft.characterConstruction.bodyType === "custom" ?
        <input
          type="text"
          value={draft.characterConstruction.bodyTypeCustom ?? ""}
          onChange={(e) => patchConstruction({ bodyTypeCustom: e.target.value })}
          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          placeholder={t("studio.assetCreation.characterConstruction.bodyTypeCustomPlaceholder")}
        />
      : null}
      <ChipGroup
        label={t("studio.assetCreation.characterConstruction.height")}
        value={draft.characterConstruction.heightProfile ?? ""}
        onChange={(id) => patchConstruction({ heightProfile: id })}
        options={[
          { id: "short", label: t("studio.assetCreation.characterConstruction.height.short") },
          { id: "average", label: t("studio.assetCreation.characterConstruction.height.average") },
          { id: "tall", label: t("studio.assetCreation.characterConstruction.height.tall") },
          { id: "exact", label: t("studio.assetCreation.characterConstruction.height.exact") },
        ]}
      />
      <ChipGroup
        label={t("studio.assetCreation.characterConstruction.posture")}
        value={draft.characterConstruction.postureProfile ?? ""}
        onChange={(id) => patchConstruction({ postureProfile: id })}
        options={[
          { id: "upright", label: t("studio.assetCreation.characterConstruction.posture.upright") },
          { id: "relaxed", label: t("studio.assetCreation.characterConstruction.posture.relaxed") },
          { id: "athletic", label: t("studio.assetCreation.characterConstruction.posture.athletic") },
          { id: "confident", label: t("studio.assetCreation.characterConstruction.posture.confident") },
          { id: "custom", label: t("studio.assetCreation.characterConstruction.custom") },
        ]}
      />
      <ChipGroup
        label={t("studio.assetCreation.characterConstruction.ageGroup")}
        value={draft.characterConstruction.ageGroup ?? ""}
        onChange={(id) => patchConstruction({ ageGroup: id })}
        options={[
          { id: "child", label: t("studio.assetCreation.characterConstruction.age.child") },
          { id: "young_adult", label: t("studio.assetCreation.characterConstruction.age.youngAdult") },
          { id: "adult", label: t("studio.assetCreation.characterConstruction.age.adult") },
          { id: "senior", label: t("studio.assetCreation.characterConstruction.age.senior") },
        ]}
      />
      <ChipGroup
        label={t("studio.assetCreation.characterConstruction.walkStyle")}
        value={draft.characterConstruction.walkStyleProfile ?? ""}
        onChange={(id) => patchConstruction({ walkStyleProfile: id })}
        options={[
          { id: "neutral", label: t("studio.assetCreation.characterConstruction.walk.neutral") },
          { id: "energetic", label: t("studio.assetCreation.characterConstruction.walk.energetic") },
          { id: "business", label: t("studio.assetCreation.characterConstruction.walk.business") },
          { id: "relaxed", label: t("studio.assetCreation.characterConstruction.walk.relaxed") },
          { id: "custom", label: t("studio.assetCreation.characterConstruction.custom") },
        ]}
      />
    </>
  );

  const mascotFields = (
    <>
      <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm">
        <p className="font-semibold text-zinc-900">{t("studio.assetCreation.characterConstruction.mascotPreserveTitle")}</p>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.characterConstruction.preserveSilhouette ?? true}
            onChange={(e) => patchConstruction({ preserveSilhouette: e.target.checked })}
          />
          {t("studio.assetCreation.characterConstruction.preserveSilhouette")}
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.characterConstruction.preserveHeadShape ?? true}
            onChange={(e) => patchConstruction({ preserveHeadShape: e.target.checked })}
          />
          {t("studio.assetCreation.characterConstruction.preserveHeadShape")}
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.characterConstruction.preserveProportions ?? true}
            onChange={(e) => patchConstruction({ preserveProportions: e.target.checked })}
          />
          {t("studio.assetCreation.characterConstruction.preserveProportions")}
        </label>
      </div>
      <ChipGroup
        label={t("studio.assetCreation.characterConstruction.standardPose")}
        value={draft.characterConstruction.standardPose ?? ""}
        onChange={(id) => patchConstruction({ standardPose: id })}
        options={[
          { id: "neutral", label: t("studio.assetCreation.characterConstruction.pose.neutral") },
          { id: "presenting", label: t("studio.assetCreation.characterConstruction.pose.presenting") },
          { id: "walking", label: t("studio.assetCreation.characterConstruction.pose.walking") },
          { id: "pointing", label: t("studio.assetCreation.characterConstruction.pose.pointing") },
          { id: "cheerful", label: t("studio.assetCreation.characterConstruction.pose.cheerful") },
        ]}
      />
    </>
  );

  return (
    <div className="space-y-5">
      <StudioWizardSourceReferenceBanner draft={draft} />
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
          {t("studio.assetCreation.characterConstruction.title")}
          <StudioWizardInfoButton infoKey="studio.workbench.info.bodyConstruction" />
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.assetCreation.characterConstruction.lead")}</p>
      </div>

      <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-4 text-sm">
        <p className="font-semibold text-amber-900">
          {t(`studio.assetCreation.characterConstruction.visibility.${bodyVisibility}` as never)}
        </p>
        {bodyVisibilityRequiresConstruction(bodyVisibility) ?
          <p className="mt-1 text-amber-900">{t("studio.assetCreation.characterConstruction.requiresConstruction")}</p>
        : null}
      </div>

      {assetType === "person" ? personFields : null}
      {assetType === "mascot" || assetType === "character" ? mascotFields : null}
      {assetType === "animal" ?
        <ChipGroup
          label={t("studio.assetCreation.characterConstruction.defaultStance")}
          value={draft.characterConstruction.defaultStance ?? ""}
          onChange={(id) => patchConstruction({ defaultStance: id, bodyType: id })}
          options={[
            { id: "standing", label: t("studio.assetCreation.characterConstruction.stance.standing") },
            { id: "sitting", label: t("studio.assetCreation.characterConstruction.stance.sitting") },
            { id: "running", label: t("studio.assetCreation.characterConstruction.stance.running") },
          ]}
        />
      : null}
      {assetType === "vehicle" ?
        <>
          <ChipGroup
            label={t("studio.assetCreation.characterConstruction.scale")}
            value={draft.characterConstruction.scaleProfile ?? ""}
            onChange={(id) => patchConstruction({ scaleProfile: id })}
            options={[
              { id: "hero", label: t("studio.assetCreation.characterConstruction.scale.hero") },
              { id: "realistic", label: t("studio.assetCreation.characterConstruction.scale.realistic") },
            ]}
          />
          <ChipGroup
            label={t("studio.assetCreation.characterConstruction.presentationAngle")}
            value={draft.characterConstruction.presentationAngle ?? ""}
            onChange={(id) => patchConstruction({ presentationAngle: id, heroView: id === "three_quarter" })}
            options={[
              { id: "front", label: t("studio.assetCreation.characterConstruction.angle.front") },
              { id: "three_quarter", label: t("studio.assetCreation.characterConstruction.angle.threeQuarter") },
              { id: "side", label: t("studio.assetCreation.characterConstruction.angle.side") },
            ]}
          />
        </>
      : null}
      {!["person", "mascot", "character", "animal", "vehicle"].includes(assetType) ?
        <p className="text-sm text-zinc-600">{t("studio.assetCreation.characterConstruction.genericHint")}</p>
      : null}

      <button
        type="button"
        onClick={() => onDraftChange({ characterConstructionConfirmed: true })}
        className="min-h-[48px] rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white"
      >
        {t("studio.assetCreation.characterConstruction.confirm")}
      </button>
    </div>
  );
}
