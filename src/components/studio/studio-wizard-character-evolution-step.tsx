"use client";

import { useRouter } from "next/navigation";
import { StudioWizardInfoButton } from "@/components/studio/studio-wizard-info-button";
import { StudioWizardSourceReferenceBanner } from "@/components/studio/studio-wizard-source-reference-banner";
import { useActiveTranslator } from "@/i18n/client";
import { buildMotionReadyHrefFromWizardDraft } from "@/lib/motion-ready-character-routes";
import { applyCharacterEvolutionChoice } from "@/lib/studio-asset-character-evolution";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import type { CharacterEvolutionChoice } from "@/types/studio-asset-character-evolution";
import { CHARACTER_EVOLUTION_CHOICES } from "@/types/studio-asset-character-evolution";

type DraftPatch = Partial<AssetWizardDraft> | ((d: AssetWizardDraft) => AssetWizardDraft);

type Props = {
  draft: AssetWizardDraft;
  onDraftChange: (patch: DraftPatch) => void;
};

const CHOICE_LABEL_KEYS: Record<CharacterEvolutionChoice, string> = {
  variant: "studio.assetCreation.characterEvolution.choice.variant",
  canonical_character_base: "studio.assetCreation.characterEvolution.choice.canonicalBase",
  animation_ready_character: "studio.assetCreation.characterEvolution.choice.animationReady",
};

const CHOICE_HINT_KEYS: Record<CharacterEvolutionChoice, string> = {
  variant: "studio.assetCreation.characterEvolution.choice.variantHint",
  canonical_character_base: "studio.assetCreation.characterEvolution.choice.canonicalBaseHint",
  animation_ready_character: "studio.assetCreation.characterEvolution.choice.animationReadyHint",
};

export function StudioWizardCharacterEvolutionStep({ draft, onDraftChange }: Props) {
  const t = useActiveTranslator();
  const router = useRouter();

  const handleSelect = (choice: CharacterEvolutionChoice) => {
    if (choice === "animation_ready_character") {
      router.push(
        buildMotionReadyHrefFromWizardDraft({
          sourceReferenceImageUrl: draft.sourceReferenceImageUrl,
          referenceImageUrl: draft.referenceImageUrl,
          sourceReferenceStorageKey: draft.sourceReferenceStorageKey,
          referenceStorageKey: draft.referenceStorageKey,
          name: draft.name,
          sourceAssetId: draft.derivationSource?.assetId,
          hcProjectId: draft.fields?.hcProjectId,
        })
      );
      return;
    }
    onDraftChange((d) => ({
      ...d,
      ...applyCharacterEvolutionChoice(d, choice),
    }));
  };

  return (
    <div className="space-y-4">
      <StudioWizardSourceReferenceBanner draft={draft} />
      <div>
        <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
          {t("studio.assetCreation.characterEvolution.title")}
          <StudioWizardInfoButton infoKey="studio.workbench.info.canonicalCharacterBase" />
        </h3>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.assetCreation.characterEvolution.lead")}</p>
      </div>
      <div className="space-y-3">
        {CHARACTER_EVOLUTION_CHOICES.map((choice) => {
          const selected = draft.characterEvolutionChoice === choice;
          return (
            <button
              key={choice}
              type="button"
              onClick={() => handleSelect(choice)}
              className={`w-full rounded-2xl border p-4 text-left transition ${
                selected
                  ? "border-[#0067B1] bg-[#0067B1]/5 ring-1 ring-[#0067B1]/30"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
            >
              <p className="text-sm font-semibold text-zinc-900">{t(CHOICE_LABEL_KEYS[choice] as never)}</p>
              <p className="mt-1 text-xs text-zinc-600">{t(CHOICE_HINT_KEYS[choice] as never)}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
