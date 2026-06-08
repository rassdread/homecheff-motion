"use client";

import { useCallback, useRef, useState } from "react";
import { StudioAssetPrefillMergeStep } from "@/components/studio/studio-asset-prefill-merge-step";
import { StudioAssetPrefillReviewCard } from "@/components/studio/studio-asset-prefill-review-card";
import { StudioAssetSummaryReadinessPanel } from "@/components/studio/studio-asset-summary-readiness-panel";
import { StudioCharacterSummaryReadinessPanel } from "@/components/studio/studio-character-summary-readiness-panel";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import {
  buildAssetIdentityPrefillFromImages,
  buildAssetIdentityPrefillFromPrompt,
} from "@/lib/studio-asset-identity-prefill";
import {
  characterFormValuesFromWizardDraft,
  locationFormValuesFromWizardDraft,
  propFormValuesFromWizardDraft,
  worldFormValuesFromWizardDraft,
  type AssetWizardDraft,
} from "@/lib/studio-asset-wizard-draft";
import { entryPathNeedsProposalStep } from "@/lib/studio-asset-wizard-flow";
import {
  getClientImagePreprocessOptionsForRole,
  preprocessImageFile,
} from "@/lib/image-preprocess";
import { postWizardImageUpload, ImageUploadError } from "@/lib/instant-image-upload-client";
import { recordWizardSourceReference } from "@/lib/studio-asset-wizard-source-reference";
import { buildLocationReadinessView } from "@/lib/studio-location-readiness";
import { buildPropReadinessView } from "@/lib/studio-prop-readiness";
import { buildWorldReadinessView } from "@/lib/studio-world-readiness";
import { fetchStudioWorlds } from "@/lib/studio-worlds-client";
import {
  PROP_IDENTITY_MATERIALS,
  PROP_IDENTITY_STYLES,
  PROP_IDENTITY_TYPES,
} from "@/lib/studio-prop-identity-presets";
import {
  WORLD_IDENTITY_COLOR_THEMES,
  WORLD_IDENTITY_MOODS,
  WORLD_IDENTITY_VISUAL_STYLES,
  listVisibleWorldTypes,
} from "@/lib/studio-world-identity-presets";
import { STUDIO_PROP_CATEGORIES } from "@/lib/studio-prop-categories";
import { useEffect, useMemo } from "react";
import type { StudioWorldProfileListItem } from "@/types/studio-api";

type DraftUpdater = (patch: Partial<AssetWizardDraft> | ((d: AssetWizardDraft) => AssetWizardDraft)) => void;

export function StudioAssetWizardInputStep({
  draft,
  onDraftChange,
}: {
  draft: AssetWizardDraft;
  onDraftChange: DraftUpdater;
}) {
  const t = useActiveTranslator();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const path = draft.entryPath;
  const showPrompt =
    path === "prompt_only" || path === "image_and_prompt";
  const showImage =
    path === "image_only" || path === "image_and_prompt" || path === "existing_asset";

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      setUploadError("");
      try {
        const { optimizedBlob, thumbnailBlob, mimeType } = await preprocessImageFile(
          file,
          getClientImagePreprocessOptionsForRole("studio_reference")
        );
        const clientUploadId = crypto.randomUUID();
        const formData = new FormData();
        formData.set("workingImage", optimizedBlob, "working.jpg");
        formData.set("thumbnailImage", thumbnailBlob, "thumb.jpg");
        formData.set("originalFileName", file.name);
        formData.set("mimeType", mimeType);
        formData.set("sizeBytes", String(file.size));
        formData.set("clientUploadId", clientUploadId);
        const uploaded = await postWizardImageUpload(formData);
        onDraftChange((d) => ({
          ...d,
          ...recordWizardSourceReference({
            imageUrl: uploaded.workingImageUrl,
            storageKey: uploaded.workingStorageKey,
            name: file.name.replace(/\.[^.]+$/, ""),
          }),
          referenceImageUrl: uploaded.workingImageUrl,
          referenceStorageKey: uploaded.workingStorageKey,
        }));
      } catch (e) {
        setUploadError(
          e instanceof ImageUploadError ? e.message : t("studio.assetCreation.input.uploadFailed")
        );
      } finally {
        setUploading(false);
      }
    },
    [onDraftChange, t]
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-700">{t("studio.assetCreation.input.lead")}</p>
      {showPrompt ?
        <>
          <label className="block text-sm font-semibold text-zinc-900">
            {t("studio.assetCreation.proposal.promptLabel")}
            <textarea
              value={draft.promptText}
              onChange={(e) => onDraftChange({ promptText: e.target.value })}
              rows={4}
              className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              placeholder={t("studio.assetCreation.proposal.promptPlaceholder")}
            />
          </label>
          <label className="block text-sm text-zinc-700">
            {t("studio.assetCreation.proposal.usageLabel")}
            <input
              value={draft.promptUsage}
              onChange={(e) => onDraftChange({ promptUsage: e.target.value })}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
        </>
      : null}
      {showImage ?
        <div className="space-y-2">
          <p className="text-sm font-semibold text-zinc-900">
            {t("studio.assetCreation.input.imageLabel")}
          </p>
          <input
            ref={fileRef}
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
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="min-h-[44px] rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold"
          >
            {uploading ? t("button.loading") : t("studio.assetCreation.input.uploadImage")}
          </button>
          {draft.referenceImageUrl ?
            <p className="text-xs text-emerald-800">{t("studio.assetCreation.input.imageReady")}</p>
          : null}
          {uploadError ?
            <p className="text-xs text-red-700">{uploadError}</p>
          : null}
        </div>
      : null}
    </div>
  );
}

