"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SpaceGallery } from "@/components/examples/space-gallery";
import { useActiveTranslator } from "@/i18n/client";
import { studioShowcaseItemToExample } from "@/lib/showcase-item-mapper";
import { SHOWCASE_ADMIN_SECTIONS } from "@/lib/showcase-page-keys";
import type {
  ShowcaseMediaType,
  ShowcasePageKey,
  StudioShowcaseItemInput,
  StudioShowcaseItemRecord,
} from "@/types/studio-showcase-item";

type FormState = {
  title: string;
  subtitle: string;
  description: string;
  mediaType: ShowcaseMediaType;
  mediaUrl: string;
  thumbnailUrl: string;
  posterUrl: string;
  pageKey: ShowcasePageKey;
  serviceKey: string;
  category: string;
  assistantPrompt: string;
  ctaLabel: string;
  ctaHref: string;
  sortOrder: number;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  locale: string;
};

const EMPTY_FORM = (pageKey: ShowcasePageKey): FormState => ({
  title: "",
  subtitle: "",
  description: "",
  mediaType: "image",
  mediaUrl: "",
  thumbnailUrl: "",
  posterUrl: "",
  pageKey,
  serviceKey: "",
  category: "",
  assistantPrompt: "",
  ctaLabel: "",
  ctaHref: "",
  sortOrder: 0,
  isActive: true,
  startsAt: "",
  endsAt: "",
  locale: "",
});

function recordToForm(item: StudioShowcaseItemRecord): FormState {
  return {
    title: item.title,
    subtitle: item.subtitle ?? "",
    description: item.description,
    mediaType: item.mediaType,
    mediaUrl: item.mediaUrl,
    thumbnailUrl: item.thumbnailUrl ?? "",
    posterUrl: item.posterUrl ?? "",
    pageKey: item.pageKey,
    serviceKey: item.serviceKey ?? "",
    category: item.category ?? "",
    assistantPrompt: item.assistantPrompt ?? "",
    ctaLabel: item.ctaLabel ?? "",
    ctaHref: item.ctaHref ?? "",
    sortOrder: item.sortOrder,
    isActive: item.isActive,
    startsAt: item.startsAt ? item.startsAt.slice(0, 16) : "",
    endsAt: item.endsAt ? item.endsAt.slice(0, 16) : "",
    locale: item.locale ?? "",
  };
}

function formToInput(form: FormState): StudioShowcaseItemInput {
  return {
    title: form.title,
    subtitle: form.subtitle || null,
    description: form.description,
    mediaType: form.mediaType,
    mediaUrl: form.mediaUrl,
    thumbnailUrl: form.thumbnailUrl || null,
    posterUrl: form.posterUrl || null,
    pageKey: form.pageKey,
    serviceKey: (form.serviceKey || null) as StudioShowcaseItemInput["serviceKey"],
    category: form.category || null,
    assistantPrompt: form.assistantPrompt || null,
    ctaLabel: form.ctaLabel || null,
    ctaHref: form.ctaHref || null,
    sortOrder: form.sortOrder,
    isActive: form.isActive,
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    locale: form.locale || null,
  };
}

async function uploadShowcaseFile(
  file: File,
  slot: "media" | "thumbnail" | "poster"
): Promise<string> {
  const body = new FormData();
  body.set("file", file);
  body.set("slot", slot);
  const res = await fetch("/api/admin/showcase-items/upload", {
    method: "POST",
    body,
    credentials: "include",
  });
  const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.error ?? "upload failed");
  }
  return data.url;
}

