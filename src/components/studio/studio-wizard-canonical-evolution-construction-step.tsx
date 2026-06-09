"use client";

import { StudioWizardSourceReferenceBanner } from "@/components/studio/studio-wizard-source-reference-banner";
import { useActiveTranslator } from "@/i18n/client";
import { buildCanonicalEvolutionSummaryPrompt } from "@/lib/studio-asset-character-evolution";
import { seedDynamicAccessoriesFromDraft } from "@/lib/studio-asset-dynamic-accessories";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import type {
  CanonicalEvolutionBuildChoice,
  CanonicalEvolutionBodyConstructionChoice,
  CanonicalEvolutionExpressionsChoice,
  CanonicalEvolutionEyesChoice,
  CanonicalEvolutionMouthChoice,
  CanonicalEvolutionPostureChoice,
} from "@/types/studio-asset-character-evolution";
import type { DynamicAccessoryAction } from "@/types/studio-asset-generation-workbench";

type DraftPatch = Partial<AssetWizardDraft> | ((d: AssetWizardDraft) => AssetWizardDraft);

type Props = {
  draft: AssetWizardDraft;
  onDraftChange: (patch: DraftPatch) => void;
};

function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-zinc-900">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`min-h-[40px] rounded-full border px-3 py-1.5 text-xs font-semibold ${
              value === opt.id
                ? "border-[#0067B1] bg-[#0067B1]/10 text-[#0067B1]"
                : "border-zinc-300 bg-white text-zinc-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function StudioWizardCanonicalEvolutionConstructionStep({ draft, onDraftChange }: Props) {
  const t = useActiveTranslator();
  const construction = draft.canonicalEvolutionConstruction;
  const dynamicAccessories =
    draft.dynamicAccessories.length > 0
      ? draft.dynamicAccessories
      : seedDynamicAccessoriesFromDraft(draft);

  const patchConstruction = (patch: {
    eyes?: typeof construction.eyes;
    mouth?: typeof construction.mouth;
    expressions?: typeof construction.expressions;
    bodyConstruction?: typeof construction.bodyConstruction;
    posture?: typeof construction.posture;
    build?: typeof construction.build;
  }) => {
    const nextConstruction = {
      ...construction,
      ...patch,
    };
    const summaryPrompt = buildCanonicalEvolutionSummaryPrompt(nextConstruction, draft.name);
    onDraftChange({
      canonicalEvolutionConstruction: nextConstruction,
      summaryPrompt,
      sourceTransformInstruction: summaryPrompt,
      characterConstructionConfirmed: false,
    });
  };

  return (
    <div className="space-y-6">
      <StudioWizardSourceReferenceBanner draft={draft} />
      <div>
        <h3 className="text-base font-semibold text-zinc-900">
          {t("studio.assetCreation.canonicalEvolutionConstruction.title")}
        </h3>
        <p className="mt-1 text-sm text-zinc-600">
          {t("studio.assetCreation.canonicalEvolutionConstruction.lead")}
        </p>
      </div>

      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4">
        <h4 className="text-sm font-semibold text-zinc-900">
          {t("studio.assetCreation.canonicalEvolutionConstruction.faceSection")}
        </h4>
        <ChipGroup<CanonicalEvolutionEyesChoice>
          label={t("studio.assetCreation.canonicalEvolutionConstruction.eyes")}
          value={construction.eyes}
          onChange={(id) => patchConstruction({ eyes: id })}
          options={[
            {
              id: "preserve_original",
              label: t("studio.assetCreation.canonicalEvolutionConstruction.eyes.preserveOriginal"),
            },
            {
              id: "subtle_animation",
              label: t("studio.assetCreation.canonicalEvolutionConstruction.eyes.subtleAnimation"),
            },
            {
              id: "full_character_eyes",
              label: t("studio.assetCreation.canonicalEvolutionConstruction.eyes.fullCharacter"),
            },
          ]}
        />
        <ChipGroup<CanonicalEvolutionMouthChoice>
          label={t("studio.assetCreation.canonicalEvolutionConstruction.mouth")}
          value={construction.mouth}
          onChange={(id) => patchConstruction({ mouth: id })}
          options={[
            {
              id: "preserve_original",
              label: t("studio.assetCreation.canonicalEvolutionConstruction.mouth.preserveOriginal"),
            },
            {
              id: "animation_friendly",
              label: t("studio.assetCreation.canonicalEvolutionConstruction.mouth.animationFriendly"),
            },
          ]}
        />
        <ChipGroup<CanonicalEvolutionExpressionsChoice>
          label={t("studio.assetCreation.canonicalEvolutionConstruction.expressions")}
          value={construction.expressions}
          onChange={(id) => patchConstruction({ expressions: id })}
          options={[
            { id: "limited", label: t("studio.assetCreation.canonicalEvolutionConstruction.expressions.limited") },
            { id: "normal", label: t("studio.assetCreation.canonicalEvolutionConstruction.expressions.normal") },
            { id: "extended", label: t("studio.assetCreation.canonicalEvolutionConstruction.expressions.extended") },
          ]}
        />
      </section>

      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4">
        <h4 className="text-sm font-semibold text-zinc-900">
          {t("studio.assetCreation.canonicalEvolutionConstruction.bodySection")}
        </h4>
        <ChipGroup<CanonicalEvolutionBodyConstructionChoice>
          label={t("studio.assetCreation.canonicalEvolutionConstruction.bodyConstruction")}
          value={construction.bodyConstruction}
          onChange={(id) => patchConstruction({ bodyConstruction: id })}
          options={[
            {
              id: "preserve_proportions",
              label: t("studio.assetCreation.canonicalEvolutionConstruction.bodyConstruction.preserve"),
            },
            {
              id: "subtle_expand",
              label: t("studio.assetCreation.canonicalEvolutionConstruction.bodyConstruction.subtleExpand"),
            },
            {
              id: "full_character_body",
              label: t("studio.assetCreation.canonicalEvolutionConstruction.bodyConstruction.fullBody"),
            },
          ]}
        />
        <ChipGroup<CanonicalEvolutionPostureChoice>
          label={t("studio.assetCreation.canonicalEvolutionConstruction.posture")}
          value={construction.posture}
          onChange={(id) => patchConstruction({ posture: id })}
          options={[
            { id: "small", label: t("studio.assetCreation.canonicalEvolutionConstruction.posture.small") },
            { id: "medium", label: t("studio.assetCreation.canonicalEvolutionConstruction.posture.medium") },
            { id: "large", label: t("studio.assetCreation.canonicalEvolutionConstruction.posture.large") },
          ]}
        />
        <ChipGroup<CanonicalEvolutionBuildChoice>
          label={t("studio.assetCreation.canonicalEvolutionConstruction.build")}
          value={construction.build}
          onChange={(id) => patchConstruction({ build: id })}
          options={[
            { id: "slim", label: t("studio.assetCreation.canonicalEvolutionConstruction.build.slim") },
            { id: "average", label: t("studio.assetCreation.canonicalEvolutionConstruction.build.average") },
            { id: "sturdy", label: t("studio.assetCreation.canonicalEvolutionConstruction.build.sturdy") },
          ]}
        />
      </section>

      {dynamicAccessories.length > 0 ?
        <section className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4">
          <h4 className="text-sm font-semibold text-zinc-900">
            {t("studio.workbench.accessories.title")}
          </h4>
          <p className="text-xs text-zinc-600">{t("studio.workbench.accessories.lead")}</p>
          <div className="space-y-2">
            {dynamicAccessories.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm">
                <span className="font-medium capitalize">{item.label}</span>
                {(["keep", "remove", "replace", "identity_marker"] as DynamicAccessoryAction[]).map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => {
                      const next = dynamicAccessories.map((a) =>
                        a.id === item.id ? { ...a, action } : a
                      );
                      onDraftChange({ dynamicAccessories: next });
                    }}
                    className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                      item.action === action
                        ? "border-[#0067B1] bg-[#0067B1]/10 text-[#0067B1]"
                        : "border-zinc-300 text-zinc-600"
                    }`}
                  >
                    {t(`studio.workbench.accessories.action.${action}` as never)}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </section>
      : null}
    </div>
  );
}
