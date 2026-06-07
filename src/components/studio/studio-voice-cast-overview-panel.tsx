"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import {
  buildCharacterVoiceOrchestration,
  buildStoryboardVoicePlan,
} from "@/lib/studio-character-voice-orchestration";
import { buildStoryArchitecture } from "@/lib/studio-story-architecture";
import type { StoryCastMember } from "@/types/studio-character-voice-orchestration";
import type { StudioCharacterListItem, StudioStoryboardDetail } from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
  characters: StudioCharacterListItem[];
  compact?: boolean;
};

function CastStatusBadge({ member }: { member: StoryCastMember }) {
  const t = useActiveTranslator();
  const className =
    member.status === "assigned"
      ? "bg-emerald-100 text-emerald-900"
      : member.status === "missing_voice"
        ? "bg-amber-100 text-amber-950"
        : "bg-zinc-100 text-zinc-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${className}`}>
      {t(member.statusLabelKey as TranslationKey)}
    </span>
  );
}

function CastRow({ member }: { member: StoryCastMember }) {
  const t = useActiveTranslator();
  return (
    <li className="rounded-lg border border-violet-100 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-violet-950">{member.characterName}</p>
          <p className="mt-0.5 text-xs text-violet-800">
            {member.voiceEnabled && member.status === "assigned"
              ? member.voiceDisplayName
              : t("studio.voiceOrchestration.cast.noVoice")}
          </p>
          <p className="mt-0.5 text-[11px] text-violet-700">
            {t("studio.voiceOrchestration.cast.source")}:{" "}
            {t(member.voiceSourceLabelKey as TranslationKey)}
          </p>
        </div>
        <CastStatusBadge member={member} />
      </div>
    </li>
  );
}

export function StudioVoiceCastOverviewPanel({ storyboard, characters, compact = false }: Props) {
  const t = useActiveTranslator();
  const language = (storyboard.voiceLanguage ?? "en").slice(0, 2);

  const { orchestration, voicePlan } = useMemo(() => {
    const architecture = buildStoryArchitecture({
      userIdea: storyboard.aiDirectorPrompt ?? storyboard.title ?? "",
      storyboard,
      characters,
    });
    const orch = buildCharacterVoiceOrchestration({
      storyboard,
      characters,
      language,
      storyArchitecture: architecture,
    });
    const plan = buildStoryboardVoicePlan({ storyboard, orchestration: orch, language });
    return { orchestration: orch, voicePlan: plan };
  }, [storyboard, characters, language]);

  const sceneCast = orchestration.castMembers.filter((m) => m.appearsInSceneCount > 0);

  if (sceneCast.length === 0) {
    return (
      <p className="text-sm text-zinc-600">{t("studio.voiceOrchestration.cast.empty")}</p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("studio.voiceOrchestration.cast.title")}
        </h3>
        {!compact ?
          <p className="mt-1 text-xs text-zinc-600">{t("studio.voiceOrchestration.cast.subtitle")}</p>
        : null}
        <p className="mt-2 text-xs font-medium text-violet-800">
          {t(orchestration.dialogueReadiness.labelKey as TranslationKey)}
        </p>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {sceneCast.map((member) => (
          <CastRow key={member.characterId} member={member} />
        ))}
      </ul>

      {orchestration.momentSpeakers.length > 0 && !compact ?
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.voiceOrchestration.momentSpeakers.title")}
          </h4>
          <ul className="mt-2 space-y-1 text-sm text-zinc-700">
            {orchestration.momentSpeakers.map((moment) => (
              <li key={moment.momentId}>
                {t(moment.momentLabelKey as TranslationKey)} →{" "}
                {moment.carrierCharacterName ?? "—"}
              </li>
            ))}
          </ul>
        </section>
      : null}

      {!compact ?
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.voiceOrchestration.sceneSpeakers.title")}
          </h4>
          <ul className="mt-2 space-y-1 text-sm text-zinc-700">
            {voicePlan.sceneSpeakerAssignments.map((row) => (
              <li key={row.sceneId}>
                {t("studio.voiceOrchestration.sceneSpeakers.line", {
                  scene: String(row.sceneOrder + 1),
                  speaker: row.speakerName,
                })}
              </li>
            ))}
          </ul>
        </section>
      : null}
    </div>
  );
}
