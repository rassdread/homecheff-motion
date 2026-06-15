"use client";

import { useActiveTranslator } from "@/i18n/client";

type Props = {
  onCreate: () => void;
  onFromReference: () => void;
  onLibrary: () => void;
  onMotionReady?: () => void;
  disabled?: boolean;
  compact?: boolean;
};

export function StudioCharacterEntryCtas({
  onCreate,
  onFromReference,
  onLibrary,
  onMotionReady,
  disabled,
  compact,
}: Props) {
  const t = useActiveTranslator();
  const btnClass = compact
    ? "rounded-full border px-3 py-1.5 text-[11px] font-semibold"
    : "rounded-full border px-4 py-2 text-sm font-semibold";

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "" : "mt-3"}`} data-testid="studio-character-entry-ctas">
      <button
        type="button"
        disabled={disabled}
        onClick={onCreate}
        className={`${btnClass} border-[#006D52] bg-[#006D52] text-white hover:bg-[#005a44] disabled:opacity-50`}
        data-testid="studio-character-cta-create"
        data-flow-id="character_new"
      >
        {t("characterCluster.cta.create" as never)}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onFromReference}
        className={`${btnClass} border-[#0067B1] bg-[#0067B1]/10 text-[#0067B1] hover:bg-[#0067B1]/20 disabled:opacity-50`}
        data-testid="studio-character-cta-from-reference"
        data-flow-id="character_reference"
      >
        {t("characterCluster.cta.fromPhoto" as never)}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onLibrary}
        className={`${btnClass} border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 disabled:opacity-50`}
        data-testid="studio-character-cta-library"
      >
        {t("studio.v10_1.character.cta.library" as never)}
      </button>
      {onMotionReady ?
        <button
          type="button"
          disabled={disabled}
          onClick={onMotionReady}
          className={`${btnClass} border-violet-300 bg-violet-50 text-violet-900 hover:bg-violet-100 disabled:opacity-50`}
          data-testid="studio-character-cta-motion-ready"
          data-flow-id="character_motion_ready"
        >
          {t("characterCluster.cta.motionReady" as never)}
        </button>
      : null}
    </div>
  );
}
