"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { PublishProductionSectionId } from "@/types/publish-media-production";

const CTA_SECTIONS: Array<{ id: PublishProductionSectionId; labelKey: string }> = [
  { id: "voice", labelKey: "publish.media.cta.addVoice" },
  { id: "music", labelKey: "publish.media.cta.addMusic" },
  { id: "soundEffects", labelKey: "publish.media.cta.addSoundEffects" },
  { id: "subtitles", labelKey: "publish.media.cta.addSubtitles" },
  { id: "textOverlays", labelKey: "publish.media.cta.addTextOverlay" },
];

type Props = {
  onSelect: (section: PublishProductionSectionId) => void;
  missingSections?: PublishProductionSectionId[];
};

export function PublishMediaEmptyCtaRow({ onSelect, missingSections }: Props) {
  const t = useActiveTranslator();
  const sections =
    missingSections && missingSections.length > 0
      ? CTA_SECTIONS.filter((item) => missingSections.includes(item.id))
      : CTA_SECTIONS;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="publish-media-empty-ctas">
      {sections.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          className="flex min-h-[72px] items-center justify-center rounded-2xl border-2 border-dashed border-[#0067B1]/30 bg-[#0067B1]/5 px-4 py-3 text-sm font-semibold text-[#0067B1] transition hover:border-[#0067B1]/50 hover:bg-[#0067B1]/10"
        >
          + {t(item.labelKey as never)}
        </button>
      ))}
    </div>
  );
}
