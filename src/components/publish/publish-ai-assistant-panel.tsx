"use client";

import { useMemo, useState } from "react";
import { HomeCheffOrbitLoader } from "@/components/ui/homecheff-orbit-loader";
import { useActiveTranslator } from "@/i18n/client";
import {
  buildPublishAiProposal,
  DEFAULT_PUBLISH_AI_ACCEPTANCE,
  type PublishAiAcceptance,
  type PublishAiProposal,
} from "@/lib/publish-ai-assistant";
import {
  loadPublishChangePlanFromMetadata,
  proposalToChangePlan,
  savePublishChangePlanToMetadata,
} from "@/lib/publish-change-plan-apply";
import { planHasPendingChanges } from "@/lib/publish-change-plan";
import type { PublishStorySceneBlock } from "@/lib/publish-story-proposal";
import { analyzePublishVideoFrames } from "@/lib/publish-video-analysis";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { PublishProject } from "@/types/publish-overlay";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";
import { syncPublishProjectToHc } from "@/lib/publish-hc-sync";
import { persistHcWorkflowV2WithSync } from "@/lib/hc-workflow-persist";
import { isPublishAiEverythingProject, runPublishAiEverythingPipeline } from "@/lib/publish-ai-everything";

type Props = {
  project: PublishProject;
  hcProject?: HomeCheffProjectPackage | null;
  onPlanSaved: (project: PublishProject) => void;
};

export function PublishAiAssistantPanel({ project, hcProject, onPlanSaved }: Props) {
  const t = useActiveTranslator();
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<PublishAiProposal | null>(null);
  const [scenes, setScenes] = useState<PublishStorySceneBlock[]>([]);
  const [acceptedSceneIds, setAcceptedSceneIds] = useState<Set<string>>(new Set());
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [acceptance, setAcceptance] = useState<PublishAiAcceptance>(DEFAULT_PUBLISH_AI_ACCEPTANCE);

  const existingPlan = useMemo(() => loadPublishChangePlanFromMetadata(project), [project]);
  const hasPending = existingPlan ? planHasPendingChanges(existingPlan) : false;

  const analyze = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 350));
    if (isPublishAiEverythingProject(project)) {
      const piped = runPublishAiEverythingPipeline({ project, hcProject });
      const prop = buildPublishAiProposal({ project: piped, hcProject });
      setProposal(prop);
      setScenes(prop.scenes);
      setAcceptedSceneIds(new Set(prop.scenes.map((s) => s.id)));
      onPlanSaved(piped);
      setBusy(false);
      return;
    }
    const prop = buildPublishAiProposal({ project, hcProject });
    setProposal(prop);
    setScenes(prop.scenes);
    setAcceptedSceneIds(new Set(prop.scenes.map((s) => s.id)));
    setBusy(false);
  };

  const regenerateScene = (sceneId: string) => {
    if (!proposal) return;
    const fresh = buildPublishAiProposal({ project, hcProject });
    const replacement = fresh.scenes.find((s) => s.id === sceneId) ?? fresh.scenes[0];
    if (!replacement) return;
    setScenes((current) =>
      current.map((s) => (s.id === sceneId ? { ...replacement, id: sceneId, index: s.index } : s))
    );
  };

  const savePlan = () => {
    if (!proposal) return;
    const activeScenes = scenes.filter((s) => acceptedSceneIds.has(s.id));
    const merged: PublishAiProposal = {
      ...proposal,
      scenes: activeScenes,
      overlayTexts: activeScenes.map((s) => ({
        id: s.id,
        text: s.overlayText,
        type: s.title.toLowerCase().includes("cta") ? "cta" : s.index === 1 ? "title" : "text",
        zoneHint: s.zoneId,
      })),
      subtitles: activeScenes.map((s) => ({
        id: `sub_${s.id}`,
        text: s.voiceLine,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
      voiceOverScript: activeScenes.map((s) => s.voiceLine).join(" "),
    };
    const plan = proposalToChangePlan(project.id, merged, acceptance);
    const next = savePublishChangePlanToMetadata(project, plan);
    if (hcProject) {
      const synced = syncPublishProjectToHc(hcProject, next, { changePlan: plan });
      persistHcWorkflowV2WithSync(synced, {});
    }
    onPlanSaved(next);
  };

  const analysis = analyzePublishVideoFrames({
    durationSec: project.durationSeconds || 5,
    hasExistingText: project.overlays.some((o) => o.text?.trim()),
  });

  if (busy) {
    return <HomeCheffOrbitLoader state="analyzing" size="md" message={t("publish.ai.analyzing" as never)} />;
  }

  return (
    <section className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50/80 p-4" data-testid="publish-ai-assistant">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-800">{t("publish.ai.title" as never)}</p>
        <p className="mt-1 text-sm text-sky-950">{t("publish.ai.lead" as never)}</p>
      </div>

      {!proposal ?
        <button type="button" onClick={() => void analyze()} className={`min-h-11 ${studioVisual.btnGradientPrimary}`}>
          {t("publish.ai.analyze" as never)}
        </button>
      : (
        <div className="space-y-3">
          {scenes.length > 0 ?
            <div className="space-y-2" data-testid="publish-ai-scene-blocks">
              {scenes.map((scene) => (
                <SceneBlockCard
                  key={scene.id}
                  scene={scene}
                  accepted={acceptedSceneIds.has(scene.id)}
                  editing={editingSceneId === scene.id}
                  onAccept={() => {
                    setAcceptedSceneIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(scene.id)) next.delete(scene.id);
                      else next.add(scene.id);
                      return next;
                    });
                  }}
                  onRegenerate={() => regenerateScene(scene.id)}
                  onEdit={() => setEditingSceneId(editingSceneId === scene.id ? null : scene.id)}
                  onRemove={() => {
                    setScenes((current) => current.filter((s) => s.id !== scene.id));
                    setAcceptedSceneIds((prev) => {
                      const next = new Set(prev);
                      next.delete(scene.id);
                      return next;
                    });
                  }}
                  onPatch={(patch) => {
                    setScenes((current) => current.map((s) => (s.id === scene.id ? { ...s, ...patch } : s)));
                  }}
                />
              ))}
            </div>
          : null}

          <ProposalRow
            label={t("publish.ai.field.music" as never)}
            value={proposal.musicDirection}
            checked={acceptance.music}
            onToggle={() => setAcceptance((a) => ({ ...a, music: !a.music }))}
          />
          <ProposalRow
            label={t("publish.ai.field.captions" as never)}
            value={proposal.socialCaptions.join(" · ")}
            checked={acceptance.captions}
            onToggle={() => setAcceptance((a) => ({ ...a, captions: !a.captions }))}
          />
          <p className="text-xs text-sky-900">
            {t("publish.ai.analysisHint" as never, { frames: analysis.sampledFrames } as never)}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={studioVisual.btnGradientPrimary} onClick={savePlan}>
              {t("publish.ai.savePlan" as never)}
            </button>
            <button type="button" className={studioVisual.btnOutline} onClick={() => void analyze()}>
              {t("publish.ai.regenerate" as never)}
            </button>
          </div>
        </div>
      )}

      {hasPending ?
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {t("publish.ai.pendingRender" as never)}
        </p>
      : null}
    </section>
  );
}

