"use client";

import { useCallback, useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import {
  applyDirectorProposal,
  resolveProposedSceneText,
} from "@/lib/studio-director-proposal-apply";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioStoryboardDetail,
} from "@/types/studio-api";
import type {
  DirectorProposalApplyMode,
  StudioDirectorProposal,
} from "@/types/studio-director-proposal";

type Props = {
  storyboard: StudioStoryboardDetail;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  canModify?: boolean;
  onApplied?: () => void | Promise<void>;
};

const EXAMPLE_KEYS = [
  "studio.directorProposal.example.homecheffGarden",
  "studio.directorProposal.example.affiliateAfrica",
  "studio.directorProposal.example.pixarChef",
  "studio.directorProposal.example.localDesigner",
  "studio.directorProposal.example.restaurantPromo",
] as const satisfies readonly TranslationKey[];

function collectUniqueAssets(proposal: StudioDirectorProposal) {
  const characters = new Map<string, string>();
  const locations = new Map<string, string>();
  const propItems = new Map<string, string>();
  const newCharacters: Array<{ name: string; reasonKey: string }> = [];
  const newLocations: Array<{ name: string; reasonKey: string }> = [];
  const newProps: Array<{ name: string; reasonKey: string }> = [];

  for (const scene of proposal.scenes) {
    for (const ref of scene.characterRefs) {
      characters.set(ref.existingId, ref.name);
    }
    for (const ref of scene.propRefs) {
      propItems.set(ref.existingId, ref.name);
    }
    if (scene.locationRef) {
      locations.set(scene.locationRef.existingId, scene.locationRef.name);
    }
    for (const item of scene.proposedCharacters) {
      newCharacters.push({ name: item.name, reasonKey: item.reasonKey });
    }
    if (scene.proposedLocation) {
      newLocations.push({
        name: scene.proposedLocation.name,
        reasonKey: scene.proposedLocation.reasonKey,
      });
    }
    for (const item of scene.proposedProps) {
      newProps.push({ name: item.name, reasonKey: item.reasonKey });
    }
  }

  return {
    characters: [...characters.values()],
    locations: [...locations.values()],
    props: [...propItems.values()],
    newCharacters,
    newLocations,
    newProps,
  };
}

