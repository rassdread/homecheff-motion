"use client";

import Link from "next/link";
import { useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioStoryboardDetail } from "@/types/studio-api";

export type StudioStoryboardFormValues = {
  title: string;
  description: string;
};

type StudioStoryboardFormProps = {
  initial?: StudioStoryboardDetail;
  submitLabel: string;
  onSubmit: (values: StudioStoryboardFormValues) => Promise<void>;
  backHref: string;
};

export function StudioStoryboardForm({
  initial,
  submitLabel,
  onSubmit,
  backHref,
}: StudioStoryboardFormProps) {
  const t = useActiveTranslator();
  const [values, setValues] = useState<StudioStoryboardFormValues>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.title.trim()) {
      setError(t("studio.storyboards.error.titleRequired"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("studio.storyboards.error.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppCard className="p-6">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        <div>
          <label className="text-sm font-medium text-zinc-700">
            {t("studio.storyboards.field.title")}
          </label>
          <input
            type="text"
            required
            value={values.title}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-700">
            {t("studio.storyboards.field.storyboardDescription")}
          </label>
          <textarea
            value={values.description}
            onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
            rows={4}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#006D52] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? t("button.loading") : submitLabel}
          </button>
          <Link
            href={backHref}
            className="rounded-full border border-zinc-200 px-5 py-2.5 text-sm font-semibold text-zinc-700"
          >
            {t("studio.storyboards.cancel")}
          </Link>
        </div>
      </form>
    </AppCard>
  );
}