export function StudioAssetWizardProposalStep({
  draft,
  onDraftChange,
}: {
  draft: AssetWizardDraft;
  onDraftChange: DraftUpdater;
}) {
  const t = useActiveTranslator();
  const [locale] = useLocale();

  const analyze = useCallback(() => {
    if (draft.entryPath === "image_only" || draft.entryPath === "image_and_prompt") {
      const imageProposal = buildAssetIdentityPrefillFromImages({
        kind: draft.kind,
        fileNames: draft.referenceImageUrl ? ["reference.jpg"] : [],
        userDescription: draft.promptText,
        usageContext: draft.promptUsage,
        brandRules: draft.promptBrandRules,
        locale: locale === "nl" ? "nl" : "en",
      });
      onDraftChange({ imageProposal });
      if (draft.entryPath === "image_only") {
        onDraftChange((d) => applyProposalToDraftState(d, imageProposal));
      }
    }
    if (
      draft.promptText.trim() &&
      (draft.entryPath === "prompt_only" || draft.entryPath === "image_and_prompt")
    ) {
      const proposal = buildAssetIdentityPrefillFromPrompt({
        kind: draft.kind,
        prompt: draft.promptText,
        usageContext: draft.promptUsage,
        brandRules: draft.promptBrandRules,
        locale: locale === "nl" ? "nl" : "en",
      });
      onDraftChange({ proposal });
      if (draft.entryPath === "prompt_only") {
        onDraftChange((d) => applyProposalToDraftState(d, proposal));
      }
    }
  }, [draft, locale, onDraftChange]);

  const promptProposal = draft.proposal;
  const imageProposal = draft.imageProposal;

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-700">{t("studio.assetCreation.proposal.lead")}</p>
      <button
        type="button"
        onClick={analyze}
        className="min-h-[44px] rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white"
      >
        {t("studio.assetCreation.proposal.analyze")}
      </button>
      {draft.entryPath === "image_and_prompt" && (promptProposal || imageProposal) ?
        <StudioAssetPrefillMergeStep
          kind={draft.kind}
          promptProposal={promptProposal}
          imageProposal={imageProposal}
          onUseMerged={(merged) => onDraftChange((d) => applyProposalToDraftState(d, merged))}
        />
      : null}
      {draft.entryPath !== "image_and_prompt" && draft.proposal ?
        <StudioAssetPrefillReviewCard
          proposal={draft.proposal}
          applied={draft.proposalApplied}
          onApply={() =>
            onDraftChange((d) =>
              d.proposal ? applyProposalToDraftState(d, d.proposal) : d
            )
          }
          onDismiss={() => onDraftChange({ proposal: null, proposalApplied: false })}
        />
      : null}
    </div>
  );
}

function applyProposalToDraftState(
  draft: AssetWizardDraft,
  proposal: NonNullable<AssetWizardDraft["proposal"]>
): AssetWizardDraft {
  const prefill = proposal.prefill;
  return {
    ...draft,
    proposal,
    proposalApplied: true,
    name: String(prefill.name ?? draft.name).trim() || draft.name,
    description: String(prefill.description ?? draft.description).trim() || draft.description,
    fields: {
      ...draft.fields,
      ...Object.fromEntries(
        Object.entries(prefill).filter(([, v]) => typeof v === "string").map(([k, v]) => [k, v as string])
      ),
    },
  };
}

