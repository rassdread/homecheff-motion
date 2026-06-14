"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BriefV4SelectionCards } from "@/components/studio/brief-v4-selection-cards";
import { StudioBuildStoryPanel } from "@/components/studio/studio-build-story-panel";
import { StudioStoryInterpretationPanel } from "@/components/studio/studio-story-interpretation-panel";
import { StudioCharacterWizardPanel } from "@/components/studio/studio-character-wizard-panel";
import { StudioConfirmStoryboardPanel } from "@/components/studio/studio-confirm-storyboard-panel";
import { StudioGenerateMissingAssetsPanel } from "@/components/studio/studio-generate-missing-assets-panel";
import { persistWizardConceptToHc } from "@/lib/studio-brief-asset-wizards";
import { persistHcProjectWithSync } from "@/lib/homecheff-project-sync";
import { StudioProductionRoutePicker } from "@/components/studio/studio-production-route-picker";
import { buildStoryPlanFromBrief } from "@/lib/studio-build-story-plan";
import { briefSelectionsToIdeaEnrichment } from "@/lib/studio-production-brief-selection";
import { persistHcWorkflowV2WithSync } from "@/lib/hc-workflow-persist";
import { storeStudioWorkflowInHc } from "@/lib/hc-workflow-v2";
import { loadHcProjectFromQuery } from "@/lib/homecheff-project-open";
import { loadHomeCheffProject } from "@/lib/homecheff-project-persist";
import type { StudioProductionRoute, StudioStoryPlan } from "@/types/studio-production-brief-v3";
import { DEFAULT_BRIEF_V4_SELECTIONS, type StudioProductionBriefV4Selections } from "@/types/studio-production-brief-v4";
import { resolveEditorStudioEntry } from "@/lib/editor-studio-entry";
import { GradientButton } from "@/components/ui/gradient-button";
import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { buildProductionBrief } from "@/lib/studio-production-brief-builder";
import { createStoryboardFromProductionBrief } from "@/lib/studio-create-story-from-brief-client";
import {
  applyAssetDecision,
  buildIdentityPrefillFromDecision,
  defaultDecisionModeForProposal,
  getAssetDecision,
} from "@/lib/studio-asset-decision-execution";
import {
  assetLifecycleStatusClass,
  assetLifecycleStatusLabelKey,
} from "@/lib/studio-asset-lifecycle-resolver";
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
import { StudioProductionMemoryPanel } from "@/components/studio/studio-production-memory-panel";
import { StudioAiEverythingPanel } from "@/components/studio/studio-ai-everything-panel";

type FlowStep = "idea" | "brief" | "build_story" | "route" | "preview";

