"use client";

import { useEffect, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { fetchCharacterVoiceHistory, type CharacterVoiceHistoryEntryClient } from "@/lib/studio-characters-client";
import { getVoiceProfilePreset, normalizeStudioVoiceProfileId } from "@/lib/studio-voice-profiles";

type Props = {
  characterId: string;
  refreshKey?: number;
};

function formatVoiceLabel(t: ReturnType<typeof useActiveTranslator>, profileId: string, enabled: boolean) {
  if (!enabled) {
    return t("studio.voiceIdentity.noVoice");
  }
  const preset = getVoiceProfilePreset(normalizeStudioVoiceProfileId(profileId));
  return t(preset.labelKey as never);
}

function formatDate(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function StudioCharacterVoiceHistoryPanel({ characterId, refreshKey = 0 }: Props) {
  const t = useActiveTranslator();
  const [entries, setEntries] = useState<CharacterVoiceHistoryEntryClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        const res = await fetchCharacterVoiceHistory(characterId);
        if (cancelled) {
          return;
        }
        if (res.ok) {
          setEntries(res.data.entries);
        } else {
          setEntries([]);
        }
        setLoading(false);
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [characterId, refreshKey]);

  if (loading) {
    return (
      <p className="text-xs text-zinc-500">{t("button.loading")}</p>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-xs text-zinc-500">{t("studio.voiceIdentity.historyEmpty")}</p>
    );
  }

  const locale = typeof navigator !== "undefined" ? navigator.language : "en";

  return (
    <ul className="space-y-2">
      {entries.slice(0, 8).map((entry) => {
        const beforeLabel = formatVoiceLabel(t, entry.before.voiceProfile, entry.before.voiceEnabled);
        const afterLabel = formatVoiceLabel(t, entry.after.voiceProfile, entry.after.voiceEnabled);
        return (
          <li
            key={entry.id}
            className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-700"
          >
            <p className="font-medium text-zinc-900">
              {beforeLabel} → {afterLabel}
            </p>
            <p className="mt-0.5 text-zinc-500">{formatDate(entry.createdAt, locale)}</p>
          </li>
        );
      })}
    </ul>
  );
}
