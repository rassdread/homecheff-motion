"use client";

import { useEffect, useMemo, useRef } from "react";
import { StudioIdentityProfileInfoButton } from "@/components/studio/studio-identity-profile-info";
import { StudioWizardSourceReferenceBanner } from "@/components/studio/studio-wizard-source-reference-banner";
import { useActiveTranslator } from "@/i18n/client";
import {
  buildIdentityProfileDraftPatch,
  buildIdentityProfileRecommendation,
  formatCreativityWeightPercent,
  formatIdentityWeightPercent,
  resolveIdentityImportanceLabel,
  seedIdentityProfileFromVision,
  suggestIdentityProfileLevel,
} from "@/lib/studio-asset-identity-profile";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import {
  IDENTITY_ASSET_TYPES,
  IDENTITY_PROFILE_LEVELS,
  type IdentityAssetType,
  type IdentityProfileLevel,
} from "@/types/studio-asset-identity-profile";

type DraftPatch = Partial<AssetWizardDraft> | ((d: AssetWizardDraft) => AssetWizardDraft);

type Props = {
  draft: AssetWizardDraft;
  onDraftChange: (patch: DraftPatch) => void;
};

export function StudioWizardIdentityProfileStep({ draft, onDraftChange }: Props) {
  const t = useActiveTranslator();
  const seededRef = useRef(false);
  const visionKey = draft.sourceVisionAnalysis?.identityFingerprint.fingerprintHash ?? "";

  const recommendation = useMemo(
    () =>
      draft.sourceVisionAnalysis
        ? buildIdentityProfileRecommendation(draft.sourceVisionAnalysis)
        : null,
    [draft.sourceVisionAnalysis]
  );

  useEffect(() => {
    seededRef.current = false;
  }, [visionKey]);

  useEffect(() => {
    if (seededRef.current || draft.sourceVisionAnalysisStatus !== "ready") {
      return;
    }
    if (draft.identityAssetType && draft.identityProfileLevel) {
      seededRef.current = true;
      return;
    }
    seededRef.current = true;
    onDraftChange(seedIdentityProfileFromVision(draft));
  }, [
    draft,
    draft.identityAssetType,
    draft.identityProfileLevel,
    draft.sourceVisionAnalysisStatus,
    onDraftChange,
    visionKey,
  ]);

  const importance = useMemo(
    () =>
      draft.identityProfileLevel
        ? resolveIdentityImportanceLabel(draft.identityProfileLevel)
        : "",
    [draft.identityProfileLevel]
  );

  const handleAssetType = (assetType: IdentityAssetType) => {
    const profileLevel =
      draft.identityProfileLevel ||
      suggestIdentityProfileLevel(assetType, draft.sourceVisionAnalysis);
    onDraftChange(
      buildIdentityProfileDraftPatch(draft, {
        assetType,
        profileLevel,
        confirmed: false,
      })
    );
  };

  const handleProfileLevel = (profileLevel: IdentityProfileLevel) => {
    if (!draft.identityAssetType) {
      return;
    }
    onDraftChange(
      buildIdentityProfileDraftPatch(draft, {
        assetType: draft.identityAssetType,
        profileLevel,
        confirmed: false,
      })
    );
  };

  const handleConfirm = () => {
    if (!draft.identityAssetType || !draft.identityProfileLevel) {
      return;
    }
    onDraftChange(
      buildIdentityProfileDraftPatch(draft, {
        assetType: draft.identityAssetType,
        profileLevel: draft.identityProfileLevel,
        confirmed: true,
      })
    );
  };

  const userOverridesRecommendation =
    recommendation &&
    draft.identityProfileLevel &&
    draft.identityProfileLevel !== recommendation.profileLevel;

  return (
    <div className="space-y-5">
      <StudioWizardSourceReferenceBanner draft={draft} />

      <div>
        <h2 className="text-lg font-semibold text-zinc-900">
          {t("studio.assetCreation.identityProfile.title")}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.assetCreation.identityProfile.lead")}</p>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-zinc-800">
        <p className="font-semibold text-[#0067B1]">
          {t("studio.assetCreation.identityProfile.typeVsProfileTitle")}
        </p>
        <p className="mt-2">{t("studio.assetCreation.identityProfile.typeExplanation")}</p>
        <p className="mt-1">{t("studio.assetCreation.identityProfile.profileExplanation")}</p>
      </div>

      {recommendation ?
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm">
          <p className="font-semibold text-emerald-900">
            {t("studio.assetCreation.identityProfile.recommendationTitle")}:{" "}
            {t(`studio.assetCreation.identityProfile.level.${recommendation.profileLevel}` as never)}
          </p>
          <p className="mt-2 text-emerald-900">
            {t(
              `studio.assetCreation.identityProfile.recommendation.${recommendation.reason}` as never
            )}
          </p>
          {userOverridesRecommendation ?
            <p className="mt-2 text-xs text-emerald-800">
              {t("studio.assetCreation.identityProfile.recommendationOverrideHint")}
            </p>
          : null}
        </div>
      : null}

      {(draft.identityAssetType || draft.identityProfileLevel) ?
        <div className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.assetCreation.identityProfile.summaryAssetType")}
            </p>
            <p className="mt-1 text-base font-semibold text-zinc-900">
              {draft.identityAssetType
                ? t(`studio.assetCreation.identityProfile.assetType.${draft.identityAssetType}` as never)
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.assetCreation.identityProfile.summaryProfile")}
            </p>
            <p className="mt-1 text-base font-semibold text-zinc-900">
              {draft.identityProfileLevel
                ? t(`studio.assetCreation.identityProfile.level.${draft.identityProfileLevel}` as never)
                : "—"}
            </p>
            {draft.identityProfileLevel ?
              <p className="mt-1 text-xs text-zinc-600">
                {t("studio.assetCreation.identityProfile.summaryWeights", {
                  preserve:
                    draft.identityProfileLevel === "master_character"
                      ? t("studio.assetCreation.identityProfile.info.masterCharacterPreserveRange")
                      : `${formatIdentityWeightPercent(draft.identityProfileLevel)}%`,
                  creativity: `${formatCreativityWeightPercent(draft.identityProfileLevel)}%`,
                })}
              </p>
            : null}
          </div>
        </div>
      : null}

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <p className="text-sm font-semibold text-zinc-900">
          {t("studio.assetCreation.identityProfile.assetTypeQuestion")}
        </p>
        <div className="flex flex-wrap gap-2">
          {IDENTITY_ASSET_TYPES.map((id) => {
            const active = draft.identityAssetType === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleAssetType(id)}
                className={`min-h-[40px] rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  active
                    ? "border-[#0067B1] bg-[#0067B1]/10 text-[#0067B1]"
                    : "border-zinc-300 bg-white text-zinc-700"
                }`}
              >
                {t(`studio.assetCreation.identityProfile.assetType.${id}` as never)}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <p className="text-sm font-semibold text-zinc-900">
          {t("studio.assetCreation.identityProfile.profileQuestion")}
        </p>
        <div className="flex flex-wrap gap-2">
          {IDENTITY_PROFILE_LEVELS.filter((id) => id !== "canonical_evolution").map((id) => {
            const active = draft.identityProfileLevel === id;
            return (
              <div key={id} className="inline-flex items-center gap-1">
                <button
                  type="button"
                  disabled={!draft.identityAssetType}
                  onClick={() => handleProfileLevel(id)}
                  className={`min-h-[40px] rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 ${
                    active
                      ? "border-[#0067B1] bg-[#0067B1]/10 text-[#0067B1]"
                      : "border-zinc-300 bg-white text-zinc-700"
                  }`}
                >
                  {t(`studio.assetCreation.identityProfile.level.${id}` as never)}
                </button>
                <StudioIdentityProfileInfoButton level={id} />
              </div>
            );
          })}
        </div>
        {importance ?
          <p className="text-sm text-zinc-600">
            {t("studio.assetCreation.identityProfile.importanceHint", {
              importance: t(`studio.assetCreation.identityProfile.importance.${importance}` as never),
            })}
          </p>
        : null}
      </section>

      {draft.sourceTransformPreserve || draft.sourceTransformChange || draft.sourceTransformForbidden ?
        <section className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm">
          <p className="font-semibold text-zinc-900">
            {t("studio.assetCreation.identityProfile.rulesPreview")}
          </p>
          <dl className="space-y-2">
            <div>
              <dt className="text-xs font-semibold uppercase text-zinc-500">
                {t("studio.assetCreation.transformPrompt.preserveLabel")}
              </dt>
              <dd>{draft.sourceTransformPreserve || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-zinc-500">
                {t("studio.assetCreation.transformPrompt.changeLabel")}
              </dt>
              <dd>{draft.sourceTransformChange || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-zinc-500">
                {t("studio.assetCreation.transformPrompt.forbiddenLabel")}
              </dt>
              <dd>{draft.sourceTransformForbidden || "—"}</dd>
            </div>
          </dl>
          <p className="text-xs text-zinc-500">{t("studio.assetCreation.identityProfile.rulesEditable")}</p>
        </section>
      : null}

      {!draft.identityProfileConfirmed ?
        <button
          type="button"
          disabled={!draft.identityAssetType || !draft.identityProfileLevel}
          onClick={handleConfirm}
          className="min-h-[48px] w-full rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"
        >
          {t("studio.assetCreation.identityProfile.confirm")}
        </button>
      : (
        <p className="text-sm font-medium text-emerald-800">
          {t("studio.assetCreation.identityProfile.confirmed")}
        </p>
      )}
    </div>
  );
}
