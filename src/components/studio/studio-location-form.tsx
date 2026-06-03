"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { AppCard } from "@/components/ui/app-card";
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
import { StudioLocationCategoryBadge } from "@/components/studio/studio-location-category-badge";
import type { StudioLocationDetail } from "@/types/studio-api";

export type StudioLocationFormValues = {
  name: string;
  category: StudioLocationCategory;
  description: string;
  referenceImageUrl: string;
  referenceStorageKey: string;
};

type StudioLocationFormProps = {
  mode: "create" | "edit";
  initial?: StudioLocationDetail;
  submitLabel: string;
  onSubmit: (values: StudioLocationFormValues) => Promise<void>;
  backHref: string;
};

function emptyValues(): StudioLocationFormValues {
  return {
    name: "",
    category: "garden",
    description: "",
    referenceImageUrl: "",
    referenceStorageKey: "",
  };
}

function fromDetail(d: StudioLocationDetail): StudioLocationFormValues {
  return {
    name: d.name,
    category: d.category,
    description: d.description,
    referenceImageUrl: d.referenceImageUrl,
    referenceStorageKey: d.referenceStorageKey,
  };
}

export function StudioLocationForm({
  mode,
  initial,
  submitLabel,
  onSubmit,
  backHref,
}: StudioLocationFormProps) {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<StudioLocationFormValues>(
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
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("studio.locations.error.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <AppCard className="bg-white p-6">
        <label className="block text-sm font-semibold text-zinc-900">
          {t("studio.locations.field.referenceImage")}
        </label>
        <p className="mt-1 text-xs text-zinc-500">{t("studio.locations.field.referenceImageHint")}</p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative aspect-square w-full max-w-[200px] overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                {t("studio.locations.noPreview")}
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
              {uploading ? t("button.loading") : t("studio.locations.uploadImage")}
            </button>
            {mode === "edit" ? (
              <p className="mt-2 text-xs text-zinc-500">{t("studio.locations.replaceImageHint")}</p>
            ) : null}
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
          {t("studio.locations.cancel")}
        </Link>
      </div>
    </form>
  );
}
