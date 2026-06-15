"use client";

import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";
import { useLocale } from "@/i18n/client";
import { characterVoiceStatusLabel } from "@/lib/studio-character-entry-actions";
import type { StudioCharacterListItem } from "@/types/studio-api";

type Props = {
  character: StudioCharacterListItem;
  inScene?: boolean;
  canModify: boolean;
  onDuplicate?: (characterId: string) => void;
  onVariant?: (character: StudioCharacterListItem) => void;
  onRemove?: (characterId: string) => void;
  onToggleScene?: (characterId: string) => void;
  busyId?: string | null;
};

export function StudioStoryCharacterCard({
  character,
  inScene,
  canModify,
  onDuplicate,
  onVariant,
  onRemove,
  onToggleScene,
  busyId,
}: Props) {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const busy = busyId === character.id;
  const voiceStatus = characterVoiceStatusLabel({
    voiceEnabled: character.voiceEnabled,
    voiceProfile: character.voiceProfile,
    locale: locale === "nl" ? "nl" : "en",
  });

  return (
    <li
      className={`rounded-xl border p-3 ${inScene ? "border-[#006D52]/30 bg-[#006D52]/5" : "border-zinc-200 bg-white"}`}
      data-testid={`studio-story-character-card-${character.id}`}
    >
      <div className="flex gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={character.referenceImageUrl} alt={character.name} className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900">{character.name}</p>
              <p className="truncate text-xs text-zinc-500">
                {character.role?.trim() || t("studio.directorV2.characters.roleFallback")}
              </p>
              <p className="mt-1 text-[10px] font-medium text-violet-800">{voiceStatus}</p>
            </div>
            {onToggleScene && canModify ?
              <label className="flex shrink-0 items-center gap-1 text-[10px] text-zinc-600">
                <input
                  type="checkbox"
                  checked={Boolean(inScene)}
                  onChange={() => onToggleScene(character.id)}
                />
                {t("studio.v10_1.character.inScene" as never)}
              </label>
            : null}
          </div>
          {canModify ?
            <div className="mt-2 flex flex-wrap gap-1">
              <Link
                href={`/studio/characters/${character.id}/edit`}
                prefetch={false}
                className="rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                {t("studio.v10_1.character.action.edit" as never)}
              </Link>
              {onDuplicate ?
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onDuplicate(character.id)}
                  className="rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  {t("studio.v10_1.character.action.duplicate" as never)}
                </button>
              : null}
              {onVariant ?
                <button
                  type="button"
                  onClick={() => onVariant(character)}
                  className="rounded-full border border-[#0067B1]/30 px-2 py-0.5 text-[10px] font-semibold text-[#0067B1] hover:bg-[#0067B1]/5"
                >
                  {t("studio.v10_1.character.action.variant" as never)}
                </button>
              : null}
              <Link
                href={`/studio/characters/${character.id}#voice`}
                prefetch={false}
                className="rounded-full border border-violet-200 px-2 py-0.5 text-[10px] font-semibold text-violet-800 hover:bg-violet-50"
              >
                {t("studio.v10_1.character.action.voice" as never)}
              </Link>
              {onRemove ?
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRemove(character.id)}
                  className="rounded-full border border-red-200 px-2 py-0.5 text-[10px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {busy ? t("button.loading") : t("studio.v10_1.character.action.remove" as never)}
                </button>
              : null}
            </div>
          : null}
        </div>
      </div>
    </li>
  );
}
