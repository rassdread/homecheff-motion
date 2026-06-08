"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { StudioAssetCreateEntryChoice } from "@/components/studio/studio-asset-create-entry-choice";
import { StudioAssetImagePrefillHint } from "@/components/studio/studio-asset-image-prefill-hint";
import { StudioAssetPrefillMergeStep } from "@/components/studio/studio-asset-prefill-merge-step";
import { StudioAssetPromptPrefillStep } from "@/components/studio/studio-asset-prompt-prefill-step";
import { StudioAssetSummaryReadinessPanel } from "@/components/studio/studio-asset-summary-readiness-panel";
import { StudioLocationCategoryBadge } from "@/components/studio/studio-location-category-badge";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  STUDIO_LOCATION_CATEGORIES,
  type StudioLocationCategory,
} from "@/lib/studio-location-categories";
import {
  getClientImagePreprocessOptionsForRole,
  preprocessImageFile,
} from "@/lib/image-preprocess";
import { postWizardImageUpload, ImageUploadError } from "@/lib/instant-image-upload-client";
import {
  locationIdentityFormFromLocation,
  locationIdentityFormToPatch,
  mergeLocationIdentityForm,
  type LocationIdentityFormValues,
} from "@/lib/studio-location-identity-fields";
import {
  LOCATION_IDENTITY_ARCHITECTURE,
  LOCATION_IDENTITY_COLOR_THEMES,
  LOCATION_IDENTITY_LIGHTING,
  LOCATION_IDENTITY_MOODS,
  LOCATION_IDENTITY_TYPES,
  listVisibleLocationStyles,
} from "@/lib/studio-location-identity-presets";
import { buildLocationReadinessView } from "@/lib/studio-location-readiness";
import { fetchStudioWorlds } from "@/lib/studio-worlds-client";
import type { AssetCreateEntryPath, AssetPromptPrefillProposal } from "@/types/studio-asset-creation";
import type { StudioLocationDetail, StudioWorldProfileListItem } from "@/types/studio-api";

export type StudioLocationFormValues = {
  name: string;
  category: StudioLocationCategory;
  description: string;
  referenceImageUrl: string;
  referenceStorageKey: string;
  identity: LocationIdentityFormValues;
};

type StudioLocationFormProps = {
  mode: "create" | "edit";
  initial?: StudioLocationDetail;
  submitLabel: string;
  onSubmit: (values: StudioLocationFormValues) => Promise<void>;
  backHref: string;
  createEntryPath?: AssetCreateEntryPath | null;
  wizardProposal?: AssetPromptPrefillProposal | null;
  proposalApplied?: boolean;
};

function emptyIdentity(): LocationIdentityFormValues {
  return {
    name: "",
    description: "",
    locationType: "",
    visualStyle: "",
    mood: "",
    architecture: "",
    materials: "",
    colorTheme: "",
    lighting: "",
    crowdLevel: "",
    visualIdentity: "",
    worldMemory: "",
    forbiddenElements: "",
    usageContext: "",
    worldProfileId: null,
  };
}

function fromDetail(d: StudioLocationDetail): StudioLocationFormValues {
  const identity = locationIdentityFormFromLocation(d);
  return {
    name: d.name,
    category: d.category,
    description: d.description,
    referenceImageUrl: d.referenceImageUrl,
    referenceStorageKey: d.referenceStorageKey,
    identity,
  };
}

export function studioLocationFormToCreatePayload(values: StudioLocationFormValues) {
  const patch = locationIdentityFormToPatch({
    ...values.identity,
    name: values.name,
    description: values.description,
  });
  return {
    name: patch.name ?? values.name.trim(),
    category: patch.category ?? values.category,
    description: patch.description ?? values.description,
    referenceImageUrl: values.referenceImageUrl,
    referenceStorageKey: values.referenceStorageKey,
    visualIdentity: patch.visualIdentity,
    worldMemory: patch.worldMemory,
    environmentKeywords: patch.environmentKeywords,
    continuityNotes: patch.continuityNotes,
    worldProfileId: patch.worldProfileId,
  };
}

