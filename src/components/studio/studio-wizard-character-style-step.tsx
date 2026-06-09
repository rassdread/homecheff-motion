"use client";

import { useEffect, useRef } from "react";
import { StudioWizardInfoButton } from "@/components/studio/studio-wizard-info-button";
import { StudioWizardSourceReferenceBanner } from "@/components/studio/studio-wizard-source-reference-banner";
import { useActiveTranslator } from "@/i18n/client";
import {
  CHARACTER_STYLE_CARDS,
  suggestCharacterStyleFromVision,
} from "@/lib/studio-asset-character-style-cards";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import type { CharacterStyleCardId } from "@/types/studio-asset-generation-workbench";

type DraftPatch = Partial<AssetWizardDraft> | ((d: AssetWizardDraft) => AssetWizardDraft);

type Props = {
  draft: AssetWizardDraft;
  onDraftChange: (patch: DraftPatch) => void;
};

function WireframePreview({ wireframe }: { wireframe: string }) {
  const common = "mx-auto h-16 w-16 stroke-zinc-500 fill-none stroke-2";
  if (wireframe === "circle_head") {
    return (
      <svg viewBox="0 0 64 64" className={common} aria-hidden>
        <circle cx="32" cy="22" r="12" />
        <path d="M16 52 Q32 36 48 52" />
      </svg>
    );
  }
  if (wireframe === "blocky_3d") {
    return (
      <svg viewBox="0 0 64 64" className={common} aria-hidden>
        <rect x="20" y="14" width="24" height="20" rx="4" />
        <rect x="18" y="36" width="28" height="18" rx="3" />
      </svg>
    );
  }
  if (wireframe === "game_sprite") {
    return (
      <svg viewBox="0 0 64 64" className={common} aria-hidden>
        <rect x="24" y="12" width="16" height="16" />
        <rect x="20" y="30" width="24" height="22" />
        <line x1="20" y1="38" x2="12" y2="48" />
        <line x1="44" y1="38" x2="52" y2="48" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className={common} aria-hidden>
      <ellipse cx="32" cy="24" rx="14" ry="16" />
      <path d="M18 54 Q32 40 46 54" />
    </svg>
  );
}

export function StudioWizardCharacterStyleStep({ draft, onDraftChange }: Props) {
  const t = useActiveTranslator();
  const seededRef = useRef(false);

  useEffect(() => {
    if (seededRef.current || draft.characterStyleCard) {
      return;
    }
    seededRef.current = true;
    const suggested = suggestCharacterStyleFromVision(draft);
    if (suggested) {
      onDraftChange({ characterStyleCard: suggested });
    }
  }, [draft, onDraftChange]);

  return (
    <div className="space-y-4">
      <StudioWizardSourceReferenceBanner draft={draft} />
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold text-zinc-900">
          {t("studio.workbench.style.title")}
        </h3>
        <StudioWizardInfoButton infoKey="studio.workbench.info.characterStyle" />
      </div>
      <p className="text-sm text-zinc-600">{t("studio.workbench.style.lead")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {CHARACTER_STYLE_CARDS.map((card) => {
          const selected = draft.characterStyleCard === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onDraftChange({ characterStyleCard: card.id as CharacterStyleCardId })}
              className={`rounded-2xl border p-4 text-left ${
                selected ? "border-[#0067B1] bg-[#0067B1]/5 ring-1 ring-[#0067B1]/30" : "border-zinc-200 bg-white"
              }`}
            >
              <WireframePreview wireframe={card.wireframe} />
              <p className="mt-2 text-sm font-semibold text-zinc-900">{t(card.labelKey as never)}</p>
              <p className="mt-1 text-xs text-zinc-600">{t(card.descriptionKey as never)}</p>
              <p className="mt-2 text-[11px] text-zinc-500">
                {t("studio.workbench.style.metrics", {
                  identity: String(card.identityRetentionPercent),
                  animation: String(card.animationFlexibilityPercent),
                  complexity: card.complexity,
                })}
              </p>
              <p className="mt-1 text-[11px] font-medium text-zinc-700">{t(card.bestForKey as never)}</p>
            </button>
          );
        })}
      </div>
      {draft.characterStyleCard === "custom" ?
        <input
          type="text"
          value={draft.characterStyleCustom}
          onChange={(e) => onDraftChange({ characterStyleCustom: e.target.value })}
          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          placeholder={t("studio.workbench.style.customPlaceholder")}
        />
      : null}
    </div>
  );
}
