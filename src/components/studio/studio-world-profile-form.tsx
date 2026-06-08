"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { StudioAssetCreateEntryChoice } from "@/components/studio/studio-asset-create-entry-choice";
import { StudioAssetPromptPrefillStep } from "@/components/studio/studio-asset-prompt-prefill-step";
import { StudioAssetSummaryReadinessPanel } from "@/components/studio/studio-asset-summary-readiness-panel";
import { StudioContinuityStrengthSelect } from "@/components/studio/studio-continuity-strength-select";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioContinuityStrength } from "@/lib/studio-continuity-strength";
import {
  mergeWorldIdentityForm,
  worldIdentityFormFromWorld,
  worldIdentityFormToPatch,
  type WorldIdentityFormValues,
} from "@/lib/studio-world-identity-fields";
import {
  WORLD_IDENTITY_COLOR_THEMES,
  WORLD_IDENTITY_LIGHTING,
  WORLD_IDENTITY_MOODS,
  WORLD_IDENTITY_VISUAL_STYLES,
  listVisibleWorldTypes,
} from "@/lib/studio-world-identity-presets";
import { buildWorldReadinessView } from "@/lib/studio-world-readiness";
import {
  worldFormValuesFromWizardDraft,
  type AssetWizardDraft,
} from "@/lib/studio-asset-wizard-draft";
import type { AssetCreateEntryPath, AssetPromptPrefillProposal } from "@/types/studio-asset-creation";
import type { StudioWorldProfileDetail } from "@/types/studio-api";

export type StudioWorldProfileFormValues = {
  continuityStrength: StudioContinuityStrength;
  identity: WorldIdentityFormValues;
};

type StudioWorldProfileFormProps = {
  mode?: "create" | "edit";
  initial?: StudioWorldProfileDetail;
  submitLabel: string;
  backHref: string;
  onSubmit: (values: StudioWorldProfileFormValues) => Promise<void>;
  createEntryPath?: AssetCreateEntryPath | null;
  wizardProposal?: AssetPromptPrefillProposal | null;
  proposalApplied?: boolean;
  wizardDraft?: AssetWizardDraft | null;
};

function emptyIdentity(): WorldIdentityFormValues {
  return {
    name: "",
    description: "",
    worldType: "",
    visualStyle: "",
    shapeLanguage: "",
    colorTheme: "",
    colorRules: "",
    lighting: "",
    mood: "",
    environmentFeel: "",
    visualDetails: "",
    musicStyle: "",
    ambience: "",
    audioEnergy: "",
    voiceDirection: "",
    soundFeel: "",
    audioDetails: "",
    cameraStyle: "",
    motionStyle: "",
    pacing: "",
    preferredShots: "",
    forbiddenShotStyles: "",
    renderStrategies: [],
    usageContext: "",
    forbiddenElements: "",
    audioForbiddenElements: "",
    brandRules: "",
  };
}

function fromDetail(w: StudioWorldProfileDetail): StudioWorldProfileFormValues {
  return {
    continuityStrength: w.continuityStrength,
    identity: worldIdentityFormFromWorld(w),
  };
}

export function studioWorldFormToCreatePayload(values: StudioWorldProfileFormValues) {
  const patch = worldIdentityFormToPatch(values.identity);
  return {
    name: patch.name ?? values.identity.name.trim(),
    description: patch.description ?? values.identity.description,
    visualStyle: patch.visualStyle,
    tone: patch.tone,
    continuityRules: patch.continuityRules,
    continuityStrength: values.continuityStrength,
  };
}

