"use client";

import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { AppCard } from "@/components/ui/app-card";
import { StudioCharacterPrefillReviewCard } from "@/components/studio/studio-character-prefill-review-card";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import {
  getClientImagePreprocessOptionsForRole,
  preprocessImageFile,
} from "@/lib/image-preprocess";
import { postWizardImageUpload, ImageUploadError } from "@/lib/instant-image-upload-client";
import type { CharacterIdentityImagePrefillApiResponse } from "@/lib/studio-character-identity-image-prefill-client";
import {
  analyzeCharacterReferenceImagesApi,
  IMAGE_PREFILL_ROLE_OPTIONS,
  MAX_IMAGE_PREFILL_SLOTS,
  type ImagePrefillSlot,
} from "@/lib/studio-character-identity-image-prefill-client";
import type { CharacterIdentityPrefillResult } from "@/types/studio-character-identity-prefill";
import type { CharacterReferenceImageRole } from "@/types/studio-character-identity-image-prefill";

type Props = {
  userRole: string;
  locale: "en" | "nl";
  slots: ImagePrefillSlot[];
  onSlotsChange: Dispatch<SetStateAction<ImagePrefillSlot[]>>;
  userDescription: string;
  onUserDescriptionChange: (value: string) => void;
  intendedUsage: string;
  onIntendedUsageChange: (value: string) => void;
  analysisResult: CharacterIdentityPrefillResult | null;
  onAnalysisResult: (result: CharacterIdentityPrefillResult | null) => void;
  onPrimaryImageReady: (url: string, storageKey: string) => void;
  onApplyProposal: (prefill: CharacterIdentityPrefillResult["prefill"], voiceHint: string) => void;
  proposalApplied: boolean;
  onAdjustFocus?: () => void;
};

function roleLabelKey(role: CharacterReferenceImageRole): TranslationKey {
  return `studio.characters.imagePrefill.role.${role}` as TranslationKey;
}

