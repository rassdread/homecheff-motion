"use client";

import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { PhotoStoryDurationChoice } from "@/lib/publish-story-proposal";
import { studioVisual } from "@/lib/studio-visual-tokens";

const DURATIONS: PhotoStoryDurationChoice[] = [10, 20, 30, 60];

type Props = {
  imageName: string;
  onBack: () => void;
  onComplete: (input: { durationSeconds: PhotoStoryDurationChoice; message: string }) => void;
};

export function PublishPhotoStoryIntake({ imageName, onBack, onComplete }: Props) {
  const t = useActiveTranslator();
  const [step, setStep] = useState<"duration" | "message">("duration");
  const [duration, setDuration] = useState<PhotoStoryDurationChoice>(30);
  const [message, setMessage] = useState("");

  if (step === "duration") {
    return (
      <div className="space-y-4" data-testid="publish-photo-story-intake">
        <p className="text-sm text-white/80">{t("publish.photoStory.durationLead" as never, { name: imageName } as never)}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold ${
                duration === d ? "border-emerald-400 bg-emerald-500/20 text-white" : "border-white/15 bg-white/5 text-white/80"
              }`}
            >
              {d} {t("publish.photoStory.seconds" as never)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onBack} className={studioVisual.btnOutline}>{t("editor.flow.back" as never)}</button>
          <button type="button" onClick={() => setStep("message")} className={studioVisual.btnGradientPrimary}>
            {t("editor.flow.continue" as never)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-sm font-semibold text-white">{t("publish.photoStory.messageLabel" as never)}</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          className="hc-stable-field mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
          placeholder={t("publish.photoStory.messagePlaceholder" as never)}
        />
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={() => setStep("duration")} className={studioVisual.btnOutline}>{t("editor.flow.back" as never)}</button>
        <button
          type="button"
          disabled={!message.trim()}
          onClick={() => onComplete({ durationSeconds: duration, message: message.trim() })}
          className={`disabled:opacity-40 ${studioVisual.btnGradientPrimary}`}
        >
          {t("publish.photoStory.create" as never)}
        </button>
      </div>
    </div>
  );
}
