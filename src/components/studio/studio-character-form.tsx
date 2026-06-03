"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  STUDIO_CHARACTER_ROLES,
  type StudioCharacterRole,
} from "@/lib/studio-character-roles";
import {
  getClientImagePreprocessOptionsForRole,
  preprocessImageFile,
} from "@/lib/image-preprocess";
import { postWizardImageUpload, ImageUploadError } from "@/lib/instant-image-upload-client";
import { StudioCharacterRoleBadge } from "@/components/studio/studio-character-role-badge";
import type { StudioCharacterDetail } from "@/types/studio-api";

export type StudioCharacterFormValues = {
  name: string;
  role: StudioCharacterRole;
  description: string;
  personality: string;
  referenceImageUrl: string;
  referenceStorageKey: string;
};

type StudioCharacterFormProps = {
  mode: "create" | "edit";
  initial?: StudioCharacterDetail;
  submitLabel: string;
  onSubmit: (values: StudioCharacterFormValues) => Promise<void>;
  backHref: string;
};

function emptyValues(): StudioCharacterFormValues {
  return {
    name: "",
    role: "mascot",
    description: "",
    personality: "",
    referenceImageUrl: "",
    referenceStorageKey: "",
  };
}

function fromDetail(d: StudioCharacterDetail): StudioCharacterFormValues {
  return {
    name: d.name,
    role: d.role,
    description: d.description,
    personality: d.personality,
    referenceImageUrl: d.referenceImageUrl,
    referenceStorageKey: d.referenceStorageKey,
  };
}

export function StudioCharacterForm({
  mode,
  initial,
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
  const [previewUrl, setPreviewUrl] = useState(initial?.referenceImageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
    if (!values.name.trim()) {
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
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                {t("studio.characters.noPreview")}
              </div>
            )}
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
            {mode === "edit" ? (
              <p className="mt-2 text-xs text-zinc-500">{t("studio.characters.replaceImageHint")}</p>
            ) : null}
          </div>
        </div>
      </AppCard>

      <AppCard className="space-y-4 bg-white p-6">
        <div>
          <label htmlFor="char-name" className="text-sm font-semibold text-zinc-900">
            {t("studio.characters.field.name")}
          </label>
          <input
            id="char-name"
            required
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="char-role" className="text-sm font-semibold text-zinc-900">
            {t("studio.characters.field.role")}
          </label>
          <select
            id="char-role"
            value={values.role}
            onChange={(e) =>
              setValues((v) => ({ ...v, role: e.target.value as StudioCharacterRole }))
            }
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          >
            {STUDIO_CHARACTER_ROLES.map((role) => (
              <option key={role} value={role}>
                {t(`studio.characters.role.${role}`)}
              </option>
            ))}
          </select>
          <div className="mt-2">
            <StudioCharacterRoleBadge role={values.role} />
          </div>
        </div>
        <div>
          <label htmlFor="char-desc" className="text-sm font-semibold text-zinc-900">
            {t("studio.characters.field.description")}
          </label>
          <textarea
            id="char-desc"
            rows={3}
            value={values.description}
            onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="char-personality" className="text-sm font-semibold text-zinc-900">
            {t("studio.characters.field.personality")}
          </label>
          <textarea
            id="char-personality"
            rows={3}
            value={values.personality}
            onChange={(e) => setValues((v) => ({ ...v, personality: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
      </AppCard>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

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
