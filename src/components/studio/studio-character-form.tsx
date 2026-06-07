"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { StudioCharacterIdentityBuilder } from "@/components/studio/studio-character-identity-builder";
import {
  StudioCharacterVoiceProfilePanel,
  characterVoiceStateFromDetail,
  type CharacterVoiceFormState,
} from "@/components/studio/studio-character-voice-profile-panel";
import { VoiceLibraryProvider } from "@/components/studio/studio-voice-library-provider";
import { UserVoiceLibraryProvider } from "@/components/studio/studio-user-voice-library-provider";
import { StudioCharacterMouthAnimationPanel } from "@/components/studio/studio-character-mouth-animation-panel";
import {
  StudioCharacterPerformanceProfilePanel,
  characterPerformanceStateFromDetail,
  type CharacterPerformanceFormState,
} from "@/components/studio/studio-character-performance-profile-panel";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  characterIdentityFormFromCharacter,
  characterIdentityFormToPatch,
  characterListItemPreviewFromIdentityForm,
  emptyCharacterIdentityForm,
  type CharacterIdentityFormValues,
  type CharacterVoiceIdentityStatus,
} from "@/lib/studio-character-identity-fields";
import { buildCharacterIdentitySuggestionFromPrefill } from "@/lib/studio-character-identity-suggestion";
import {
  getClientImagePreprocessOptionsForRole,
  preprocessImageFile,
} from "@/lib/image-preprocess";
import { postWizardImageUpload, ImageUploadError } from "@/lib/instant-image-upload-client";
import { identityCompleteness, toIdentitySpec } from "@/lib/studio-identity-spec-engine";
import { fetchStudioWorlds } from "@/lib/studio-worlds-client";
import type {
  StudioCharacterCreateInput,
  StudioCharacterUpdateInput,
} from "@/lib/studio-character-validation";
import type { IdentityBuilderPrefill } from "@/types/studio-asset-decision";
import type { StudioCharacterDetail } from "@/types/studio-api";
import type { StudioWorldProfileListItem } from "@/types/studio-api";

export type StudioCharacterFormValues = {
  identity: CharacterIdentityFormValues;
  referenceImageUrl: string;
  referenceStorageKey: string;
  voice: CharacterVoiceFormState;
  performance: CharacterPerformanceFormState;
};

type StudioCharacterFormProps = {
  mode: "create" | "edit";
  initial?: StudioCharacterDetail;
  identityPrefill?: IdentityBuilderPrefill | null;
  submitLabel: string;
  onSubmit: (values: StudioCharacterFormValues) => Promise<void>;
  backHref: string;
};

function emptyPerformanceState(): CharacterPerformanceFormState {
  return {
    performanceEnabled: false,
    defaultSmileStrength: 70,
    defaultBlinkRate: "medium",
    defaultHeadMovement: "medium",
    defaultMouthIntensity: "medium",
    idleAnimationStyle: "subtle",
    performanceNotes: "",
    mouthAnimationEnabled: false,
    mouthClosedAssetUrl: "",
    mouthSmallAssetUrl: "",
    mouthMediumAssetUrl: "",
    mouthWideAssetUrl: "",
  };
}

function emptyVoiceState(): CharacterVoiceFormState {
  return {
    voiceEnabled: false,
    voiceProvider: "elevenlabs",
    voiceProfile: "warm_narrator",
    voiceLanguage: "en",
    voiceGender: "",
    voiceDescription: "",
    voiceNotes: "",
    voiceLock: false,
    voiceProfilesByLanguage: {},
  };
}

function emptyValues(): StudioCharacterFormValues {
  return {
    identity: emptyCharacterIdentityForm(),
    referenceImageUrl: "",
    referenceStorageKey: "",
    voice: emptyVoiceState(),
    performance: emptyPerformanceState(),
  };
}