function ProposalPreviewModal({
  proposal,
  busy,
  feedback,
  onClose,
  onApply,
  onRegenerate,
}: {
  proposal: StudioDirectorProposal;
  busy?: boolean;
  feedback?: string;
  onClose: () => void;
  onApply: (mode: DirectorProposalApplyMode) => void;
  onRegenerate: () => void;
}) {
  const t = useActiveTranslator();
  const assets = useMemo(() => collectUniqueAssets(proposal), [proposal]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="director-proposal-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-white shadow-xl sm:rounded-2xl">
        <header className="border-b border-zinc-100 px-4 py-4 sm:px-5">
          <h2 id="director-proposal-title" className="text-lg font-semibold text-zinc-900">
            {t("studio.directorProposal.preview.title")}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            {t("studio.directorProposal.preview.quality", {
              score: String(proposal.directorQualityScore),
            })}
          </p>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-5">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.directorProposal.preview.storyArc")}
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-zinc-700">
              <li>{t(proposal.storyArc.beginningKey as TranslationKey, proposal.storyArc.topicParams)}</li>
              <li>{t(proposal.storyArc.middleKey as TranslationKey, proposal.storyArc.topicParams)}</li>
              <li>{t(proposal.storyArc.endKey as TranslationKey, proposal.storyArc.topicParams)}</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.directorProposal.preview.scenes")}
            </h3>
            <ul className="mt-2 space-y-2">
              {proposal.scenes.map((scene) => {
                const copy = resolveProposedSceneText(scene, t);
                return (
                  <li
                    key={scene.tempId}
                    className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm"
                  >
                    <p className="font-medium text-zinc-900">
                      {t("studio.directorProposal.preview.sceneLine", {
                        index: String(scene.order + 1),
                        title: copy.title,
                      })}
                    </p>
                    <p className="text-zinc-600">{copy.description}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {t("studio.directorProposal.preview.shotLine", {
                        shot: t(`studio.director.shot.${scene.shotType}` as TranslationKey),
                        movement: t(
                          `studio.director.movement.${scene.cameraMovement}` as TranslationKey
                        ),
                        energy: t(`studio.director.energy.${scene.sceneEnergy}` as TranslationKey),
                      })}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <AssetList
              title={t("studio.directorProposal.preview.characters")}
              existing={assets.characters}
              proposed={assets.newCharacters}
            />
            <AssetList
              title={t("studio.directorProposal.preview.locations")}
              existing={assets.locations}
              proposed={assets.newLocations}
            />
            <AssetList
              title={t("studio.directorProposal.preview.props")}
              existing={assets.props}
              proposed={assets.newProps}
            />
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t("studio.directorProposal.preview.camera")}
              </h3>
              <p className="mt-2 text-sm text-zinc-700">
                {t(`studio.director.shot.${proposal.camera.dominantShotType}` as TranslationKey)} ·{" "}
                {t(
                  `studio.director.movement.${proposal.camera.dominantMovement}` as TranslationKey
                )}
              </p>
              <p className="text-xs text-zinc-500">
                {t(proposal.camera.framingKey as TranslationKey)}
              </p>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t("studio.directorProposal.preview.emotion")}
              </h3>
              <p className="mt-2 text-sm text-zinc-700">
                {proposal.emotion.moodKeywords
                  .map((m) => t(`studio.aiDirector.mood.${m}` as TranslationKey))
                  .join(" · ")}
              </p>
              <p className="text-xs text-zinc-500">
                {t(proposal.emotion.energyProfileKey as TranslationKey)}
              </p>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t("studio.directorProposal.preview.voice")}
              </h3>
              <p className="mt-2 text-sm text-zinc-700">
                {t(proposal.audio.voiceProfileLabelKey as TranslationKey)}
              </p>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t("studio.directorProposal.preview.music")}
              </h3>
              <p className="mt-2 text-sm text-zinc-700">
                {t(proposal.audio.musicProfileLabelKey as TranslationKey)} ·{" "}
                {proposal.audio.musicIntensity}
              </p>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t("studio.directorProposal.preview.sound")}
              </h3>
              <p className="mt-2 text-sm text-zinc-700">
                {t(proposal.audio.soundProfileLabelKey as TranslationKey)} ·{" "}
                {proposal.audio.soundDensity}
              </p>
            </div>
          </section>
        </div>

        {feedback ?
          <p className="border-t border-zinc-100 px-4 py-2 text-sm text-emerald-700 sm:px-5">{feedback}</p>
        : null}

        <footer className="flex flex-col gap-2 border-t border-zinc-100 px-4 py-4 sm:flex-row sm:flex-wrap sm:px-5">
          <button
            type="button"
            disabled={busy}
            onClick={() => onApply("all")}
            className="rounded-lg bg-[#006D52] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? t("studio.directorProposal.apply.busy") : t("studio.directorProposal.apply.all")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onApply("scenes")}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 disabled:opacity-60"
          >
            {t("studio.directorProposal.apply.scenes")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onApply("assets")}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 disabled:opacity-60"
          >
            {t("studio.directorProposal.apply.assets")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onRegenerate}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 disabled:opacity-60"
          >
            {t("studio.directorProposal.apply.regenerate")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 disabled:opacity-60"
          >
            {t("studio.directorProposal.apply.cancel")}
          </button>
        </footer>
      </div>
    </div>
  );
}

