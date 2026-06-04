"use client";

import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import { buildSceneMemoryContinuityPrompt } from "@/lib/studio-memory-prompt";
import { studioSceneDetailToPromptInput } from "@/lib/studio-scene-to-prompt-input";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import type { StudioSceneDetail } from "@/types/studio-api";

type StudioSceneContinuityPreviewProps = {
  scene: StudioSceneDetail;
  styleProfile: StudioPromptStyleProfile;
};

export function StudioSceneContinuityPreview({
  scene,
  styleProfile,
}: StudioSceneContinuityPreviewProps) {
  const t = useActiveTranslator();
  const input = studioSceneDetailToPromptInput(scene, styleProfile);
  const bundle = input.memoryBundle;
  const instructions = bundle ? buildSceneMemoryContinuityPrompt(bundle) : "";

  return (
    <AppCard className="mt-4 p-4">
      <h3 className="text-sm font-semibold text-zinc-900">
        {t("studio.storyboards.continuityPreview.title")}
      </h3>
      <p className="mt-1 text-xs text-zinc-500">
        {t("studio.storyboards.continuityPreview.hint")}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <section>
          <h4 className="text-xs font-semibold uppercase text-zinc-500">
            {t("studio.storyboards.continuityPreview.characters")}
          </h4>
          <ul className="mt-1 list-inside list-disc text-sm text-zinc-800">
            {bundle?.characters.length
              ? bundle.characters.map((c) => (
                  <li key={c.id}>
                    {c.name}
                    {c.appearanceMemory.trim() ? ` — ${c.appearanceMemory.trim()}` : ""}
                  </li>
                ))
              : (
                <li className="list-none text-zinc-500">—</li>
              )}
          </ul>
        </section>
        <section>
          <h4 className="text-xs font-semibold uppercase text-zinc-500">
            {t("studio.storyboards.continuityPreview.location")}
          </h4>
          <p className="mt-1 text-sm text-zinc-800">
            {bundle?.location?.name ?? "—"}
            {bundle?.location?.visualIdentity.trim()
              ? ` — ${bundle.location.visualIdentity.trim()}`
              : ""}
          </p>
        </section>
        <section>
          <h4 className="text-xs font-semibold uppercase text-zinc-500">
            {t("studio.storyboards.continuityPreview.props")}
          </h4>
          <ul className="mt-1 list-inside list-disc text-sm text-zinc-800">
            {bundle?.props.length
              ? bundle.props.map((p) => <li key={p.id}>{p.name}</li>)
              : (
                <li className="list-none text-zinc-500">—</li>
              )}
          </ul>
        </section>
        <section>
          <h4 className="text-xs font-semibold uppercase text-zinc-500">
            {t("studio.storyboards.continuityPreview.world")}
          </h4>
          <p className="mt-1 text-sm text-zinc-800">{bundle?.world?.name ?? "—"}</p>
        </section>
      </div>

      <div className="mt-4">
        <h4 className="text-xs font-semibold uppercase text-zinc-500">
          {t("studio.storyboards.continuityPreview.instructions")}
        </h4>
        <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-zinc-50 p-3 text-xs text-zinc-800 whitespace-pre-wrap">
          {instructions || t("studio.storyboards.continuityPreview.empty")}
        </pre>
      </div>
    </AppCard>
  );
}
