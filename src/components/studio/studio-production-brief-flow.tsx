"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GradientButton } from "@/components/ui/gradient-button";
import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { buildProductionBrief } from "@/lib/studio-production-brief-builder";
import { createStoryboardFromProductionBrief } from "@/lib/studio-create-story-from-brief-client";
import {
  applyAssetDecision,
  buildIdentityPrefillFromDecision,
  decisionStatusLabelKey,
  defaultDecisionModeForProposal,
  getAssetDecision,
} from "@/lib/studio-asset-decision-execution";
import {
  identityBuilderHref,
  storeIdentityBuilderPrefill,
} from "@/lib/studio-identity-builder-prefill-storage";
import {
  loadAssetDecisionRegistry,
  saveAssetDecisionRegistry,
} from "@/lib/studio-asset-decision-storage";
import { fetchStudioCharacters } from "@/lib/studio-characters-client";
import { fetchStudioLocations } from "@/lib/studio-locations-client";
import { fetchStudioProps } from "@/lib/studio-props-client";
import { fetchStudioWorlds } from "@/lib/studio-worlds-client";
import { fetchStudioProjectMemory } from "@/lib/studio-project-memory-client";
import { emptyProjectMemorySnapshot } from "@/lib/studio-project-memory-utils";
import { brand } from "@/lib/brand";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";
import type {
  ProductionBriefAssetProposal,
  StudioProductionBrief,
} from "@/types/studio-production-brief";
import type { AssetDecisionMode, StudioAssetDecisionRegistry } from "@/types/studio-asset-decision";

type FlowStep = "idea" | "brief" | "preview";

const EXAMPLE_KEYS = [
  "studio.directorProposal.example.homecheffGarden",
  "studio.directorProposal.example.affiliateAfrica",
  "studio.directorProposal.example.pixarChef",
  "studio.directorProposal.example.localDesigner",
  "studio.directorProposal.example.restaurantPromo",
] as const satisfies readonly TranslationKey[];

function decisionStatusClass(mode: AssetDecisionMode): string {
  if (mode === "use_existing") {
    return "bg-emerald-50 text-emerald-800";
  }
  if (mode === "build_new") {
    return "bg-amber-50 text-amber-900";
  }
  return "bg-zinc-100 text-zinc-600";
}

