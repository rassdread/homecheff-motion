"use client";

import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  onBack: () => void;
  onComplete: (input: { message: string; mode: "record" | "upload" | "generate" }) => void;
};

export function PublishVoiceMessageIntake({ onBack, onComplete }: Props) {
  const t = useActiveTranslator();
  const [mode, setMode] = useState<"record" | "upload" | "generate">("generate");
  const [message, setMessage] = useState("");

  return (
    <div className="space-y-4" data-testid="publish-voice-message-intake">
      <p className="text-sm text-white/80">{t("publish.voiceMessage.lead" as never)}</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {(["record", "upload", "generate"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
              mode === m ? "border-emerald-400 bg-emerald-500/20 text-white" : "border-white/15 bg-white/5 text-white/80"
            }`}
          >
            {t(`publish.voiceMessage.mode.${m}` as never)}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="text-sm font-semibold text-white">{t("publish.voiceMessage.messageLabel" as never)}</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="hc-stable-field mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white"
          placeholder={t("publish.voiceMessage.messagePlaceholder" as never)}
        />
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={onBack} className={studioVisual.btnOutline}>{t("editor.flow.back" as never)}</button>
        <button
          type="button"
          disabled={!message.trim()}
          onClick={() => onComplete({ message: message.trim(), mode })}
          className={`disabled:opacity-40 ${studioVisual.btnGradientPrimary}`}
        >
          {t("publish.voiceMessage.create" as never)}
        </button>
      </div>
    </div>
  );
}
