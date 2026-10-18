"use client";

import { useState } from "react";
import { useSyncExternalStore } from "react";
import { ELEVENLABS_SPEECH_SPEEDS } from "@/lib/elevenlabs-speech-speed";
import {
  getVoiceLibrarySampleState,
  playVoiceLibrarySample,
  setVoiceLibrarySampleRate,
  subscribeVoiceLibrarySample,
} from "@/lib/studio-voice-library-sample";

type Props = {
  previewUrl: string;
  label: string;
  onSpeed: (speed: number) => void;
};

/** Free prerecorded sample. playbackRate is only an approximation and never calls ElevenLabs. */
export function StudioVoiceSampleCompare({ previewUrl, label, onSpeed }: Props) {
  const sample = useSyncExternalStore(
    subscribeVoiceLibrarySample,
    getVoiceLibrarySampleState,
    getVoiceLibrarySampleState
  );
  const [speed, setSpeed] = useState(1);
  const playing = sample.playing && sample.url === previewUrl;

  if (!previewUrl) {
    return <p className="text-xs text-zinc-500">Geen gratis voorbeeld beschikbaar</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => playVoiceLibrarySample(previewUrl, speed)}
        className="min-h-[44px] rounded-full border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900"
      >
        {playing ? "Stop voorbeeld" : "Beluister gratis voorbeeld"}
      </button>
      <label className="text-xs text-zinc-700">
        Vergelijk gratis
        <select
          aria-label={`Vergelijkingssnelheid ${label}`}
          value={String(speed)}
          onChange={(event) => {
            const next = Number(event.target.value);
            setSpeed(next);
            onSpeed(next);
            if (playing) setVoiceLibrarySampleRate(next);
          }}
          className="ml-2 min-h-[44px] rounded-lg border border-zinc-200 bg-white px-2 text-sm"
        >
          {ELEVENLABS_SPEECH_SPEEDS.map((option) => (
            <option key={option} value={option}>
              {option}×
            </option>
          ))}
        </select>
      </label>
      <p className="basis-full text-[11px] text-zinc-500">
        Gratis vergelijking via afspelen. Dit is een benadering, geen echte AI-snelheid en kost geen HC.
      </p>
      {sample.error === "broken" && sample.url === previewUrl ?
        <p className="basis-full text-xs text-red-800">Dit voorbeeld kan niet worden afgespeeld.</p>
      : null}
    </div>
  );
}