export function StudioCharacterImagePrefillPanel({
  userRole,
  locale,
  slots,
  onSlotsChange,
  userDescription,
  onUserDescriptionChange,
  intendedUsage,
  onIntendedUsageChange,
  analysisResult,
  onAnalysisResult,
  onPrimaryImageReady,
  onApplyProposal,
  proposalApplied,
  onAdjustFocus,
}: Props) {
  const t = useActiveTranslator();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingRole, setPendingRole] = useState<CharacterReferenceImageRole>("primary");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const uploadSlot = useCallback(
    async (file: File, role: CharacterReferenceImageRole) => {
      setError("");
      const slotId = crypto.randomUUID();
      onSlotsChange((prev) => [
        ...prev,
        { id: slotId, role, previewUrl: "", storageKey: "", uploading: true },
      ]);

      try {
        const opts = getClientImagePreprocessOptionsForRole(userRole);
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

        const nextSlot: ImagePrefillSlot = {
          id: slotId,
          role,
          previewUrl: uploaded.workingImageUrl,
          storageKey: uploaded.workingStorageKey,
        };

        onSlotsChange((prev) =>
          prev
            .filter((s) => s.id !== slotId)
            .concat(nextSlot)
            .slice(0, MAX_IMAGE_PREFILL_SLOTS)
        );

        if (role === "primary") {
          onPrimaryImageReady(uploaded.workingImageUrl, uploaded.workingStorageKey);
        }
        onAnalysisResult(null);
      } catch (e) {
        onSlotsChange((prev) => prev.filter((s) => s.id !== slotId));
        const message =
          e instanceof ImageUploadError
            ? e.message
            : e instanceof Error
              ? e.message
              : t("studio.characters.uploadFailed");
        setError(message);
      }
    },
    [onAnalysisResult, onPrimaryImageReady, onSlotsChange, t, userRole]
  );

  const handleFilePick = (file: File | null) => {
    if (!file || slots.length >= MAX_IMAGE_PREFILL_SLOTS) {
      return;
    }
    void uploadSlot(file, pendingRole);
  };

  const removeSlot = (id: string) => {
    onSlotsChange(slots.filter((s) => s.id !== id));
    onAnalysisResult(null);
  };

  const runAnalysis = async () => {
    const ready = slots.filter((s) => s.previewUrl && !s.uploading);
    if (ready.length === 0) {
      setError(t("studio.characters.imagePrefill.error.noImages"));
      return;
    }
    setAnalyzing(true);
    setError("");
    onAnalysisResult(null);
    try {
      const res = await analyzeCharacterReferenceImagesApi({
        imageUrls: ready.map((s) => s.previewUrl),
        imageRoles: ready.map((s) => s.role),
        userDescription,
        intendedUsage,
        locale,
      });
      if (!res.ok) {
        const errBody = res.data as { error?: string };
        setError(errBody.error ?? t("studio.characters.imagePrefill.error.analysisFailed"));
        return;
      }
      onAnalysisResult(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("studio.characters.imagePrefill.error.analysisFailed"));
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <AppCard className="space-y-4 bg-white p-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">
          {t("studio.characters.imagePrefill.title")}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.characters.imagePrefill.lead")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-zinc-800">
            {t("studio.characters.imagePrefill.descriptionLabel")}
          </span>
          <textarea
            value={userDescription}
            onChange={(e) => onUserDescriptionChange(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder={t("studio.characters.imagePrefill.descriptionPlaceholder")}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-zinc-800">
            {t("studio.characters.imagePrefill.usageLabel")}
          </span>
          <textarea
            value={intendedUsage}
            onChange={(e) => onIntendedUsageChange(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder={t("studio.characters.imagePrefill.usagePlaceholder")}
          />
        </label>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium text-zinc-700">
            {t("studio.characters.imagePrefill.nextUploadRole")}
            <select
              value={pendingRole}
              onChange={(e) => setPendingRole(e.target.value as CharacterReferenceImageRole)}
              className="ml-2 rounded border border-zinc-200 px-2 py-1 text-xs"
            >
              {IMAGE_PREFILL_ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {t(roleLabelKey(role))}
                </option>
              ))}
            </select>
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              handleFilePick(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={slots.length >= MAX_IMAGE_PREFILL_SLOTS || slots.some((s) => s.uploading)}
            onClick={() => fileRef.current?.click()}
            className="rounded-full border border-[#0067B1]/40 px-4 py-2 text-sm font-semibold text-[#0067B1] hover:bg-[#0067B1]/5 disabled:opacity-50"
          >
            {t("studio.characters.imagePrefill.addImage")}
          </button>
          <span className="text-xs text-zinc-500">
            {t("studio.characters.imagePrefill.imageCount", {
              count: String(slots.filter((s) => s.previewUrl).length),
              max: String(MAX_IMAGE_PREFILL_SLOTS),
            })}
          </span>
        </div>

        {slots.length > 0 ?
          <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {slots.map((slot) => (
              <div
                key={slot.id}
                className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50"
              >
                <div className="aspect-square">
                  {slot.previewUrl ?
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={slot.previewUrl} alt="" className="h-full w-full object-cover" />
                  : <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                      {t("button.loading")}
                    </div>
                  }
                </div>
                <div className="border-t border-zinc-100 px-2 py-1.5">
                  <p className="text-[10px] font-semibold text-zinc-700">{t(roleLabelKey(slot.role))}</p>
                  <button
                    type="button"
                    onClick={() => removeSlot(slot.id)}
                    className="mt-0.5 text-[10px] font-semibold text-red-600 hover:underline"
                  >
                    {t("studio.characters.imagePrefill.removeImage")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        : null}
      </div>

      <button
        type="button"
        disabled={analyzing || slots.filter((s) => s.previewUrl).length === 0}
        onClick={() => void runAnalysis()}
        className="rounded-full bg-[#0067B1] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {analyzing ? t("studio.characters.imagePrefill.analyzing") : t("studio.characters.imagePrefill.analyze")}
      </button>

      {analysisResult ?
        <StudioCharacterPrefillReviewCard
          result={analysisResult}
          proposalApplied={proposalApplied}
          onApplyProposal={() =>
            onApplyProposal(analysisResult.prefill, analysisResult.voiceDirectionHint)
          }
          onAdjust={() => onAdjustFocus?.()}
        />
      : null}

      {error ?
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      : null}
    </AppCard>
  );
}