export function StudioWorldProfileForm({
  mode = "create",
  initial,
  submitLabel,
  backHref,
  onSubmit,
  createEntryPath: initialEntryPath = null,
  wizardProposal = null,
  proposalApplied = false,
  wizardDraft = null,
}: StudioWorldProfileFormProps) {
  const t = useActiveTranslator();
  const [values, setValues] = useState<StudioWorldProfileFormValues>(() => {
    if (mode === "create" && wizardDraft) {
      return worldFormValuesFromWizardDraft(wizardDraft);
    }
    const base = initial ? fromDetail(initial) : { continuityStrength: "strong" as const, identity: emptyIdentity() };
    if (mode === "create" && wizardProposal && proposalApplied) {
      return {
        ...base,
        identity: mergeWorldIdentityForm(
          base.identity,
          wizardProposal.prefill as Partial<WorldIdentityFormValues>
        ),
      };
    }
    return base;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createEntryPath, setCreateEntryPath] = useState<AssetCreateEntryPath | null>(() =>
    mode === "create" ? initialEntryPath : null
  );

  const worldTypes = listVisibleWorldTypes(true);

  const readiness = useMemo(
    () =>
      buildWorldReadinessView({
        identity: values.identity,
        mode,
      }),
    [values.identity, mode]
  );

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

  const showEntryChoice = mode === "create" && createEntryPath === null;

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
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

      {mode === "create" && createEntryPath === "prompt_only" ?
        <StudioAssetPromptPrefillStep
          kind="world"
          initialProposal={wizardProposal}
          initialApplied={proposalApplied}
          onApply={(proposal) => {
            setValues((v) => ({
              ...v,
              identity: mergeWorldIdentityForm(v.identity, proposal.prefill as Partial<WorldIdentityFormValues>),
            }));
          }}
        />
      : null}

      {createEntryPath !== null || mode === "edit" ?
        <AppCard className="space-y-4 bg-white p-6">
          <div>
            <label className="block text-sm font-semibold text-zinc-900">
              {t("studio.worlds.field.name")}
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={values.identity.name}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  identity: { ...v.identity, name: e.target.value },
                }))
              }
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-900">
              {t("studio.worldIdentity.fields.worldType")}
            </label>
            <select
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={values.identity.worldType}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  identity: { ...v.identity, worldType: e.target.value },
                }))
              }
            >
              <option value="">—</option>
              {worldTypes.map((id) => (
                <option key={id} value={id}>
                  {t(`studio.worldIdentity.presets.type.${id}` as never)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-900">
              {t("studio.worldIdentity.fields.visualStyle")}
            </label>
            <select
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={values.identity.visualStyle}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  identity: { ...v.identity, visualStyle: e.target.value },
                }))
              }
            >
              <option value="">—</option>
              {WORLD_IDENTITY_VISUAL_STYLES.map((id) => (
                <option key={id} value={id}>
                  {t(`studio.worldIdentity.presets.visualStyle.${id}` as never)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-900">
              {t("studio.worldIdentity.fields.mood")}
            </label>
            <select
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={values.identity.mood}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  identity: { ...v.identity, mood: e.target.value },
                }))
              }
            >
              <option value="">—</option>
              {WORLD_IDENTITY_MOODS.map((id) => (
                <option key={id} value={id}>
                  {t(`studio.worldIdentity.presets.mood.${id}` as never)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-900">
              {t("studio.worldIdentity.fields.lighting")}
            </label>
            <select
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={values.identity.lighting}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  identity: { ...v.identity, lighting: e.target.value },
                }))
              }
            >
              <option value="">—</option>
              {WORLD_IDENTITY_LIGHTING.map((id) => (
                <option key={id} value={id}>
                  {t(`studio.worldIdentity.presets.lighting.${id}` as never)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-900">
              {t("studio.worldIdentity.fields.colorTheme")}
            </label>
            <select
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={values.identity.colorTheme}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  identity: { ...v.identity, colorTheme: e.target.value },
                }))
              }
            >
              <option value="">—</option>
              {WORLD_IDENTITY_COLOR_THEMES.map((id) => (
                <option key={id} value={id}>
                  {t(`studio.worldIdentity.presets.color.${id}` as never)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-900">
              {t("studio.worlds.field.description")}
            </label>
            <textarea
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              rows={3}
              value={values.identity.description}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  identity: { ...v.identity, description: e.target.value },
                }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-900">
              {t("studio.worldIdentity.fields.brandRules")}
            </label>
            <textarea
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              rows={2}
              value={values.identity.brandRules}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  identity: { ...v.identity, brandRules: e.target.value },
                }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-900">
              {t("studio.worldIdentity.fields.forbiddenElements")}
            </label>
            <textarea
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              rows={2}
              value={values.identity.forbiddenElements}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  identity: { ...v.identity, forbiddenElements: e.target.value },
                }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-900">
              {t("studio.worldIdentity.fields.usageContext")}
            </label>
            <textarea
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              rows={2}
              value={values.identity.usageContext}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  identity: { ...v.identity, usageContext: e.target.value },
                }))
              }
            />
          </div>
          <StudioContinuityStrengthSelect
            label={t("studio.memory.continuityStrengthLabel")}
            value={values.continuityStrength}
            onChange={(continuityStrength) => setValues((v) => ({ ...v, continuityStrength }))}
          />
        </AppCard>
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
            disabled={saving}
            className="rounded-full bg-[#006D52] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? t("button.loading") : submitLabel}
          </button>
          <Link
            href={backHref}
            className="inline-flex rounded-full border border-zinc-200 px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            {t("studio.worlds.cancel")}
          </Link>
        </div>
      )}
    </form>
  );
}
