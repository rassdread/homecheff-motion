"use client";

import Link from "next/link";
import { useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { StudioContinuityStrengthSelect } from "@/components/studio/studio-continuity-strength-select";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioContinuityStrength } from "@/lib/studio-continuity-strength";
import type { StudioWorldProfileDetail } from "@/types/studio-api";

export type StudioWorldProfileFormValues = {
  name: string;
  description: string;
  visualStyle: string;
  tone: string;
  continuityRules: string;
  continuityStrength: StudioContinuityStrength;
};

type StudioWorldProfileFormProps = {
  initial?: StudioWorldProfileDetail;
  submitLabel: string;
  backHref: string;
  onSubmit: (values: StudioWorldProfileFormValues) => Promise<void>;
};

function emptyValues(): StudioWorldProfileFormValues {
  return {
    name: "",
    description: "",
    visualStyle: "",
    tone: "",
    continuityRules: "",
    continuityStrength: "strong",
  };
}

function fromDetail(w: StudioWorldProfileDetail): StudioWorldProfileFormValues {
  return {
    name: w.name,
    description: w.description,
    visualStyle: w.visualStyle,
    tone: w.tone,
    continuityRules: w.continuityRules,
    continuityStrength: w.continuityStrength,
  };
}

export function StudioWorldProfileForm({
  initial,
  submitLabel,
  backHref,
  onSubmit,
}: StudioWorldProfileFormProps) {
  const t = useActiveTranslator();
  const [values, setValues] = useState(initial ? fromDetail(initial) : emptyValues());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("studio.worlds.error.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mt-8">
      <AppCard className="space-y-4 bg-white p-6">
        <label className="block text-sm">
          <span className="font-medium text-zinc-700">{t("studio.worlds.field.name")}</span>
          <input
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-zinc-700">{t("studio.worlds.field.description")}</span>
          <textarea
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            rows={3}
            value={values.description}
            onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-zinc-700">{t("studio.worlds.field.visualStyle")}</span>
          <textarea
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            rows={3}
            value={values.visualStyle}
            onChange={(e) => setValues((v) => ({ ...v, visualStyle: e.target.value }))}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-zinc-700">{t("studio.worlds.field.tone")}</span>
          <textarea
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            rows={3}
            value={values.tone}
            onChange={(e) => setValues((v) => ({ ...v, tone: e.target.value }))}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-zinc-700">{t("studio.worlds.field.continuityRules")}</span>
          <textarea
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            rows={3}
            value={values.continuityRules}
            onChange={(e) => setValues((v) => ({ ...v, continuityRules: e.target.value }))}
          />
        </label>
        <StudioContinuityStrengthSelect
          label={t("studio.memory.continuityStrengthLabel")}
          value={values.continuityStrength}
          onChange={(continuityStrength) => setValues((v) => ({ ...v, continuityStrength }))}
        />
      </AppCard>
      {error ? (
        <p className="mt-4 text-sm text-red-700">{error}</p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-[#006D52] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? t("button.loading") : submitLabel}
        </button>
        <Link href={backHref} className="rounded-full border border-zinc-200 px-5 py-2.5 text-sm">
          {t("studio.worlds.cancel")}
        </Link>
      </div>
    </form>
  );
}
