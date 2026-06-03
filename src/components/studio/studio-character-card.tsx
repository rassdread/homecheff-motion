"use client";

import Link from "next/link";
import { StudioCharacterRoleBadge } from "@/components/studio/studio-character-role-badge";
import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioCharacterListItem } from "@/types/studio-api";

type StudioCharacterCardProps = {
  character: StudioCharacterListItem;
  onDelete: (id: string) => void;
  deleteBusyId: string | null;
  canModify: boolean;
};

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) {
    return t;
  }
  return `${t.slice(0, max - 1)}…`;
}

export function StudioCharacterCard({
  character,
  onDelete,
  deleteBusyId,
  canModify,
}: StudioCharacterCardProps) {
  const t = useActiveTranslator();
  const busy = deleteBusyId === character.id;

  return (
    <AppCard className="flex h-full flex-col overflow-hidden p-0">
      <div className="relative aspect-[4/3] w-full bg-zinc-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={character.referenceImageUrl}
          alt={character.name}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-zinc-900">{character.name}</h3>
          <StudioCharacterRoleBadge role={character.role} />
        </div>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600">
          {truncate(character.description || character.personality, 140)}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/studio/characters/${character.id}`}
            prefetch={false}
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            {t("studio.characters.action.view")}
          </Link>
          {canModify ? (
            <>
              <Link
                href={`/studio/characters/${character.id}/edit`}
                prefetch={false}
                className="rounded-full border border-[#0067B1]/40 px-3 py-1.5 text-xs font-semibold text-[#0067B1] hover:bg-[#0067B1]/5"
              >
                {t("studio.characters.action.edit")}
              </Link>
              <button
                type="button"
                disabled={busy}
                onClick={() => onDelete(character.id)}
                className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {busy ? t("button.loading") : t("studio.characters.action.delete")}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </AppCard>
  );
}
