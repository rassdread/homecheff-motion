"use client";

import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  blankCanvas?: boolean;
  onBack: () => void;
  onComplete: (input: { title: string; subtitle: string; cta: string; logoUrl?: string }) => void;
};

export function PublishPosterIntake({ blankCanvas, onBack, onComplete }: Props) {
  const t = useActiveTranslator();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [cta, setCta] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  return (
    <div className="space-y-4" data-testid="publish-poster-intake">
      <p className="text-sm text-white/80">
        {blankCanvas ? t("publish.poster.blankLead" as never) : t("publish.poster.lead" as never)}
      </p>
      <label className="block text-sm text-white">
        {t("publish.poster.titleLabel" as never)}
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="hc-stable-field mt-1 w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-white" />
      </label>
      <label className="block text-sm text-white">
        {t("publish.poster.subtitleLabel" as never)}
        <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="hc-stable-field mt-1 w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-white" />
      </label>
      <label className="block text-sm text-white">
        {t("publish.poster.ctaLabel" as never)}
        <input value={cta} onChange={(e) => setCta(e.target.value)} className="hc-stable-field mt-1 w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-white" />
      </label>
      <label className="block text-sm text-white">
        {t("publish.poster.logoLabel" as never)}
        <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://" className="hc-stable-field mt-1 w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-white" />
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={onBack} className={studioVisual.btnOutline}>{t("editor.flow.back" as never)}</button>
        <button
          type="button"
          disabled={!title.trim()}
          onClick={() => onComplete({ title: title.trim(), subtitle: subtitle.trim(), cta: cta.trim(), logoUrl: logoUrl.trim() || undefined })}
          className={`disabled:opacity-40 ${studioVisual.btnGradientPrimary}`}
        >
          {t("publish.poster.create" as never)}
        </button>
      </div>
    </div>
  );
}
