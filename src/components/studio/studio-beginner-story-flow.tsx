"use client";

import { useState } from "react";
import { HomeCheffOrbitLoader } from "@/components/ui/homecheff-orbit-loader";
import { useActiveTranslator } from "@/i18n/client";
import {
  buildStudioStorylineFromIdea,
  rewriteStudioStoryline,
  type StudioGeneratedStoryline,
  type StudioStoryRewriteMode,
} from "@/lib/studio-story-generator";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  onAccept?: (story: StudioGeneratedStoryline) => void;
};

export function StudioBeginnerStoryFlow({ onAccept }: Props) {
  const t = useActiveTranslator();
  const [idea, setIdea] = useState("");
  const [busy, setBusy] = useState(false);
  const [story, setStory] = useState<StudioGeneratedStoryline | null>(null);

  const generate = async (mode: StudioStoryRewriteMode = "regenerate") => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 400));
    setStory(
      story && mode !== "regenerate"
        ? rewriteStudioStoryline(story, mode)
        : buildStudioStorylineFromIdea(idea)
    );
    setBusy(false);
  };

  if (busy) {
    return (
      <div className="flex justify-center py-12">
        <HomeCheffOrbitLoader state="generating" size="lg" message={t("studio.story.generating" as never)} />
      </div>
    );
  }

  if (!story) {
    return (
      <section className={`space-y-4 ${studioVisual.cardOnDarkMuted} p-5`} data-testid="studio-beginner-story-flow">
        <h2 className={`text-lg font-bold ${studioVisual.headingOnDark}`}>{t("studio.story.title" as never)}</h2>
        <p className={`text-sm ${studioVisual.bodyOnDark}`}>{t("studio.story.lead" as never)}</p>
        <label className="block">
          <span className={`text-xs font-semibold uppercase ${studioVisual.eyebrowOnDark}`}>{t("studio.story.ideaLabel" as never)}</span>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={4}
            className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
            placeholder={t("studio.story.ideaPlaceholder" as never)}
          />
        </label>
        <button
          type="button"
          disabled={!idea.trim()}
          className={`min-h-11 disabled:opacity-40 ${studioVisual.btnGradientPrimary}`}
          onClick={() => void generate("regenerate")}
        >
          {t("studio.story.generate" as never)}
        </button>
      </section>
    );
  }

  return (
    <section className={`space-y-4 ${studioVisual.cardOnDarkMuted} p-5`} data-testid="studio-beginner-story-review">
      <h2 className={`text-xl font-bold ${studioVisual.headingOnDark}`}>{story.title}</h2>
      <p className={`text-sm ${studioVisual.bodyOnDark}`}>{story.logline}</p>
      <p className={`text-sm ${studioVisual.bodyOnDark}`}>{story.summary}</p>
      <ul className="space-y-3">
        {story.scenes.map((scene) => (
          <li key={scene.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className={`text-sm font-semibold ${studioVisual.subheadingOnDark}`}>{scene.title}</p>
            <p className={`mt-1 text-xs ${studioVisual.bodyOnDark}`}>{scene.script}</p>
            <p className={`mt-1 text-xs italic ${studioVisual.bodyOnDark}`}>{scene.visualDescription}</p>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        {(["regenerate", "shorter", "commercial", "emotional", "cinematic"] as StudioStoryRewriteMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            className={`min-h-11 px-3 text-xs ${studioVisual.btnOutline}`}
            onClick={() => void generate(mode)}
          >
            {t(`studio.story.rewrite.${mode}` as never)}
          </button>
        ))}
        <button
          type="button"
          className={`min-h-11 ${studioVisual.btnGradientPrimary}`}
          onClick={() => onAccept?.(story)}
        >
          {t("studio.story.accept" as never)}
        </button>
      </div>
    </section>
  );
}