function AssetList({
  title,
  existing,
  proposed,
}: {
  title: string;
  existing: string[];
  proposed: Array<{ name: string; reasonKey: string }>;
}) {
  const t = useActiveTranslator();
  if (existing.length === 0 && proposed.length === 0) {
    return null;
  }
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h3>
      <ul className="mt-2 space-y-1 text-sm text-zinc-700">
        {existing.map((name) => (
          <li key={`existing-${name}`}>
            {t("studio.directorProposal.preview.existingAsset", { name })}
          </li>
        ))}
        {proposed.map((item) => (
          <li key={`new-${item.name}`} className="text-amber-800">
            {t("studio.directorProposal.preview.newAsset", { name: item.name })}{" "}
            <span className="text-xs text-zinc-500">
              ({t("studio.directorProposal.preview.newAssetHint")})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StudioDirectorProposalFlow({
  storyboard,
  characters,
  locations,
  props,
  canModify,
  onApplied,
}: Props) {
  const t = useActiveTranslator();
  const [idea, setIdea] = useState(storyboard.aiDirectorPrompt ?? "");
  const [proposal, setProposal] = useState<StudioDirectorProposal | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  const handleGenerate = useCallback(() => {
    const built = buildDirectorProposal({
      idea,
      storyboard,
      characters,
      locations,
      props,
    });
    if (!built) {
      return;
    }
    setProposal(built);
    setPreviewOpen(true);
    setFeedback("");
  }, [idea, storyboard, characters, locations, props]);

  const handleApply = useCallback(
    async (mode: DirectorProposalApplyMode) => {
      if (!canModify || !proposal) {
        return;
      }
      setBusy(true);
      setFeedback("");
      try {
        const result = await applyDirectorProposal({
          storyboardId: storyboard.id,
          proposal,
          mode,
          existingScenes: storyboard.scenes,
          t,
        });
        const messages = [t("studio.directorProposal.apply.success")];
        if (result.skippedNewAssets > 0) {
          messages.push(
            t("studio.directorProposal.apply.partialNewAssets", {
              count: String(result.skippedNewAssets),
            })
          );
        }
        setFeedback(messages.join(" "));
        if (result.ok) {
          await onApplied?.();
          if (mode !== "assets") {
            setPreviewOpen(false);
          }
        }
      } finally {
        setBusy(false);
      }
    },
    [canModify, onApplied, proposal, storyboard.id, storyboard.scenes, t]
  );

  return (
    <>
      <section className="mb-4 rounded-2xl border border-[#0067B1]/20 bg-gradient-to-br from-[#0067B1]/5 to-[#006D52]/5 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-zinc-900">
          {t("studio.directorProposal.title")}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.directorProposal.subtitle")}</p>

        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          disabled={!canModify || busy}
          rows={3}
          placeholder={t("studio.directorProposal.placeholder")}
          className="mt-3 w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#0067B1] focus:outline-none focus:ring-1 focus:ring-[#0067B1]"
        />

        <div className="mt-2 flex flex-wrap gap-2">
          <span className="w-full text-[10px] font-semibold uppercase tracking-wide text-zinc-500 sm:w-auto sm:py-1">
            {t("studio.directorProposal.examplesLabel")}
          </span>
          {EXAMPLE_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              disabled={!canModify || busy}
              onClick={() => setIdea(t(key))}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700 hover:border-[#0067B1]/40 disabled:opacity-60"
            >
              {t(key)}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={!canModify || busy || !idea.trim()}
          onClick={handleGenerate}
          className="mt-4 rounded-xl bg-[#0067B1] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ?
            t("studio.directorProposal.generating")
          : t("studio.directorProposal.generate")}
        </button>
      </section>

      {previewOpen && proposal ?
        <ProposalPreviewModal
          proposal={proposal}
          busy={busy}
          feedback={feedback}
          onClose={() => {
            setPreviewOpen(false);
            setFeedback("");
          }}
          onApply={(mode) => void handleApply(mode)}
          onRegenerate={() => {
            setFeedback("");
            handleGenerate();
          }}
        />
      : null}
    </>
  );
}