const EXAMPLE_KEYS = [
  "studio.directorProposal.example.homecheffGarden",
  "studio.directorProposal.example.affiliateAfrica",
  "studio.directorProposal.example.pixarChef",
  "studio.directorProposal.example.localDesigner",
  "studio.directorProposal.example.restaurantPromo",
] as const satisfies readonly TranslationKey[];

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
              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${assetLifecycleStatusClass(decision)}`}
            >
              {t(assetLifecycleStatusLabelKey(decision) as TranslationKey)}
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

function BriefSummary({
  brief,
  projectMemory,
  characters,
  worlds,
}: {
  brief: StudioProductionBrief;
  projectMemory?: StudioProjectMemorySnapshot;
  characters?: StudioCharacterListItem[];
  worlds?: StudioWorldProfileListItem[];
}) {
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

      {projectMemory ?
        <StudioProductionMemoryPanel
          memory={projectMemory}
          currentIdea={brief.idea}
          characters={characters}
          worlds={worlds}
          guidance={brief.productionMemoryGuidance}
        />
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
  const [locale] = useLocale();
  const searchParams = useSearchParams();
  const editorSessionId = searchParams.get("editorSession")?.trim() ?? "";
  const hcProjectId = searchParams.get("hcProject")?.trim() ?? "";
  const [step, setStep] = useState<FlowStep>("idea");
  const [idea, setIdea] = useState("");
  const [selections, setSelections] = useState<StudioProductionBriefV4Selections>(DEFAULT_BRIEF_V4_SELECTIONS);
  const [storyPlan, setStoryPlan] = useState<StudioStoryPlan | null>(null);
  const [productionRoute, setProductionRoute] = useState<StudioProductionRoute>("mixed");
  const [showCharacterWizard, setShowCharacterWizard] = useState(false);
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
    if (!editorSessionId) {
      return;
    }
    const entry = resolveEditorStudioEntry(editorSessionId);
    if (!entry) {
      return;
    }
    const referenceLines = [
      entry.primaryImageUrl,
      ...entry.compositorLayerUrls,
      ...entry.placementUrls,
    ].filter(Boolean);
    const seed = [
      entry.document.name,
      "",
      "Imported from HomeCheff Editor:",
      ...referenceLines.map((url) => `- ${url}`),
    ].join("\n");
    queueMicrotask(() => {
      setIdea((prev) => (prev.trim() ? prev : seed));
    });
  }, [editorSessionId]);

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

  const [hcProjectLocal, setHcProjectLocal] = useState<ReturnType<typeof loadHomeCheffProject>>(null);

  const hcProject = useMemo(() => {
    if (hcProjectLocal) return hcProjectLocal;
    const fromQuery = loadHcProjectFromQuery(searchParams);
    if (fromQuery) return fromQuery;
    if (hcProjectId) return loadHomeCheffProject(hcProjectId);
    return null;
  }, [hcProjectId, hcProjectLocal, searchParams]);

  const persistWorkflow = useCallback(
    (studio: Parameters<typeof storeStudioWorkflowInHc>[1]) => {
      if (!hcProject) return;
      const next = storeStudioWorkflowInHc(hcProject, studio);
      persistHcWorkflowV2WithSync(next, {});
    },
    [hcProject]
  );

  const handleBuildBrief = useCallback(() => {
    setError("");
    const enrichedIdea = briefSelectionsToIdeaEnrichment(idea, selections);
    const built = buildProductionBrief({
      idea: enrichedIdea,
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
    const withSelections = {
      ...built,
      userSelections: selections,
      estimatedDurationSeconds: built.estimatedDurationSeconds,
    };
    setBrief(withSelections);
    setDecisionRegistry(loadAssetDecisionRegistry({ briefIdea: idea }));
    persistWorkflow({
      phase: "plan",
      idea,
      briefSelections: selections,
      goal: selections.goals.join(", "),
      targetAudience: selections.audience.join(", "),
    });
    setStep("brief");
  }, [idea, selections, characters, locations, props, worlds, projectMemory, persistWorkflow, t]);

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
    const briefWithPlan = {
      ...brief,
      userSelections: selections,
      storyPlan: storyPlan ?? undefined,
      productionRoute,
    };
    const result = await createStoryboardFromProductionBrief({
      brief: briefWithPlan,
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
  }, [brief, selections, storyPlan, productionRoute, decisionRegistry, characters, locations, props, worlds, projectMemory, t]);

  const stepNumber = (s: FlowStep) => {
    const order: FlowStep[] = ["idea", "brief", "build_story", "route", "preview"];
    return String(order.indexOf(s) + 1);
  };

  const stepTitle = (s: FlowStep) => {
    if (s === "idea") return t("studio.productionBrief.idea.title");
    if (s === "brief") return t("studio.productionBrief.brief.title");
    if (s === "build_story") return t("studio.buildStory.title" as never);
    if (s === "route") return t("studio.productionRoute.title" as never);
    return t("studio.productionBrief.preview.confirmTitle");
  };

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
                step: stepNumber(step),
                total: "5",
              })}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-zinc-900">{stepTitle(step)}</h1>
            <p className="mt-2 text-sm text-zinc-600">
              {step === "idea"
                ? t("studio.productionBrief.idea.subtitle")
                : step === "brief"
                  ? t("studio.productionBrief.brief.subtitle")
                  : step === "build_story"
                    ? t("studio.buildStory.subtitle" as never)
                    : step === "route"
                      ? t("studio.productionRoute.lead" as never)
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
              <BriefV4SelectionCards selections={selections} onChange={setSelections} />
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
              <BriefSummary
                brief={brief}
                projectMemory={projectMemory}
                characters={characters}
                worlds={worlds}
              />

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
                <GradientButton
                  type="button"
                  onClick={() => {
                    if (!brief) return;
                    if (selections.aiEverythingMode) {
                      const plan = buildStoryPlanFromBrief({ brief, selections, locale });
                      setStoryPlan(plan);
                      persistWorkflow({ phase: "plan", storyPlan: plan });
                      setProductionRoute("asset_first");
                      setStep("preview");
                    } else {
                      setStoryPlan(null);
                      setStep("build_story");
                    }
                  }}
                  className="sm:w-auto"
                >
                  {selections.aiEverythingMode
                    ? t("studio.aiEverything.continue" as never)
                    : t("studio.buildStory.continue" as never)}
                </GradientButton>
              </div>
            </div>
          : null}

          {step === "build_story" && brief && !storyPlan ?
            <div className="space-y-6">
              <StudioStoryInterpretationPanel
                idea={idea}
                selections={selections}
                locale={locale}
                onPlanReady={(plan) => {
                  setStoryPlan(plan);
                  persistWorkflow({ phase: "plan", storyPlan: plan });
                }}
              />
              <button
                type="button"
                onClick={() => setStep("brief")}
                className="rounded-full border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                {t("studio.productionBrief.back")}
              </button>
            </div>
          : null}

          {step === "build_story" && storyPlan ?
            <div className="space-y-6">
              <StudioBuildStoryPanel plan={storyPlan} />
              {showCharacterWizard ?
                <StudioCharacterWizardPanel
                  onComplete={(concept) => {
                    if (hcProject) {
                      const next = persistHcProjectWithSync(
                        persistWizardConceptToHc(hcProject, "character", concept),
                        { syncToServer: true }
                      );
                      setHcProjectLocal(next);
                    }
                    setShowCharacterWizard(false);
                  }}
                />
              : (
                <button
                  type="button"
                  onClick={() => setShowCharacterWizard(true)}
                  className="text-sm font-semibold text-[#006D52] hover:underline"
                >
                  {t("studio.characterWizard.open" as never)}
                </button>
              )}
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => setStep("brief")} className="rounded-full border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                  {t("studio.productionBrief.back")}
                </button>
                <GradientButton type="button" onClick={() => setStep("route")} className="sm:w-auto">
                  {t("editor.flow.continue" as never)}
                </GradientButton>
              </div>
            </div>
          : null}

          {step === "route" && storyPlan ?
            <div className="space-y-6">
              <StudioProductionRoutePicker
                storyPlan={storyPlan}
                value={productionRoute}
                onChange={setProductionRoute}
                aiEverythingMode={selections.aiEverythingMode}
              />
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => setStep("build_story")} className="rounded-full border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                  {t("studio.productionBrief.back")}
                </button>
                <GradientButton
                  type="button"
                  onClick={() => {
                    persistWorkflow({ phase: "approve", productionRoute, storyPlan });
                    setStep("preview");
                  }}
                  className="sm:w-auto"
                >
                  {t("editor.flow.continue" as never)}
                </GradientButton>
              </div>
            </div>
          : null}

          {step === "preview" && brief && storyPlan ?
            <div className="space-y-6">
              {selections.aiEverythingMode ?
                <StudioAiEverythingPanel
                  brief={brief}
                  selections={selections}
                  hcProject={hcProject}
                  storyPlan={storyPlan}
                  onPlanReady={(_plan, nextPlan) => {
                    setStoryPlan(nextPlan);
                    persistWorkflow({ phase: "generate", storyPlan: nextPlan, productionRoute: "asset_first" });
                    setProductionRoute("asset_first");
                  }}
                  onComplete={() => void handleCreateStory()}
                />
              : null}
              <StudioConfirmStoryboardPanel
                brief={brief}
                selections={selections}
                storyPlan={storyPlan}
                onStoryPlanChange={setStoryPlan}
                onRegenerateAll={() => {
                  if (!brief) return;
                  setStoryPlan(buildStoryPlanFromBrief({ brief, selections }));
                }}
              />
              {storyPlan ?
                <StudioGenerateMissingAssetsPanel
                  storyPlan={storyPlan}
                  hcProject={hcProject}
                  onProjectChange={setHcProjectLocal}
                />
              : null}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStep("route")}
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
