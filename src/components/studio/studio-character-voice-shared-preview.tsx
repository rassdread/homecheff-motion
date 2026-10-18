"use client";

import { useSyncExternalStore } from "react";
import { StudioAudioPreviewPlayer } from "@/components/studio/studio-audio-preview-player";
import { ELEVENLABS_SPEECH_SPEEDS } from "@/lib/elevenlabs-speech-speed";
import {
  getVoiceLibrarySampleState,
  playVoiceLibrarySample,
  subscribeVoiceLibrarySample,
} from "@/lib/studio-voice-library-sample";

type Props = {
  voiceLabel: string;
  voiceSelected: boolean;
  voiceEnabled: boolean;
  language: string;
  languages: readonly string[];
  onLanguage: (language: string) => void;
  speechSpeed: number;
  onSpeechSpeed: (speed: number) => void;
  previewText: string;
  onPreviewText: (text: string) => void;
  sampleUrl: string;
  onPersonalizedPreview: () => void;
  previewBusy: boolean;
  previewError: string;
  previewNotice: string;
  personalizedAudioUrl?: string;
};

export function StudioCharacterVoiceSharedPreview({
  voiceLabel,
  voiceSelected,
  voiceEnabled,
  language,
  languages,
  onLanguage,
  speechSpeed,
  onSpeechSpeed,
  previewText,
  onPreviewText,
  sampleUrl,
  onPersonalizedPreview,
  previewBusy,
  previewError,
  previewNotice,
  personalizedAudioUrl,
}: Props) {
  const sample = useSyncExternalStore(
    subscribeVoiceLibrarySample,
    getVoiceLibrarySampleState,
    getVoiceLibrarySampleState
  );
  const speedLabel = `${speechSpeed}×`;
  const samplePlaying = Boolean(sampleUrl) && sample.playing && sample.url === sampleUrl;

  return (
    <section className="mt-4 rounded-xl border border-violet-300 bg-white p-4" data-testid="voice-preview-panel">
      <h3 className="text-sm font-bold text-violet-950">Voorbeeld</h3>
      <p className="mt-1 text-sm text-zinc-800">
        {voiceSelected ? voiceLabel : "Geen stem gekozen"}
        {voiceSelected ? <span className="text-zinc-500"> · {speedLabel}</span> : null}
      </p>
      {voiceSelected && !voiceEnabled ?
        <p className="mt-2 text-xs text-amber-900">
          Stem gekozen, nog niet ingeschakeld. Beluisteren slaat de stem niet op en renders gebruiken hem nog niet.
        </p>
      : null}
      {voiceSelected && voiceEnabled ?
        <p className="mt-2 text-xs text-violet-800">
          Stem ingeschakeld. Sla het personage op om deze stem, taal en snelheid te bewaren.
        </p>
      : null}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-violet-900">
          Taal
          <select
            aria-label="Voorbeeldtaal"
            className="mt-1 w-full min-h-[44px] rounded-lg border border-violet-200 bg-white px-3 text-sm"
            value={language}
            onChange={(event) => onLanguage(event.target.value)}
          >
            {languages.map((code) => (
              <option key={code} value={code}>
                {code.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-violet-900">
          Spreeksnelheid ({speedLabel})
          <select
            aria-label="Spreeksnelheid"
            className="mt-1 w-full min-h-[44px] rounded-lg border border-violet-200 bg-white px-3 text-sm"
            value={String(speechSpeed)}
            onChange={(event) => onSpeechSpeed(Number(event.target.value))}
          >
            {ELEVENLABS_SPEECH_SPEEDS.map((speed) => (
              <option key={speed} value={speed}>
                {speed === 1 ? "1× standaard" : `${speed}×`}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-3 block text-xs font-medium text-violet-900">
        Voorbeeldtekst
        <textarea
          aria-label="Voorbeeldtekst"
          className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm"
          rows={3}
          value={previewText}
          onChange={(event) => onPreviewText(event.target.value)}
        />
      </label>
      <p className="mt-1 text-[11px] text-zinc-500">
        Snelheid of tekst wijzigen maakt geen audio. Kies zelf wanneer je een nieuw voorbeeld wilt.
        Beluister voorbeeld gebruikt de echte ElevenLabs-snelheid. De gratis vergelijking op een stemkaart is alleen een benadering.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {sampleUrl ?
          <button
            type="button"
            onClick={() => playVoiceLibrarySample(sampleUrl)}
            className="min-h-[44px] rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900"
          >
            {samplePlaying ? "Stop voorbeeld" : "Beluister gratis voorbeeld"}
          </button>
        : <p className="self-center text-xs text-zinc-500">Geen gratis voorbeeld beschikbaar</p>}
        <button
          type="button"
          disabled={!voiceSelected || previewBusy}
          onClick={onPersonalizedPreview}
          className="min-h-[44px] rounded-full bg-[#0067B1] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {previewBusy ? "Bezig…" : "Beluister voorbeeld"}
        </button>
      </div>
      {!voiceSelected ?
        <p className="mt-2 text-xs text-zinc-600">Kies eerst een stem. Het voorbeeld gebruikt die stem zonder hem op te slaan.</p>
      : null}
      {sample.error === "broken" && sample.url === sampleUrl ?
        <p className="mt-2 text-xs text-red-800">Dit gratis voorbeeld kan niet worden afgespeeld.</p>
      : null}
      {previewNotice ? <p className="mt-2 text-xs text-emerald-800">{previewNotice}</p> : null}
      {previewError ? <p className="mt-2 text-xs text-red-800">{previewError}</p> : null}
      {personalizedAudioUrl ?
        <div className="mt-3">
          <StudioAudioPreviewPlayer
            title="Persoonlijk voorbeeld"
            audioUrl={personalizedAudioUrl}
            source="voice_character"
            variant="compact"
          />
        </div>
      : null}
    </section>
  );
}