export function StudioAssetWizardEssentialsStep({
  draft,
  onDraftChange,
}: {
  draft: AssetWizardDraft;
  onDraftChange: DraftUpdater;
}) {
  const t = useActiveTranslator();
  const [worlds, setWorlds] = useState<StudioWorldProfileListItem[]>([]);

  useEffect(() => {
    void fetchStudioWorlds().then((res) => {
      if (res.ok) {
        setWorlds(res.data.worlds);
      }
    });
  }, []);

  const setField = (key: string, value: string) => {
    onDraftChange((d) => ({ ...d, fields: { ...d.fields, [key]: value } }));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-700">{t("studio.assetCreation.essentials.lead")}</p>
      <label className="block text-sm font-semibold text-zinc-900">
        {t("studio.assetCreation.essentials.name")}
        <input
          value={draft.name}
          onChange={(e) => onDraftChange({ name: e.target.value })}
          className="mt-1 w-full min-h-[44px] rounded-xl border border-zinc-200 px-3 py-2 text-sm"
        />
      </label>
      {draft.kind === "character" ?
        <CharacterEssentials draft={draft} setField={setField} worlds={worlds} />
      : null}
      {draft.kind === "prop" ?
        <PropEssentials draft={draft} setField={setField} />
      : null}
      {draft.kind === "location" ?
        <LocationEssentials draft={draft} setField={setField} />
      : null}
      {draft.kind === "world" ?
        <WorldEssentials draft={draft} setField={setField} />
      : null}
    </div>
  );
}

