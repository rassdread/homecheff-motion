"use client";

import { useRef } from "react";
import { PublishMediaTabButton } from "@/components/publish/publish-media-tab-button";
import { PublishProductionSectionShell } from "@/components/publish/publish-production-section-shell";
import { PublishWizardStableTextarea } from "@/components/publish/publish-wizard-stable-textarea";
import { useActiveTranslator } from "@/i18n/client";
import {
  buildVoiceDisplayLabel,
  resolveVoiceLabelFromSettings,
} from "@/lib/publish-media-production";
import {
  updateVoiceMode,
  updateVoiceScope,
  voicePanelVisibility,
} from "@/lib/publish-media-panel-state";
import type { PublishVoiceConfig, PublishVoiceMode, PublishVoiceScope } from "@/types/publish-media-production";

const VOICE_MODES: PublishVoiceMode[] = ["none", "ai_voice", "recorded", "cloned", "library"];
const VOICE_SCOPES: PublishVoiceScope[] = ["project", "scene"];
const LIBRARY_VOICES = [
  { id: "nl_female_friendly", label: "Dutch Female – Friendly" },
  { id: "nl_male_calm", label: "Dutch Male – Calm" },
  { id: "en_female_energetic", label: "English Female – Energetic" },
];

type Props = {
  value: PublishVoiceConfig;
  onChange: (next: PublishVoiceConfig) => void;
  defaultScript?: string;
};