export function ShowcaseCarouselAdminPanel() {
  const t = useActiveTranslator();
  const [section, setSection] = useState<ShowcasePageKey>("home");
  const [items, setItems] = useState<StudioShowcaseItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => EMPTY_FORM("home"));
  const [saving, setSaving] = useState(false);

  const sectionItems = useMemo(
    () => items.filter((item) => item.pageKey === section).sort((a, b) => a.sortOrder - b.sortOrder),
    [items, section]
  );

  const previewExamples = useMemo(
    () => sectionItems.filter((item) => item.isActive).map(studioShowcaseItemToExample),
    [sectionItems]
  );

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/showcase-items", { credentials: "include" });
      const data = (await res.json()) as { ok?: boolean; items?: StudioShowcaseItemRecord[] };
      if (!res.ok) {
        throw new Error("load failed");
      }
      setItems(data.items ?? []);
    } catch {
      setError(t("admin.showcase.errors.loadFailed" as never));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await fetch("/api/admin/showcase-items", { credentials: "include" });
          const data = (await res.json()) as { ok?: boolean; items?: StudioShowcaseItemRecord[] };
          if (!res.ok) {
            throw new Error("load failed");
          }
          if (!cancelled) {
            setItems(data.items ?? []);
          }
        } catch {
          if (!cancelled) {
            setError(t("admin.showcase.errors.loadFailed" as never));
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const resetForm = useCallback(
    (pageKey: ShowcasePageKey) => {
      setEditingId(null);
      setForm(EMPTY_FORM(pageKey));
    },
    []
  );

  const startEdit = useCallback((item: StudioShowcaseItemRecord) => {
    setEditingId(item.id);
    setForm(recordToForm(item));
  }, []);

  const saveItem = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = formToInput(form);
      const res =
        editingId ?
          await fetch(`/api/admin/showcase-items/${editingId}`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/showcase-items", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "save failed");
      }
      await loadItems();
      resetForm(section);
    } catch (err) {
      const key = err instanceof Error ? err.message : "admin.showcase.errors.saveFailed";
      setError(t(key as never));
    } finally {
      setSaving(false);
    }
  }, [editingId, form, loadItems, resetForm, section, t]);

  const deleteItem = useCallback(
    async (id: string) => {
      if (!window.confirm(t("admin.showcase.confirmDelete" as never))) {
        return;
      }
      await fetch(`/api/admin/showcase-items/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      await loadItems();
      if (editingId === id) {
        resetForm(section);
      }
    },
    [editingId, loadItems, resetForm, section, t]
  );

  const toggleActive = useCallback(
    async (item: StudioShowcaseItemRecord) => {
      await fetch(`/api/admin/showcase-items/${item.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      await loadItems();
    },
    [loadItems]
  );

  const moveItem = useCallback(
    async (id: string, direction: "up" | "down") => {
      const ordered = [...sectionItems];
      const index = ordered.findIndex((row) => row.id === id);
      if (index < 0) return;
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= ordered.length) return;
      const tmp = ordered[index]!;
      ordered[index] = ordered[swapIndex]!;
      ordered[swapIndex] = tmp;
      await fetch(`/api/admin/showcase-items/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reorderIds: ordered.map((row) => row.id),
          reorderPageKey: section,
        }),
      });
      await loadItems();
    },
    [loadItems, section, sectionItems]
  );

  const handleUpload = useCallback(
    async (slot: "media" | "thumbnail" | "poster", file: File) => {
      setError(null);
      try {
        const url = await uploadShowcaseFile(file, slot);
        if (slot === "media") {
          const isVideo = file.type.startsWith("video/");
          setForm((prev) => ({
            ...prev,
            mediaUrl: url,
            mediaType: isVideo ? "video" : "image",
          }));
        } else if (slot === "thumbnail") {
          setForm((prev) => ({ ...prev, thumbnailUrl: url }));
        } else {
          setForm((prev) => ({ ...prev, posterUrl: url }));
        }
      } catch (err) {
        const key = err instanceof Error ? err.message : "admin.showcase.errors.uploadFailed";
        setError(t(key as never));
      }
    },
    [t]
  );

  const inputClass =
    "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900";

  return (
    <div className="space-y-8" data-testid="showcase-carousel-admin">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{t("admin.showcase.title" as never)}</h1>
        <p className="mt-2 text-sm text-zinc-600">{t("admin.showcase.intro" as never)}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SHOWCASE_ADMIN_SECTIONS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setSection(key);
              resetForm(key);
            }}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              section === key ? "bg-[#006D52] text-white" : "bg-zinc-100 text-zinc-800"
            }`}
          >
            {t(`admin.showcase.sections.${key}` as never)}
          </button>
        ))}
      </div>

      {error ?
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            {editingId ?
              t("admin.showcase.editItem" as never)
            : t("admin.showcase.addItem" as never)}
          </h2>

          <label className="block text-sm font-medium text-zinc-700">
            {t("admin.showcase.fields.title" as never)}
            <input
              className={inputClass}
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            {t("admin.showcase.fields.subtitle" as never)}
            <input
              className={inputClass}
              value={form.subtitle}
              onChange={(e) => setForm((prev) => ({ ...prev, subtitle: e.target.value }))}
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            {t("admin.showcase.fields.description" as never)}
            <textarea
              className={inputClass}
              rows={3}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-zinc-700">
              {t("admin.showcase.fields.mediaType" as never)}
              <select
                className={inputClass}
                value={form.mediaType}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    mediaType: e.target.value as ShowcaseMediaType,
                  }))
                }
              >
                <option value="image">{t("admin.showcase.mediaType.image" as never)}</option>
                <option value="video">{t("admin.showcase.mediaType.video" as never)}</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              {t("admin.showcase.fields.pageKey" as never)}
              <select
                className={inputClass}
                value={form.pageKey}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    pageKey: e.target.value as ShowcasePageKey,
                  }))
                }
              >
                {SHOWCASE_ADMIN_SECTIONS.map((key) => (
                  <option key={key} value={key}>
                    {t(`admin.showcase.sections.${key}` as never)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {(["media", "thumbnail", "poster"] as const).map((slot) => (
            <div key={slot} className="rounded-lg border border-zinc-200 p-3">
              <p className="text-sm font-medium text-zinc-700">
                {t(`admin.showcase.upload.${slot}` as never)}
              </p>
              <input
                type="file"
                accept={
                  slot === "media" ?
                    "image/jpeg,image/png,image/webp,video/mp4,video/webm"
                  : "image/jpeg,image/png,image/webp"
                }
                className="mt-2 text-sm"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void handleUpload(slot, file);
                  }
                }}
              />
              {slot === "media" && form.mediaUrl ?
                <p className="mt-1 truncate text-xs text-zinc-500">{form.mediaUrl}</p>
              : null}
              {slot === "thumbnail" && form.thumbnailUrl ?
                <p className="mt-1 truncate text-xs text-zinc-500">{form.thumbnailUrl}</p>
              : null}
              {slot === "poster" && form.posterUrl ?
                <p className="mt-1 truncate text-xs text-zinc-500">{form.posterUrl}</p>
              : null}
            </div>
          ))}

          <label className="block text-sm font-medium text-zinc-700">
            {t("admin.showcase.fields.ctaLabel" as never)}
            <input
              className={inputClass}
              value={form.ctaLabel}
              onChange={(e) => setForm((prev) => ({ ...prev, ctaLabel: e.target.value }))}
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            {t("admin.showcase.fields.ctaHref" as never)}
            <input
              className={inputClass}
              value={form.ctaHref}
              onChange={(e) => setForm((prev) => ({ ...prev, ctaHref: e.target.value }))}
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            {t("admin.showcase.fields.assistantPrompt" as never)}
            <textarea
              className={inputClass}
              rows={2}
              value={form.assistantPrompt}
              onChange={(e) => setForm((prev) => ({ ...prev, assistantPrompt: e.target.value }))}
            />
          </label>

          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            />
            {t("admin.showcase.fields.isActive" as never)}
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveItem()}
              className="rounded-lg bg-[#006D52] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ?
                t("admin.showcase.saving" as never)
              : t("admin.showcase.save" as never)}
            </button>
            {editingId ?
              <button
                type="button"
                onClick={() => resetForm(section)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700"
              >
                {t("admin.showcase.cancel" as never)}
              </button>
            : null}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900">
            {t("admin.showcase.itemList" as never)}
          </h2>
          {loading ?
            <p className="text-sm text-zinc-500">{t("admin.showcase.loading" as never)}</p>
          : sectionItems.length === 0 ?
            <p className="text-sm text-zinc-500">{t("admin.showcase.empty" as never)}</p>
          : sectionItems.map((item, index) => (
              <div
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-zinc-200 bg-white p-3"
                data-testid={`showcase-admin-item-${item.id}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-zinc-900">{item.title}</p>
                  <p className="text-xs text-zinc-500">
                    {item.mediaType} · {item.isActive ?
                      t("admin.showcase.status.active" as never)
                    : t("admin.showcase.status.inactive" as never)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => void moveItem(item.id, "up")}
                    className="rounded border px-2 py-1 text-xs"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === sectionItems.length - 1}
                    onClick={() => void moveItem(item.id, "down")}
                    className="rounded border px-2 py-1 text-xs"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="rounded border px-2 py-1 text-xs"
                  >
                    {t("admin.showcase.edit" as never)}
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleActive(item)}
                    className="rounded border px-2 py-1 text-xs"
                  >
                    {item.isActive ?
                      t("admin.showcase.deactivate" as never)
                    : t("admin.showcase.activate" as never)}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteItem(item.id)}
                    className="rounded border border-red-200 px-2 py-1 text-xs text-red-700"
                  >
                    {t("admin.showcase.delete" as never)}
                  </button>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {previewExamples.length > 0 ?
        <div className="rounded-xl border border-zinc-800 bg-[#041428] p-6">
          <h2 className="text-lg font-semibold text-white">{t("admin.showcase.preview" as never)}</h2>
          <SpaceGallery examples={previewExamples} />
        </div>
      : null}
    </div>
  );
}