function SceneBlockCard({
  scene,
  accepted,
  editing,
  onAccept,
  onRegenerate,
  onEdit,
  onRemove,
  onPatch,
}: {
  scene: PublishStorySceneBlock;
  accepted: boolean;
  editing: boolean;
  onAccept: () => void;
  onRegenerate: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onPatch: (patch: Partial<PublishStorySceneBlock>) => void;
}) {
  const t = useActiveTranslator();
  return (
    <article className="rounded-xl border border-white/60 bg-white/90 p-3 text-sm" data-testid={`publish-scene-${scene.index}`}>
      <p className="text-xs font-bold uppercase tracking-wider text-sky-800">
        {t("publish.ai.scene.label" as never, { index: scene.index } as never)} · {scene.title}
      </p>
      {editing ?
        <div className="mt-2 space-y-2">
          <input
            value={scene.overlayText}
            onChange={(e) => onPatch({ overlayText: e.target.value })}
            className="hc-stable-field w-full rounded-lg border border-zinc-300 px-2 py-1 text-sm"
          />
          <textarea
            value={scene.voiceLine}
            onChange={(e) => onPatch({ voiceLine: e.target.value })}
            rows={2}
            className="hc-stable-field w-full rounded-lg border border-zinc-300 px-2 py-1 text-sm"
          />
        </div>
      : (
        <>
          <p className="mt-1 font-semibold text-zinc-900">{scene.overlayText}</p>
          <p className="mt-1 text-zinc-600">{scene.voiceLine}</p>
        </>
      )}
      <p className="mt-1 text-xs text-zinc-500">
        {scene.startTime.toFixed(1)}s – {scene.endTime.toFixed(1)}s · {scene.visualIntent}
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        <button type="button" onClick={onAccept} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${accepted ? "bg-emerald-100 text-emerald-900" : "bg-zinc-100 text-zinc-600"}`}>
          {t("publish.ai.scene.accept" as never)}
        </button>
        <button type="button" onClick={onRegenerate} className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-900">
          {t("publish.ai.scene.regenerate" as never)}
        </button>
        <button type="button" onClick={onEdit} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
          {t("publish.ai.scene.edit" as never)}
        </button>
        <button type="button" onClick={onRemove} className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-800">
          {t("publish.ai.scene.remove" as never)}
        </button>
      </div>
    </article>
  );
}

function ProposalRow({
  label,
  value,
  checked,
  onToggle,
}: {
  label: string;
  value: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex cursor-pointer gap-2 rounded-lg border border-white/60 bg-white/80 p-2 text-sm">
      <input type="checkbox" checked={checked} onChange={onToggle} className="mt-1" />
      <span>
        <span className="font-semibold text-zinc-800">{label}</span>
        <span className="mt-0.5 block text-zinc-600">{value}</span>
      </span>
    </label>
  );
}
