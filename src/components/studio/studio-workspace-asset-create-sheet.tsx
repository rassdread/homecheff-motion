"use client";

import { useCallback, useRef, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  getClientImagePreprocessOptionsForRole,
  preprocessImageFile,
} from "@/lib/image-preprocess";
import { postWizardImageUpload, ImageUploadError } from "@/lib/instant-image-upload-client";
import { STUDIO_CHARACTER_ROLES } from "@/lib/studio-character-roles";
import { STUDIO_LOCATION_CATEGORIES } from "@/lib/studio-location-categories";
import { STUDIO_PROP_CATEGORIES } from "@/lib/studio-prop-categories";
import { createStudioCharacterApi } from "@/lib/studio-characters-client";
import { createStudioLocationApi } from "@/lib/studio-locations-client";
import { createStudioPropApi } from "@/lib/studio-props-client";
import { createStudioWorldApi } from "@/lib/studio-worlds-client";

export type WorkspaceAssetCreateKind = "character" | "location" | "prop" | "world";

type Props = {
  open: boolean;
  kind: WorkspaceAssetCreateKind;
  worldProfileId?: string | null;
  onClose: () => void;
  onCreated: (kind: WorkspaceAssetCreateKind, id: string) => void;
};

export function StudioWorkspaceAssetCreateSheet({
  open,
  kind,
  worldProfileId,
  onClose,
  onCreated,
}: Props) {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(
    kind === "location" ? "restaurant" : kind === "prop" ? "other" : "mascot"
  );
  const [description, setDescription] = useState("");
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [referenceStorageKey, setReferenceStorageKey] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const needsImage = kind === "character" || kind === "location" || kind === "prop";

  const reset = useCallback(() => {
    setName("");
    setDescription("");
    setReferenceImageUrl("");
    setReferenceStorageKey("");
    setPreviewUrl("");
    setError("");
    setCategory(kind === "location" ? "restaurant" : kind === "prop" ? "other" : "mascot");
  }, [kind]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File | null) => {
    if (!file || !session.user) {
      return;
    }
    setError("");
    setUploading(true);
    try {
      const opts = getClientImagePreprocessOptionsForRole(session.user.role);
      const { optimizedBlob, thumbnailBlob, mimeType } = await preprocessImageFile(file, opts);
      const formData = new FormData();
      formData.set("workingImage", optimizedBlob, "working.jpg");
      formData.set("thumbnailImage", thumbnailBlob, "thumb.jpg");
      formData.set("originalFileName", file.name);
      formData.set("mimeType", mimeType);
      formData.set("sizeBytes", String(file.size));
      formData.set("clientUploadId", crypto.randomUUID());
      const uploaded = await postWizardImageUpload(formData);
      setReferenceImageUrl(uploaded.workingImageUrl);
      setReferenceStorageKey(uploaded.workingStorageKey);
      setPreviewUrl(uploaded.workingImageUrl);
    } catch (e) {
      setError(
        e instanceof ImageUploadError
          ? e.message
          : e instanceof Error
            ? e.message
            : t("studio.workspace.assets.saveFailed")
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError(t("studio.characters.error.nameRequired"));
      return;
    }
    if (needsImage && (!referenceImageUrl || !referenceStorageKey)) {
      setError(t("studio.characters.error.imageRequired"));
      return;
    }
    setSaving(true);
    try {
      if (kind === "character") {
        const res = await createStudioCharacterApi({
          name: name.trim(),
          role: category,
          description: description.trim(),
          personality: "",
          referenceImageUrl,
          referenceStorageKey,
          worldProfileId: worldProfileId ?? null,
        });
        if (!res.ok) {
          throw new Error((res.data as { error?: string }).error ?? t("studio.workspace.assets.saveFailed"));
        }
        onCreated("character", res.data.character.id);
      } else if (kind === "location") {
        const res = await createStudioLocationApi({
          name: name.trim(),
          category,
          description: description.trim(),
          referenceImageUrl,
          referenceStorageKey,
          worldProfileId: worldProfileId ?? null,
        });
        if (!res.ok) {
          throw new Error((res.data as { error?: string }).error ?? t("studio.workspace.assets.saveFailed"));
        }
        onCreated("location", res.data.location.id);
      } else if (kind === "prop") {
        const res = await createStudioPropApi({
          name: name.trim(),
          category,
          description: description.trim(),
          referenceImageUrl,
          referenceStorageKey,
          worldProfileId: worldProfileId ?? null,
        });
        if (!res.ok) {
          throw new Error((res.data as { error?: string }).error ?? t("studio.workspace.assets.saveFailed"));
        }
        onCreated("prop", res.data.prop.id);
      } else {
        const res = await createStudioWorldApi({
          name: name.trim(),
          description: description.trim(),
        });
        if (!res.ok) {
          throw new Error((res.data as { error?: string }).error ?? t("studio.workspace.assets.saveFailed"));
        }
        onCreated("world", res.data.world.id);
      }
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("studio.workspace.assets.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return null;
  }

  const titleKey =
    kind === "character"
      ? "studio.workspace.assets.newCharacter"
      : kind === "location"
        ? "studio.workspace.assets.newLocation"
        : kind === "prop"
          ? "studio.workspace.assets.newProp"
          : "studio.workspace.assets.newWorld";

  return (
    <>
      <button
        type="button"
        aria-label={t("studio.mediaAsset.close")}
        className="fixed inset-0 z-50 bg-black/30"
        onClick={handleClose}
      />
      <aside className="fixed inset-x-0 bottom-0 z-[60] max-h-[90vh] overflow-y-auto rounded-t-2xl border border-zinc-200 bg-white shadow-xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[min(90vh,720px)] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
        <form onSubmit={(e) => void handleSubmit(e)} className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-zinc-900">{t(titleKey as never)}</h2>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
            >
              {t("studio.mediaAsset.close")}
            </button>
          </div>
          <p className="mt-1 text-xs text-zinc-600">{t("studio.workspace.assets.savedToLibraryHint")}</p>

          {needsImage ?
            <div className="mt-4">
              <label className="text-sm font-medium text-zinc-900">
                {t("studio.characters.field.referenceImage")}
              </label>
              <div className="mt-2 flex items-start gap-3">
                <div className="aspect-square h-20 w-20 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                  {previewUrl ?
                    <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                  : null}
                </div>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="rounded-full border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-800"
                >
                  {uploading ? t("common.loading") : t("studio.characters.uploadImage")}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          : null}

          <label className="mt-4 block text-sm font-medium text-zinc-900">
            {t("studio.storyboards.field.title")}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              required
            />
          </label>

          {kind === "character" ?
            <label className="mt-3 block text-sm font-medium text-zinc-900">
              {t("studio.characters.field.role")}
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              >
                {STUDIO_CHARACTER_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {t(`studio.characters.role.${role}` as never)}
                  </option>
                ))}
              </select>
            </label>
          : null}

          {kind === "location" ?
            <label className="mt-3 block text-sm font-medium text-zinc-900">
              {t("studio.locations.field.category")}
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              >
                {STUDIO_LOCATION_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {t(`studio.locations.category.${cat}` as never)}
                  </option>
                ))}
              </select>
            </label>
          : null}

          {kind === "prop" ?
            <label className="mt-3 block text-sm font-medium text-zinc-900">
              {t("studio.props.field.category")}
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              >
                {STUDIO_PROP_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {t(`studio.props.category.${cat}` as never)}
                  </option>
                ))}
              </select>
            </label>
          : null}

          <label className="mt-3 block text-sm font-medium text-zinc-900">
            {t("studio.storyboards.field.storyboardDescription")}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>

          {error ?
            <p className="mt-3 text-sm text-red-700">{error}</p>
          : null}

          <button
            type="submit"
            disabled={saving || uploading}
            className="mt-5 w-full rounded-full bg-[#006D52] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#005a44] disabled:opacity-60"
          >
            {saving ? t("common.loading") : t("studio.workspace.assets.saveAndLink")}
          </button>
        </form>
      </aside>
    </>
  );
}