export function StudioLocationForm({
  mode,
  initial,
  submitLabel,
  onSubmit,
  backHref,
  createEntryPath: initialEntryPath = null,
  wizardProposal = null,
  proposalApplied = false,
}: StudioLocationFormProps) {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<StudioLocationFormValues>(() => {
    const base =
      initial ? fromDetail(initial) : {
        name: "",
        category: "garden" as StudioLocationCategory,
        description: "",
        referenceImageUrl: "",
        referenceStorageKey: "",
        identity: emptyIdentity(),
      };
    if (mode === "create" && wizardProposal && proposalApplied) {
      return {
        ...base,
        identity: mergeLocationIdentityForm(
          base.identity,
          wizardProposal.prefill as Partial<LocationIdentityFormValues>
        ),
        name: String(wizardProposal.prefill.name ?? base.name),
        description: String(wizardProposal.prefill.description ?? base.description),
      };
    }
    return base;
  });
  const [worlds, setWorlds] = useState<StudioWorldProfileListItem[]>([]);
  const [previewUrl, setPreviewUrl] = useState(initial?.referenceImageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createEntryPath, setCreateEntryPath] = useState<AssetCreateEntryPath | null>(() =>
    mode === "create" ? initialEntryPath : null
  );
  const [showAssignReference, setShowAssignReference] = useState(false);
  const [lastUploadedFileName, setLastUploadedFileName] = useState("");
  const [imagePrefillProposal, setImagePrefillProposal] =
    useState<AssetPromptPrefillProposal | null>(null);
  const [promptPrefillProposal, setPromptPrefillProposal] =
    useState<AssetPromptPrefillProposal | null>(wizardProposal);

  useEffect(() => {
    if (!session.resolved || !session.user) return;
    void fetchStudioWorlds().then((res) => {
      if (res.ok) setWorlds(res.data.worlds);
    });
  }, [session.resolved, session.user]);

  const readiness = useMemo(
    () =>
      buildLocationReadinessView({
        identity: { ...values.identity, name: values.name, description: values.description },
        referenceImageUrl: values.referenceImageUrl,
        worlds,
        mode,
      }),
    [values, worlds, mode]
  );

  const locationStyles = listVisibleLocationStyles(true);

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file || !session.user) return;
      setError("");
      setUploading(true);
      try {
        const opts = getClientImagePreprocessOptionsForRole(session.user.role);
        const { optimizedBlob, thumbnailBlob, mimeType } = await preprocessImageFile(file, opts);
        const clientUploadId = crypto.randomUUID();
        const formData = new FormData();
        formData.set("workingImage", optimizedBlob, "working.jpg");
        formData.set("thumbnailImage", thumbnailBlob, "thumb.jpg");
        formData.set("originalFileName", file.name);
        formData.set("mimeType", mimeType);
        formData.set("sizeBytes", String(file.size));
        formData.set("clientUploadId", clientUploadId);
        const uploaded = await postWizardImageUpload(formData);
        setValues((v) => ({
          ...v,
          referenceImageUrl: uploaded.workingImageUrl,
          referenceStorageKey: uploaded.workingStorageKey,
        }));
        setPreviewUrl(uploaded.workingImageUrl);
        setLastUploadedFileName(file.name);
        setShowAssignReference(true);
      } catch (e) {
        const message =
          e instanceof ImageUploadError
            ? e.message
            : e instanceof Error
              ? e.message
              : t("studio.locations.uploadFailed");
        setError(message);
      } finally {
        setUploading(false);
      }
    },
    [session.user, t]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!values.name.trim()) {
      setError(t("studio.locations.error.nameRequired"));
      return;
    }
    if (mode === "create" && (!values.referenceImageUrl || !values.referenceStorageKey)) {
      setError(t("studio.locations.error.imageRequired"));
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        ...values,
        identity: { ...values.identity, name: values.name, description: values.description },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("studio.locations.error.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const showEntryChoice = mode === "create" && createEntryPath === null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {mode === "create" ?
        <StudioAssetSummaryReadinessPanel
          overallScore={readiness.overallScore}
          overallTier={readiness.overallTier}
          nextStepKey={readiness.nextStepKey}
          domains={readiness.domains}
        />
      : null}

      {showEntryChoice ?
        <AppCard className="bg-white p-6">
          <StudioAssetCreateEntryChoice onSelect={setCreateEntryPath} />
        </AppCard>
      : null}

      {mode === "create" &&
      (createEntryPath === "prompt_only" || createEntryPath === "image_and_prompt") ?
        <StudioAssetPromptPrefillStep
          kind="location"
          initialProposal={wizardProposal}
          initialApplied={proposalApplied}
          onApply={(proposal) => {
            setPromptPrefillProposal(proposal);
            setValues((v) => ({
              ...v,
              identity: mergeLocationIdentityForm(v.identity, proposal.prefill as Partial<LocationIdentityFormValues>),
              name: String(proposal.prefill.name ?? v.name),
              description: String(proposal.prefill.description ?? v.description),
            }));
          }}
        />
      : null}

      {mode === "create" && createEntryPath === "image_and_prompt" ?
        <StudioAssetPrefillMergeStep
          kind="location"
          promptProposal={promptPrefillProposal}
          imageProposal={imagePrefillProposal}
          onUseMerged={(merged) => {
            setValues((v) => ({
              ...v,
              identity: mergeLocationIdentityForm(v.identity, merged.prefill as Partial<LocationIdentityFormValues>),
              name: String(merged.prefill.name ?? v.name),
              description: String(merged.prefill.description ?? v.description),
            }));
          }}
        />
      : null}

      {createEntryPath !== null || mode === "edit" ?
        <>
          <AppCard className="bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-[#006D52]">
              {t("studio.assetCreation.reference.officialLabel")}
            </p>
            <label className="mt-2 block text-sm font-semibold text-zinc-900">
              {t("studio.locations.field.referenceImage")}
            </label>
            <p className="mt-1 text-xs text-zinc-500">{t("studio.locations.field.referenceImageHint")}</p>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="relative aspect-square w-full max-w-[200px] overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
                {previewUrl ?
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                : <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                    {t("studio.locations.noPreview")}
                  </div>
                }
              </div>
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(ev) => void handleFile(ev.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="rounded-full border border-[#0067B1]/40 px-4 py-2 text-sm font-semibold text-[#0067B1] hover:bg-[#0067B1]/5 disabled:opacity-50"
                >
                  {uploading ? t("button.loading") : t("studio.locations.uploadImage")}
                </button>
                {showAssignReference && previewUrl ?
                  <p className="mt-2 text-xs text-emerald-800">{t("studio.assetCreation.reference.assigned")}</p>
                : null}
                {mode === "create" &&
                (createEntryPath === "image_only" || createEntryPath === "image_and_prompt") ?
                  <StudioAssetImagePrefillHint
                    kind="location"
                    fileName={lastUploadedFileName}
                    onProposalReady={setImagePrefillProposal}
                    onApply={(proposal) => {
                      setImagePrefillProposal(proposal);
                      setValues((v) => ({
                        ...v,
                        identity: mergeLocationIdentityForm(
                          v.identity,
                          proposal.prefill as Partial<LocationIdentityFormValues>
                        ),
                        name: String(proposal.prefill.name ?? v.name),
                        description: String(proposal.prefill.description ?? v.description),
                      }));
                    }}
                  />
                : null}
                {mode === "edit" ?
                  <p className="mt-2 text-xs text-zinc-500">{t("studio.locations.replaceImageHint")}</p>
                : null}
              </div>
            </div>
          </AppCard>

          <AppCard className="space-y-4 bg-white p-6">
            <div>
              <label htmlFor="loc-name" className="text-sm font-semibold text-zinc-900">
                {t("studio.locations.field.name")}
              </label>
              <input
                id="loc-name"
                required
                value={values.name}
                onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="loc-type" className="text-sm font-semibold text-zinc-900">
                {t("studio.locationIdentity.fields.locationType")}
              </label>
              <select
                id="loc-type"
                value={values.identity.locationType}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    identity: { ...v.identity, locationType: e.target.value },
                  }))
                }
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {LOCATION_IDENTITY_TYPES.map((id) => (
                  <option key={id} value={id}>
                    {t(`studio.locationIdentity.presets.type.${id}` as never)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="loc-category" className="text-sm font-semibold text-zinc-900">
                {t("studio.locations.field.category")}
              </label>
              <select
                id="loc-category"
                value={values.category}
                onChange={(e) =>
                  setValues((v) => ({ ...v, category: e.target.value as StudioLocationCategory }))
                }
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              >
                {STUDIO_LOCATION_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {t(`studio.locations.category.${category}`)}
                  </option>
                ))}
              </select>
              <div className="mt-2">
                <StudioLocationCategoryBadge category={values.category} />
              </div>
            </div>
            <div>
              <label htmlFor="loc-style" className="text-sm font-semibold text-zinc-900">
                {t("studio.locationIdentity.fields.visualStyle")}
              </label>
              <select
                id="loc-style"
                value={values.identity.visualStyle}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    identity: { ...v.identity, visualStyle: e.target.value },
                  }))
                }
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {locationStyles.map((id) => (
                  <option key={id} value={id}>
                    {t(`studio.locationIdentity.presets.style.${id}` as never)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="loc-arch" className="text-sm font-semibold text-zinc-900">
                {t("studio.locationIdentity.fields.architecture")}
              </label>
              <select
                id="loc-arch"
                value={values.identity.architecture}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    identity: { ...v.identity, architecture: e.target.value },
                  }))
                }
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {LOCATION_IDENTITY_ARCHITECTURE.map((id) => (
                  <option key={id} value={id}>
                    {t(`studio.locationIdentity.presets.architecture.${id}` as never)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="loc-mood" className="text-sm font-semibold text-zinc-900">
                {t("studio.locationIdentity.fields.mood")}
              </label>
              <select
                id="loc-mood"
                value={values.identity.mood}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    identity: { ...v.identity, mood: e.target.value },
                  }))
                }
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {LOCATION_IDENTITY_MOODS.map((id) => (
                  <option key={id} value={id}>
                    {t(`studio.locationIdentity.presets.mood.${id}` as never)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="loc-lighting" className="text-sm font-semibold text-zinc-900">
                {t("studio.locationIdentity.fields.lighting")}
              </label>
              <select
                id="loc-lighting"
                value={values.identity.lighting}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    identity: { ...v.identity, lighting: e.target.value },
                  }))
                }
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {LOCATION_IDENTITY_LIGHTING.map((id) => (
                  <option key={id} value={id}>
                    {t(`studio.locationIdentity.presets.lighting.${id}` as never)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="loc-color" className="text-sm font-semibold text-zinc-900">
                {t("studio.locationIdentity.fields.colorTheme")}
              </label>
              <select
                id="loc-color"
                value={values.identity.colorTheme}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    identity: { ...v.identity, colorTheme: e.target.value },
                  }))
                }
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {LOCATION_IDENTITY_COLOR_THEMES.map((id) => (
                  <option key={id} value={id}>
                    {t(`studio.locationIdentity.presets.color.${id}` as never)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="loc-desc" className="text-sm font-semibold text-zinc-900">
                {t("studio.locations.field.description")}
              </label>
              <textarea
                id="loc-desc"
                rows={4}
                value={values.description}
                onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="loc-forbidden" className="text-sm font-semibold text-zinc-900">
                {t("studio.locationIdentity.fields.forbiddenElements")}
              </label>
              <textarea
                id="loc-forbidden"
                rows={2}
                value={values.identity.forbiddenElements}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    identity: { ...v.identity, forbiddenElements: e.target.value },
                  }))
                }
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="loc-usage" className="text-sm font-semibold text-zinc-900">
                {t("studio.locationIdentity.fields.usageContext")}
              </label>
              <textarea
                id="loc-usage"
                rows={2}
                value={values.identity.usageContext}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    identity: { ...v.identity, usageContext: e.target.value },
                  }))
                }
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="loc-world" className="text-sm font-semibold text-zinc-900">
                {t("studio.assetReadiness.domain.world")}
              </label>
              <select
                id="loc-world"
                value={values.identity.worldProfileId ?? ""}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    identity: {
                      ...v.identity,
                      worldProfileId: e.target.value || null,
                    },
                  }))
                }
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {worlds.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </AppCard>
        </>
      : null}

      {error ?
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      : null}

      {(createEntryPath !== null || mode === "edit") && (
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving || uploading}
            className="rounded-full bg-[#006D52] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? t("button.loading") : submitLabel}
          </button>
          <Link
            href={backHref}
            className="inline-flex items-center rounded-full border border-zinc-200 px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            {t("studio.locations.cancel")}
          </Link>
        </div>
      )}
    </form>
  );
}