function fromDetail(d: StudioCharacterDetail): StudioCharacterFormValues {
  return {
    identity: characterIdentityFormFromCharacter(d),
    referenceImageUrl: d.referenceImageUrl,
    referenceStorageKey: d.referenceStorageKey,
    voice: characterVoiceStateFromDetail(d),
    performance: characterPerformanceStateFromDetail(d),
  };
}

function voiceStatusFromForm(voice: CharacterVoiceFormState): CharacterVoiceIdentityStatus {
  if (!voice.voiceEnabled || !voice.voiceProfile.trim()) {
    return "none";
  }
  if (voice.voiceLock) {
    return "locked";
  }
  if (voice.voiceProfile.startsWith("clone:")) {
    return "clone";
  }
  return "preset";
}

function voiceAndPerformancePayload(values: StudioCharacterFormValues) {
  return {
    voiceEnabled: values.voice.voiceEnabled,
    voiceProvider: values.voice.voiceProvider,
    voiceProfile: values.voice.voiceProfile,
    voiceLanguage: values.voice.voiceLanguage,
    voiceGender: values.voice.voiceGender,
    voiceDescription: values.voice.voiceDescription,
    voiceNotes: values.voice.voiceNotes,
    voiceLock: values.voice.voiceLock,
    voiceProfilesByLanguage: values.voice.voiceProfilesByLanguage,
    performanceEnabled: values.performance.performanceEnabled,
    defaultSmileStrength: values.performance.defaultSmileStrength,
    defaultBlinkRate: values.performance.defaultBlinkRate,
    defaultHeadMovement: values.performance.defaultHeadMovement,
    defaultMouthIntensity: values.performance.defaultMouthIntensity,
    idleAnimationStyle: values.performance.idleAnimationStyle,
    performanceNotes: values.performance.performanceNotes,
    mouthAnimationEnabled: values.performance.mouthAnimationEnabled,
    mouthClosedAssetUrl: values.performance.mouthClosedAssetUrl,
    mouthSmallAssetUrl: values.performance.mouthSmallAssetUrl,
    mouthMediumAssetUrl: values.performance.mouthMediumAssetUrl,
    mouthWideAssetUrl: values.performance.mouthWideAssetUrl,
  };
}

export function studioCharacterFormToCreatePayload(
  values: StudioCharacterFormValues
): StudioCharacterCreateInput {
  const identityPatch = characterIdentityFormToPatch(values.identity);
  return {
    ...identityPatch,
    name: identityPatch.name ?? values.identity.name.trim(),
    role: identityPatch.role ?? values.identity.role,
    referenceImageUrl: values.referenceImageUrl,
    referenceStorageKey: values.referenceStorageKey,
    ...voiceAndPerformancePayload(values),
  };
}

export function studioCharacterFormToUpdatePayload(
  values: StudioCharacterFormValues,
  previous?: StudioCharacterDetail | null
): StudioCharacterUpdateInput {
  const identityPatch = characterIdentityFormToPatch(values.identity);
  return {
    ...identityPatch,
    ...voiceAndPerformancePayload(values),
    ...(values.referenceImageUrl !== previous?.referenceImageUrl
      ? {
          referenceImageUrl: values.referenceImageUrl,
          referenceStorageKey: values.referenceStorageKey,
        }
      : {}),
  };
}