function CharacterEssentials({
  draft,
  setField,
  worlds,
}: {
  draft: AssetWizardDraft;
  setField: (k: string, v: string) => void;
  worlds: StudioWorldProfileListItem[];
}) {
  const t = useActiveTranslator();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-xs font-medium text-zinc-800">
        {t("studio.assetCreation.essentials.characterType")}
        <select
          className="mt-1 w-full min-h-[44px] rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          value={draft.fields.characterType ?? ""}
          onChange={(e) => setField("characterType", e.target.value)}
        >
          <option value="">—</option>
          {(["mascot", "host", "chef", "narrator", "customer"] as const).map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-zinc-800">
        {t("studio.assetCreation.essentials.visualStyle")}
        <input
          className="mt-1 w-full min-h-[44px] rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          value={draft.fields.visualStyle ?? ""}
          onChange={(e) => setField("visualStyle", e.target.value)}
        />
      </label>
      <label className="block text-xs font-medium text-zinc-800 sm:col-span-2">
        {t("studio.assetCreation.essentials.personality")}
        <textarea
          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          rows={2}
          value={draft.fields.personality ?? ""}
          onChange={(e) => setField("personality", e.target.value)}
        />
      </label>
      <label className="block text-xs font-medium text-zinc-800">
        {t("studio.assetCreation.essentials.world")}
        <select
          className="mt-1 w-full min-h-[44px] rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          value={draft.fields.worldProfileId ?? ""}
          onChange={(e) => setField("worldProfileId", e.target.value)}
        >
          <option value="">—</option>
          {worlds.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-zinc-800">
        {t("studio.assetCreation.essentials.voiceProfile")}
        <input
          className="mt-1 w-full min-h-[44px] rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          placeholder="warm_narrator"
          value={draft.fields.voiceProfile ?? ""}
          onChange={(e) => setField("voiceProfile", e.target.value)}
        />
      </label>
    </div>
  );
}

function PropEssentials({
  draft,
  setField,
}: {
  draft: AssetWizardDraft;
  setField: (k: string, v: string) => void;
}) {
  const t = useActiveTranslator();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-xs font-medium text-zinc-800">
        {t("studio.assetCreation.essentials.category")}
        <select
          className="mt-1 w-full min-h-[44px] rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          value={draft.fields.category ?? ""}
          onChange={(e) => setField("category", e.target.value)}
        >
          {STUDIO_PROP_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-zinc-800">
        {t("studio.assetCreation.essentials.propType")}
        <select
          className="mt-1 w-full min-h-[44px] rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          value={draft.fields.propType ?? ""}
          onChange={(e) => setField("propType", e.target.value)}
        >
          <option value="">—</option>
          {PROP_IDENTITY_TYPES.map((typeId) => (
            <option key={typeId} value={typeId}>
              {typeId}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-zinc-800">
        {t("studio.assetCreation.essentials.style")}
        <select
          className="mt-1 w-full min-h-[44px] rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          value={draft.fields.styleId ?? ""}
          onChange={(e) => setField("styleId", e.target.value)}
        >
          <option value="">—</option>
          {PROP_IDENTITY_STYLES.map((styleId) => (
            <option key={styleId} value={styleId}>
              {styleId}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-zinc-800">
        {t("studio.assetCreation.essentials.material")}
        <select
          className="mt-1 w-full min-h-[44px] rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          value={draft.fields.material ?? ""}
          onChange={(e) => setField("material", e.target.value)}
        >
          <option value="">—</option>
          {PROP_IDENTITY_MATERIALS.map((materialId) => (
            <option key={materialId} value={materialId}>
              {materialId}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-zinc-800">
        {t("studio.assetCreation.essentials.colorTheme")}
        <input
          className="mt-1 w-full min-h-[44px] rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          value={draft.fields.colorTheme ?? ""}
          onChange={(e) => setField("colorTheme", e.target.value)}
        />
      </label>
      <label className="block text-xs font-medium text-zinc-800 sm:col-span-2">
        {t("studio.assetCreation.essentials.usage")}
        <input
          className="mt-1 w-full min-h-[44px] rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          value={draft.fields.usageContext ?? ""}
          onChange={(e) => setField("usageContext", e.target.value)}
        />
      </label>
    </div>
  );
}

function LocationEssentials({
  draft,
  setField,
}: {
  draft: AssetWizardDraft;
  setField: (k: string, v: string) => void;
}) {
  const t = useActiveTranslator();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(
        [
          ["locationType", t("studio.assetCreation.essentials.locationType")],
          ["visualStyle", t("studio.assetCreation.essentials.visualStyle")],
          ["mood", t("studio.assetCreation.essentials.mood")],
          ["architecture", t("studio.assetCreation.essentials.architecture")],
          ["lighting", t("studio.assetCreation.essentials.lighting")],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="block text-xs font-medium text-zinc-800">
          {label}
          <input
            className="mt-1 w-full min-h-[44px] rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={draft.fields[key] ?? ""}
            onChange={(e) => setField(key, e.target.value)}
          />
        </label>
      ))}
    </div>
  );
}

function WorldEssentials({
  draft,
  setField,
}: {
  draft: AssetWizardDraft;
  setField: (k: string, v: string) => void;
}) {
  const t = useActiveTranslator();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-xs font-medium text-zinc-800">
        {t("studio.assetCreation.essentials.worldType")}
        <select
          className="mt-1 w-full min-h-[44px] rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          value={draft.fields.worldType ?? ""}
          onChange={(e) => setField("worldType", e.target.value)}
        >
          <option value="">—</option>
          {listVisibleWorldTypes(true).map((wt) => (
            <option key={wt} value={wt}>
              {wt}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-zinc-800">
        {t("studio.assetCreation.essentials.mood")}
        <select
          className="mt-1 w-full min-h-[44px] rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          value={draft.fields.mood ?? ""}
          onChange={(e) => setField("mood", e.target.value)}
        >
          <option value="">—</option>
          {WORLD_IDENTITY_MOODS.map((moodId) => (
            <option key={moodId} value={moodId}>
              {moodId}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-zinc-800">
        {t("studio.assetCreation.essentials.visualStyle")}
        <select
          className="mt-1 w-full min-h-[44px] rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          value={draft.fields.visualStyle ?? ""}
          onChange={(e) => setField("visualStyle", e.target.value)}
        >
          <option value="">—</option>
          {WORLD_IDENTITY_VISUAL_STYLES.map((styleId) => (
            <option key={styleId} value={styleId}>
              {styleId}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-zinc-800">
        {t("studio.assetCreation.essentials.colorTheme")}
        <select
          className="mt-1 w-full min-h-[44px] rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          value={draft.fields.colorTheme ?? ""}
          onChange={(e) => setField("colorTheme", e.target.value)}
        >
          <option value="">—</option>
          {WORLD_IDENTITY_COLOR_THEMES.map((colorId) => (
            <option key={colorId} value={colorId}>
              {colorId}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-zinc-800 sm:col-span-2">
        {t("studio.assetCreation.essentials.brandRules")}
        <textarea
          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          rows={2}
          value={draft.fields.brandRules ?? ""}
          onChange={(e) => setField("brandRules", e.target.value)}
        />
      </label>
    </div>
  );
}

export function StudioAssetWizardReviewStep({
  draft,
  onDraftChange,
}: {
  draft: AssetWizardDraft;
  onDraftChange?: (patch: Partial<AssetWizardDraft> | ((d: AssetWizardDraft) => AssetWizardDraft)) => void;
}) {
  const t = useActiveTranslator();
  const [worlds, setWorlds] = useState<StudioWorldProfileListItem[]>([]);

  useEffect(() => {
    void fetchStudioWorlds().then((res) => {
      if (res.ok) {
        setWorlds(res.data.worlds);
      }
    });
  }, []);

  const characterValues = useMemo(
    () => (draft.kind === "character" ? characterFormValuesFromWizardDraft(draft) : null),
    [draft]
  );

  const assetReadiness = useMemo(() => {
    if (draft.kind === "prop") {
      const values = propFormValuesFromWizardDraft(draft);
      return buildPropReadinessView({
        identity: values.identity,
        referenceImageUrl: values.referenceImageUrl,
        worlds,
        mode: "create",
      });
    }
    if (draft.kind === "location") {
      const values = locationFormValuesFromWizardDraft(draft);
      return buildLocationReadinessView({
        identity: values.identity,
        referenceImageUrl: values.referenceImageUrl,
        worlds,
        mode: "create",
      });
    }
    if (draft.kind === "world") {
      const values = worldFormValuesFromWizardDraft(draft);
      return buildWorldReadinessView({
        identity: values.identity,
        mode: "create",
      });
    }
    return null;
  }, [draft, worlds]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm space-y-3">
        {onDraftChange ?
          <label className="block font-medium text-zinc-800">
            {t("studio.assetCreation.review.name")}
            <input
              className="mt-1 w-full min-h-[48px] rounded-xl border border-zinc-200 px-4 py-2 text-base"
              value={draft.name}
              onChange={(e) => onDraftChange({ name: e.target.value })}
            />
          </label>
        : (
          <p>
            <span className="font-semibold">{t("studio.assetCreation.review.name")}:</span>{" "}
            {draft.name || "—"}
          </p>
        )}
        <p>
          <span className="font-semibold">{t("studio.assetCreation.review.type")}:</span>{" "}
          {t(`studio.assetCreation.kind.${draft.kind}` as never)}
        </p>
        {draft.choiceBasedFlow && draft.summaryPrompt ?
          <p>
            <span className="font-semibold">{t("studio.assetCreation.review.summary")}:</span>{" "}
            {draft.summaryPrompt}
          </p>
        : null}
        {!draft.choiceBasedFlow ?
          <p>
            <span className="font-semibold">{t("studio.assetCreation.review.entry")}:</span>{" "}
            {draft.entryPath}
          </p>
        : null}
        <p>
          <span className="font-semibold">{t("studio.assetCreation.review.reference")}:</span>{" "}
          {draft.referenceImageUrl
            ? t("studio.assetCreation.review.referenceYes")
            : draft.referenceMode === "skip"
              ? t("studio.assetCreation.review.referenceSkipped")
              : "—"}
        </p>
        {draft.referenceImageUrl ?
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={draft.referenceImageUrl}
            alt=""
            className="max-h-32 rounded-lg object-contain"
          />
        : null}
      </div>
      {draft.kind === "character" && characterValues ?
        <StudioCharacterSummaryReadinessPanel
          mode="create"
          identity={characterValues.identity}
          referenceImageUrl={characterValues.referenceImageUrl}
          voice={characterValues.voice}
          voiceStatus={characterValues.voice.voiceEnabled ? "preset" : "none"}
          worlds={worlds}
        />
      : assetReadiness ?
        <StudioAssetSummaryReadinessPanel
          overallScore={assetReadiness.overallScore}
          overallTier={assetReadiness.overallTier}
          nextStepKey={assetReadiness.nextStepKey}
          domains={assetReadiness.domains}
        />
      : null}
    </div>
  );
}

export function canAdvanceFromInput(draft: AssetWizardDraft): boolean {
  if (draft.entryPath === "design") {
    return true;
  }
  if (draft.entryPath === "prompt_only") {
    return draft.promptText.trim().length > 0;
  }
  if (draft.entryPath === "image_only" || draft.entryPath === "existing_asset") {
    return Boolean(draft.referenceImageUrl);
  }
  if (draft.entryPath === "image_and_prompt") {
    return Boolean(draft.referenceImageUrl) && draft.promptText.trim().length > 0;
  }
  return true;
}

export function canAdvanceFromProposal(draft: AssetWizardDraft): boolean {
  if (!entryPathNeedsProposalStep(draft.entryPath)) {
    return true;
  }
  return draft.proposalApplied;
}

export function canAdvanceFromEssentials(draft: AssetWizardDraft): boolean {
  return draft.name.trim().length > 0;
}

export function canSaveWizardDraft(draft: AssetWizardDraft): boolean {
  if (!draft.name.trim()) {
    return false;
  }
  if (draft.kind === "world") {
    return true;
  }
  if (draft.referenceMode === "skip") {
    return false;
  }
  if (draft.referenceMode === "upload" || draft.referenceImageUrl) {
    return Boolean(draft.referenceImageUrl && draft.referenceStorageKey);
  }
  if (draft.choiceBasedFlow) {
    return false;
  }
  return canAdvanceFromEssentials(draft);
}