function AssetProposalRow({
  asset,
  registry,
  ideaContext,
  onApplyDecision,
}: {
  asset: ProductionBriefAssetProposal;
  registry: StudioAssetDecisionRegistry;
  ideaContext: string;
  onApplyDecision: (mode: AssetDecisionMode) => void;
}) {
  const t = useActiveTranslator();
  const decision = getAssetDecision(registry, asset.id);
  const resolvedMode = decision?.mode ?? defaultDecisionModeForProposal(asset);

  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-zinc-900">{asset.name}</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {t(asset.reasonKey as TranslationKey, asset.reasonParams)}
          </p>
          {decision ?
            <span
              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${decisionStatusClass(decision.mode)}`}
            >
              {t(decisionStatusLabelKey(decision.mode) as TranslationKey)}
            </span>
          : null}
          {asset.recurringMatch ?
            <span className="mt-1 ml-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
              {t("studio.productionBrief.asset.recurringBadge")}
            </span>
          : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {asset.status === "existing" || asset.recurringMatch ?
            <button
              type="button"
              onClick={() => onApplyDecision("use_existing")}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                resolvedMode === "use_existing"
                  ? "bg-[#006D52] text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              {t("studio.productionBrief.asset.useExisting")}
            </button>
          : null}
          <Link
            href={identityBuilderHref(asset.kind, asset.id)}
            onClick={() => {
              onApplyDecision("build_new");
              storeIdentityBuilderPrefill(
                buildIdentityPrefillFromDecision({
                  decision: {
                    id: asset.id,
                    kind: asset.kind,
                    mode: "build_new",
                    name: asset.name,
                    existingId: asset.existingId,
                    decidedAt: new Date().toISOString(),
                    source: "production_brief",
                  },
                  ideaContext,
                })
              );
            }}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              resolvedMode === "build_new"
                ? "bg-[#006D52] text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            {t("studio.productionBrief.asset.buildNew")}
          </Link>
          <button
            type="button"
            onClick={() => onApplyDecision("skip")}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              resolvedMode === "skip"
                ? "bg-zinc-700 text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            {t("studio.productionBrief.asset.skip")}
          </button>
        </div>
      </div>
    </li>
  );
}

function BriefSummary({ brief }: { brief: StudioProductionBrief }) {
  const t = useActiveTranslator();

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">{t("studio.productionBrief.summary.goal")}</h3>
        <p className="mt-1 text-sm text-zinc-700">{brief.goal}</p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("studio.productionBrief.summary.contentType")}
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            {t(brief.contentTypeLabelKey as TranslationKey)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("studio.productionBrief.summary.duration")}
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            {t("studio.productionBrief.summary.durationValue", {
              seconds: String(brief.estimatedDurationSeconds),
            })}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("studio.productionBrief.summary.actionIntensity")}
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            {t(`studio.productionBrief.actionIntensity.${brief.actionIntensity}` as TranslationKey)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("studio.productionBrief.summary.style")}
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            {brief.targetStyle.moodKeywords.join(", ")}
          </p>
        </div>
      </div>

      {brief.world ?
        <section className="rounded-xl border border-zinc-200 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("studio.productionBrief.summary.world")}
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900">{brief.world.name}</p>
        </section>
      : null}

      {brief.recommendations.length > 0 ?
        <section>
          <h3 className="text-sm font-semibold text-zinc-900">
            {t("studio.productionBrief.recommendations.title")}
          </h3>
          <ul className="mt-2 space-y-1.5">
            {brief.recommendations.map((rec) => (
              <li key={rec.id} className="text-sm text-zinc-600">
                • {t(rec.messageKey as TranslationKey, rec.messageParams)}
              </li>
            ))}
          </ul>
        </section>
      : null}
    </div>
  );
}

function StoryPreview({ brief }: { brief: StudioProductionBrief }) {
  const t = useActiveTranslator();
  const preview = brief.storyPreview;

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
      <h3 className="text-base font-semibold text-zinc-900">
        {t("studio.productionBrief.preview.title")}
      </h3>
      <p className="mt-1 text-sm text-zinc-600">{t("studio.productionBrief.preview.subtitle")}</p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("studio.productionBrief.preview.scenes")}
          </dt>
          <dd className="text-lg font-semibold text-zinc-900">{preview.estimatedSceneCount}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("studio.productionBrief.preview.shots")}
          </dt>
          <dd className="text-lg font-semibold text-zinc-900">{preview.estimatedShotCount}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("studio.productionBrief.preview.duration")}
          </dt>
          <dd className="text-lg font-semibold text-zinc-900">
            {t("studio.productionBrief.summary.durationValue", {
              seconds: String(preview.estimatedDurationSeconds),
            })}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("studio.productionBrief.preview.characters")}
          </dt>
          <dd className="text-lg font-semibold text-zinc-900">{preview.mainCharacterCount}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("studio.productionBrief.preview.locations")}
          </dt>
          <dd className="text-lg font-semibold text-zinc-900">{preview.locationCount}</dd>
        </div>
      </dl>
    </section>
  );
}

export function StudioProductionBriefFlow() {
  const t = useActiveTranslator();
  const [step, setStep] = useState<FlowStep>("idea");
  const [idea, setIdea] = useState("");
  const [brief, setBrief] = useState<StudioProductionBrief | null>(null);
  const [decisionRegistry, setDecisionRegistry] = useState<StudioAssetDecisionRegistry>(() =>
    loadAssetDecisionRegistry({})
  );
  const [loadingLibraries, setLoadingLibraries] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [characters, setCharacters] = useState<StudioCharacterListItem[]>([]);
  const [locations, setLocations] = useState<StudioLocationListItem[]>([]);
  const [props, setProps] = useState<StudioPropListItem[]>([]);
  const [worlds, setWorlds] = useState<StudioWorldProfileListItem[]>([]);
  const [projectMemory, setProjectMemory] = useState<StudioProjectMemorySnapshot>(
    emptyProjectMemorySnapshot()
  );

  useEffect(() => {
    saveAssetDecisionRegistry(decisionRegistry);
  }, [decisionRegistry]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [charRes, locRes, propRes, worldRes, memoryRes] = await Promise.all([
        fetchStudioCharacters(),
        fetchStudioLocations(),
        fetchStudioProps(),
        fetchStudioWorlds(),
        fetchStudioProjectMemory(),
      ]);
      if (cancelled) return;
      if (charRes.ok) setCharacters(charRes.data.characters);
      if (locRes.ok) setLocations(locRes.data.locations);
      if (propRes.ok) setProps(propRes.data.props);
      if (worldRes.ok) setWorlds(worldRes.data.worlds);
      if (memoryRes.ok) setProjectMemory(memoryRes.data.memory);
      setLoadingLibraries(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const allAssetProposals = useMemo(() => {
    if (!brief) return [];
    return [...brief.mainCharacters, ...brief.recommendedLocations, ...brief.recommendedProps];
  }, [brief]);

  const handleBuildBrief = useCallback(() => {
    setError("");
    const built = buildProductionBrief({
      idea,
      characters,
      locations,
      props,
      worlds,
      projectMemory,
    });
    if (!built) {
      setError(t("studio.productionBrief.error.emptyIdea"));
      return;
    }
    setBrief(built);
    setDecisionRegistry(loadAssetDecisionRegistry({ briefIdea: idea }));
    setStep("brief");
  }, [idea, characters, locations, props, worlds, projectMemory, t]);

  const handleApplyAssetDecision = useCallback(
    (asset: ProductionBriefAssetProposal, mode: AssetDecisionMode) => {
      setDecisionRegistry((current) =>
        applyAssetDecision(current, {
          id: asset.id,
          kind: asset.kind,
          mode,
          name: asset.name,
          existingId: asset.existingId,
          source: "production_brief",
        })
      );
    },
    []
  );

  const handleCreateStory = useCallback(async () => {
    if (!brief) return;
    setCreating(true);
    setError("");
    const result = await createStoryboardFromProductionBrief({
      brief,
      assetDecisionRegistry: decisionRegistry,
      characters,
      locations,
      props,
      worlds,
      projectMemory,
      t: (key, params) => t(key as TranslationKey, params),
    });
    setCreating(false);
    if (result.ok) {
      window.location.href = result.href;
      return;
    }
    setError(result.error || t("studio.storyboards.error.saveFailed"));
  }, [brief, decisionRegistry, characters, locations, props, worlds, projectMemory, t]);

  return (
    <main className={`flex-1 ${brand.softGradientBg}`}>
      <section className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-6">
          <Link
            href="/studio/storyboards"
            className="text-sm font-medium text-[#006D52] hover:underline"
          >
            {t("studio.storyboards.backToLibrary")}
          </Link>
        </div>

        <AppCard className="bg-white p-6 sm:p-8">
          <header className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#006D52]">
              {t("studio.productionBrief.stepLabel", {
                step:
                  step === "idea" ? "1"
                  : step === "brief" ? "2"
                  : "3",
                total: "3",
              })}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
              {step === "idea"
                ? t("studio.productionBrief.idea.title")
                : step === "brief"
                  ? t("studio.productionBrief.brief.title")
                  : t("studio.productionBrief.preview.confirmTitle")}
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              {step === "idea"
                ? t("studio.productionBrief.idea.subtitle")
                : step === "brief"
                  ? t("studio.productionBrief.brief.subtitle")
                  : t("studio.productionBrief.preview.confirmSubtitle")}
            </p>
          </header>

          {step === "idea" ?
            <div className="space-y-4">
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                rows={5}
                placeholder={t("studio.productionBrief.idea.placeholder")}
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#006D52] focus:outline-none focus:ring-1 focus:ring-[#006D52]"
              />
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIdea(t(key))}
                    className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100"
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
              <GradientButton
                type="button"
                onClick={handleBuildBrief}
                disabled={!idea.trim() || loadingLibraries}
                loading={loadingLibraries}
                loadingLabel={t("studio.productionBrief.loading")}
                className="w-full sm:w-auto"
              >
                {t("studio.productionBrief.idea.continue")}
              </GradientButton>
            </div>
          : null}

          {step === "brief" && brief ?
            <div className="space-y-6">
              <BriefSummary brief={brief} />

              {allAssetProposals.length > 0 ?
                <section>
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {t("studio.productionBrief.assets.title")}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500">{t("studio.productionBrief.assets.subtitle")}</p>
                  <ul className="mt-3 space-y-2">
                    {allAssetProposals.map((asset) => (
                      <AssetProposalRow
                        key={asset.id}
                        asset={asset}
                        registry={decisionRegistry}
                        ideaContext={idea}
                        onApplyDecision={(mode) => handleApplyAssetDecision(asset, mode)}
                      />
                    ))}
                  </ul>
                </section>
              : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStep("idea")}
                  className="rounded-full border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  {t("studio.productionBrief.back")}
                </button>
                <GradientButton type="button" onClick={() => setStep("preview")} className="sm:w-auto">
                  {t("studio.productionBrief.brief.continue")}
                </GradientButton>
              </div>
            </div>
          : null}

          {step === "preview" && brief ?
            <div className="space-y-6">
              <StoryPreview brief={brief} />
              <BriefSummary brief={brief} />
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStep("brief")}
                  className="rounded-full border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  {t("studio.productionBrief.back")}
                </button>
                <GradientButton
                  type="button"
                  onClick={() => void handleCreateStory()}
                  loading={creating}
                  loadingLabel={t("studio.start.creatingStory")}
                  className="sm:w-auto"
                >
                  {t("studio.productionBrief.preview.createStoryboard")}
                </GradientButton>
              </div>
            </div>
          : null}

          {error ?
            <p className="mt-4 text-sm text-red-700">{error}</p>
          : null}
        </AppCard>
      </section>
    </main>
  );
}