export function StudioCharacterForm({
  mode,
  initial,
  identityPrefill = null,
  submitLabel,
  onSubmit,
  backHref,
}: StudioCharacterFormProps) {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<StudioCharacterFormValues>(
    initial ? fromDetail(initial) : emptyValues()
  );
  const [worlds, setWorlds] = useState<StudioWorldProfileListItem[]>([]);
  const [previewUrl, setPreviewUrl] = useState(initial?.referenceImageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = session.user?.role === "admin";

  useEffect(() => {
    if (!session.resolved || !session.user) {
      return;
    }
    void fetchStudioWorlds().then((res) => {
      if (res.ok) {
        setWorlds(res.data.worlds);
      }
    });
  }, [session.resolved, session.user]);

  const aiSuggestion = useMemo(
    () => (identityPrefill ? buildCharacterIdentitySuggestionFromPrefill(identityPrefill) : null),
    [identityPrefill]
  );

  const completenessScore = useMemo(() => {
    const preview = characterListItemPreviewFromIdentityForm(values.identity, {
      id: initial?.id ?? "preview",
      ownerId: initial?.ownerId ?? "",
      referenceImageUrl: values.referenceImageUrl,
      slug: initial?.slug ?? "",
    });
    return identityCompleteness(toIdentitySpec(preview));
  }, [values.identity, values.referenceImageUrl, initial]);

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file || !session.user) {
        return;
      }
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
      } catch (e) {
        const message =
          e instanceof ImageUploadError
            ? e.message
            : e instanceof Error
              ? e.message
              : t("studio.characters.uploadFailed");
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
    if (!values.identity.name.trim()) {
      setError(t("studio.characters.error.nameRequired"));
      return;
    }
    if (mode === "create" && (!values.referenceImageUrl || !values.referenceStorageKey)) {
      setError(t("studio.characters.error.imageRequired"));
      return;
    }
    setSaving(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("studio.characters.error.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <AppCard className="bg-white p-6">
        <label className="block text-sm font-semibold text-zinc-900">
          {t("studio.characters.field.referenceImage")}
        </label>
        <p className="mt-1 text-xs text-zinc-500">{t("studio.characters.field.referenceImageHint")}</p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative aspect-square w-full max-w-[200px] overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
            {previewUrl ?
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="" className="h-full w-full object-cover" />
            : <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                {t("studio.characters.noPreview")}
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
              {uploading ? t("button.loading") : t("studio.characters.uploadImage")}
            </button>
            {mode === "edit" ?
              <p className="mt-2 text-xs text-zinc-500">{t("studio.characters.replaceImageHint")}</p>
            : null}
          </div>
        </div>
      </AppCard>

      <AppCard className="bg-white p-6">
        <StudioCharacterIdentityBuilder
          mode={mode}
          form={values.identity}
          onFormChange={(identity) => setValues((v) => ({ ...v, identity }))}
          worlds={worlds}
          canModify
          isAdmin={isAdmin}
          completenessScore={completenessScore}
          aiSuggestion={aiSuggestion}
          voiceStatus={voiceStatusFromForm(values.voice)}
          voiceSection={
            <VoiceLibraryProvider>
              <UserVoiceLibraryProvider>
                <StudioCharacterVoiceProfilePanel
                  characterId={initial?.id ?? null}
                  characterName={values.identity.name || t("studio.characters.createTitle")}
                  value={values.voice}
                  onChange={(voice) => setValues((v) => ({ ...v, voice }))}
                  canModify
                />
              </UserVoiceLibraryProvider>
            </VoiceLibraryProvider>
          }
        />
      </AppCard>

      <section className="mt-8 rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
        <h2 className="text-sm font-semibold text-amber-950">
          {t("studio.characterPerformance.title")}
        </h2>
        <p className="mt-1 text-xs text-amber-800">{t("studio.characterPerformance.hint")}</p>
        <div className="mt-3">
          <StudioCharacterPerformanceProfilePanel
            value={values.performance}
            onChange={(performance) => setValues((v) => ({ ...v, performance }))}
          />
        </div>
        <div className="mt-6 border-t border-amber-100 pt-4">
          <h3 className="text-sm font-semibold text-amber-950">
            {t("studio.mouthAnimation.title")}
          </h3>
          <div className="mt-3">
            <StudioCharacterMouthAnimationPanel
              characterName={values.identity.name || t("studio.characters.createTitle")}
              value={values.performance}
              onChange={(performance) => setValues((v) => ({ ...v, performance }))}
            />
          </div>
        </div>
      </section>

      {error ?
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      : null}

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
          {t("studio.characters.cancel")}
        </Link>
      </div>
    </form>
  );
}