export function PublishVoicePanel({ value, onChange, defaultScript }: Props) {
  const t = useActiveTranslator();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const visibility = voicePanelVisibility(value);

  const patch = (patchValue: Partial<PublishVoiceConfig>) => {
    const next = { ...value, ...patchValue };
    if (patchValue.language || patchValue.gender || patchValue.emotion || patchValue.mode) {
      if (next.mode !== "none") {
        next.label = resolveVoiceLabelFromSettings(next);
      }
    }
    onChange(next);
  };

  const selectMode = (mode: PublishVoiceMode) => {
    onChange(updateVoiceMode(value, mode, { defaultScript }));
  };

  const selectScope = (scope: PublishVoiceScope) => {
    onChange(updateVoiceScope(value, scope));
  };

  return (
    <PublishProductionSectionShell
      titleKey="publish.media.voice.title"
      summary={buildVoiceDisplayLabel(value) || undefined}
      emptyLabelKey={value.mode === "none" ? "publish.media.voice.noneSelected" : undefined}
      active={value.mode !== "none"}
      testId="publish-voice-panel"
    >
      <div role="tablist" aria-label={t("publish.media.voice.title" as never)} className="flex flex-wrap gap-2">
        {VOICE_MODES.map((mode) => (
          <PublishMediaTabButton
            key={mode}
            active={value.mode === mode}
            testId={`publish-voice-mode-${mode}`}
            onClick={() => selectMode(mode)}
          >
            {t(`publish.media.voice.mode.${mode}` as never)}
          </PublishMediaTabButton>
        ))}
      </div>

      {visibility.emptyState ?
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600" data-testid="publish-voice-empty-state">
          {t("publish.media.voice.emptyAdded" as never)}
        </p>
      : null}

      {visibility.scopeControls ?
        <div role="tablist" aria-label={t("publish.media.voice.scopeLabel" as never)} className="flex flex-wrap gap-2">
          {VOICE_SCOPES.map((scope) => (
            <PublishMediaTabButton
              key={scope}
              active={value.scope === scope}
              testId={`publish-voice-scope-${scope}`}
              onClick={() => selectScope(scope)}
            >
              {t(`publish.media.voice.scope.${scope}` as never)}
            </PublishMediaTabButton>
          ))}
        </div>
      : null}

      {visibility.sceneRows ?
        <ul className="space-y-2" data-testid="publish-voice-scene-rows">
          {value.sceneVoices.map((scene, index) => (
            <li key={scene.sceneId} className="rounded-xl border border-zinc-200 p-3">
              <p className="text-xs font-semibold text-zinc-700">{scene.label}</p>
              <PublishWizardStableTextarea
                value={scene.script}
                rows={2}
                className="mt-2 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                onCommit={(script) => {
                  const sceneVoices = value.sceneVoices.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, script } : row
                  );
                  patch({ sceneVoices });
                }}
              />
            </li>
          ))}
        </ul>
      : null}

      {visibility.aiControls || visibility.clonedControls ?
        <label className="block text-xs font-semibold text-zinc-600" data-testid="publish-voice-script-controls">
          {t("publish.media.voice.script" as never)}
          <PublishWizardStableTextarea
            value={value.script ?? ""}
            rows={3}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            onCommit={(script) => patch({ script })}
          />
        </label>
      : null}

      {visibility.aiControls ?
        <div data-testid="publish-voice-ai-controls" className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-zinc-600">
              {t("publish.media.voice.language" as never)}
              <select
                value={value.language}
                onChange={(e) => patch({ language: e.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
              >
                <option value="nl">Nederlands</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-zinc-600">
              {t("publish.media.voice.gender" as never)}
              <select
                value={value.gender}
                onChange={(e) => patch({ gender: e.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
              >
                <option value="female">{t("publish.media.voice.gender.female" as never)}</option>
                <option value="male">{t("publish.media.voice.gender.male" as never)}</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-zinc-600">
              {t("publish.media.voice.emotion" as never)}
              <select
                value={value.emotion}
                onChange={(e) => patch({ emotion: e.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
              >
                <option value="friendly">{t("publish.media.voice.emotion.friendly" as never)}</option>
                <option value="energetic">{t("publish.media.voice.emotion.energetic" as never)}</option>
                <option value="calm">{t("publish.media.voice.emotion.calm" as never)}</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-zinc-600">
              {t("publish.media.voice.provider" as never)}
              <select
                value={value.provider ?? "elevenlabs"}
                onChange={(e) => patch({ provider: e.target.value as PublishVoiceConfig["provider"] })}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
              >
                <option value="elevenlabs">ElevenLabs</option>
                <option value="openai">OpenAI</option>
                <option value="homecheff">HomeCheff Voices</option>
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-zinc-600">
              {t("publish.media.voice.speed" as never)}: {value.speed.toFixed(1)}×
              <input type="range" min={0.5} max={2} step={0.1} value={value.speed} onChange={(e) => patch({ speed: Number(e.target.value) })} className="mt-1 w-full" />
            </label>
            <label className="text-xs font-semibold text-zinc-600">
              {t("publish.media.voice.volume" as never)}: {value.volume}%
              <input type="range" min={0} max={100} value={value.volume} onChange={(e) => patch({ volume: Number(e.target.value) })} className="mt-1 w-full" />
            </label>
          </div>
          <button type="button" disabled className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-500" title={t("publish.media.futureAction" as never)}>
            {t("publish.media.voice.generateAction" as never)}
          </button>
        </div>
      : null}

      {visibility.recordedControls ?
        <div data-testid="publish-voice-recorded-controls" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700">
              {t("publish.media.voice.recordAction" as never)}
            </button>
            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700"
            >
              {t("publish.media.voice.uploadAction" as never)}
            </button>
            <input
              ref={uploadInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const url = URL.createObjectURL(file);
                patch({ audioUrl: url, audioFileName: file.name, label: file.name });
              }}
            />
          </div>
          {value.audioUrl ?
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs font-medium text-zinc-700">{value.audioFileName}</p>
              <audio controls src={value.audioUrl} className="mt-2 w-full" />
            </div>
          : null}
        </div>
      : null}

      {visibility.clonedControls ?
        <div data-testid="publish-voice-cloned-controls" className="space-y-3">
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {t("publish.media.voice.cloneConsent" as never)}
          </p>
          <label className="text-xs font-semibold text-zinc-600">
            {t("publish.media.voice.cloneSelector" as never)}
            <select
              value={value.cloneVoiceId ?? ""}
              onChange={(e) => patch({ cloneVoiceId: e.target.value, label: e.target.value || value.label })}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
            >
              <option value="">{t("publish.media.voice.clonePlaceholder" as never)}</option>
              <option value="my_voice_clone">My voice clone</option>
            </select>
          </label>
        </div>
      : null}

      {visibility.libraryPicker ?
        <ul className="space-y-2" data-testid="publish-voice-library-picker">
          {LIBRARY_VOICES.map((voice) => (
            <li key={voice.id}>
              <button
                type="button"
                onClick={() => patch({ libraryVoiceId: voice.id, voiceId: voice.id, label: voice.label })}
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                  value.libraryVoiceId === voice.id
                    ? "border-[#0067B1] bg-[#0067B1]/10 font-semibold text-[#0067B1]"
                    : "border-zinc-200 text-zinc-700 hover:border-[#0067B1]/30"
                }`}
              >
                {voice.label}
              </button>
            </li>
          ))}
        </ul>
      : null}
    </PublishProductionSectionShell>
  );
}
