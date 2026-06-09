"use client";

import { StudioWizardSourceReferenceBanner } from "@/components/studio/studio-wizard-source-reference-banner";
import { useActiveTranslator } from "@/i18n/client";
import { buildCanonicalEvolutionSummaryPrompt } from "@/lib/studio-asset-character-evolution";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import type {
  CanonicalEvolutionBuildChoice,
  CanonicalEvolutionBodyConstructionChoice,
  CanonicalEvolutionExpressionsChoice,
  CanonicalEvolutionEyesChoice,
  CanonicalEvolutionMouthChoice,
  CanonicalEvolutionPostureChoice,
  CanonicalEvolutionStripAccessories,
} from "@/types/studio-asset-character-evolution";

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

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 px-3 py-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-zinc-300"
      />
      <span className="text-zinc-800">{label}</span>
    </label>
  );
}

export function StudioWizardCanonicalEvolutionConstructionStep({ draft, onDraftChange }: Props) {
  const t = useActiveTranslator();
  const construction = draft.canonicalEvolutionConstruction;

  const patchConstruction = (patch: {
    eyes?: typeof construction.eyes;
    mouth?: typeof construction.mouth;
    expressions?: typeof construction.expressions;
    bodyConstruction?: typeof construction.bodyConstruction;
    posture?: typeof construction.posture;
    build?: typeof construction.build;
    stripAccessories?: Partial<CanonicalEvolutionStripAccessories>;
  }) => {
    const nextConstruction = {
      ...construction,
      ...patch,
      stripAccessories: {
        ...construction.stripAccessories,
        ...patch.stripAccessories,
      },
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

      <section className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4">
        <h4 className="text-sm font-semibold text-zinc-900">
          {t("studio.assetCreation.canonicalEvolutionConstruction.accessoriesSection")}
        </h4>
        <p className="text-xs text-zinc-600">
          {t("studio.assetCreation.canonicalEvolutionConstruction.accessoriesLead")}
        </p>
        <div className="space-y-2">
          <CheckboxRow
            label={t("studio.assetCreation.canonicalEvolutionConstruction.strip.globe")}
            checked={construction.stripAccessories.globe}
            onChange={(checked) => patchConstruction({ stripAccessories: { globe: checked } })}
          />
          <CheckboxRow
            label={t("studio.assetCreation.canonicalEvolutionConstruction.strip.tools")}
            checked={construction.stripAccessories.tools}
            onChange={(checked) => patchConstruction({ stripAccessories: { tools: checked } })}
          />
          <CheckboxRow
            label={t("studio.assetCreation.canonicalEvolutionConstruction.strip.chef")}
            checked={construction.stripAccessories.chefAttributes}
            onChange={(checked) => patchConstruction({ stripAccessories: { chefAttributes: checked } })}
          />
          <CheckboxRow
            label={t("studio.assetCreation.canonicalEvolutionConstruction.strip.garden")}
            checked={construction.stripAccessories.gardenAttributes}
            onChange={(checked) => patchConstruction({ stripAccessories: { gardenAttributes: checked } })}
          />
        </div>
      </section>
    </div>
  );
}
