"use client";

import { useMemo, useRef, useState } from "react";
import { HomeCheffAssetPickerModal, type AssetPickerSelection } from "@/components/library/homecheff-asset-picker-modal";
import { StudioBriefAssetWizardPanel, type BriefWizardKind } from "@/components/studio/studio-brief-asset-wizard-panel";
import { HomeCheffOrbitLoader } from "@/components/ui/homecheff-orbit-loader";
import { useActiveTranslator } from "@/i18n/client";
import { createHcAssetReference, upsertHcAssetReference } from "@/lib/hc-asset-references";
import { persistHcProjectWithSync } from "@/lib/homecheff-project-sync";
import {
  generateBriefAssetImage,
  persistGeneratedBriefAssetToHc,
  type BriefWizardConcept,
} from "@/lib/studio-brief-asset-generation";
import {
  buildMissingAssetRequirements,
  estimateMissingAssetCredits,
  type BriefAssetRequirement,
} from "@/lib/studio-brief-asset-wizards";
import { storeStudioWorkflowInHc } from "@/lib/hc-workflow-v2";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";
import type { StudioStoryPlan } from "@/types/studio-production-brief-v3";

type Props = {
  storyPlan: StudioStoryPlan;
  hcProject: HomeCheffProjectPackage | null;
  onProjectChange?: (project: HomeCheffProjectPackage) => void;
};

type AssetAction = "generate" | "library" | "upload" | "skip";

export function StudioGenerateMissingAssetsPanel({ storyPlan, hcProject, onProjectChange }: Props) {
  const t = useActiveTranslator();
  const fileRef = useRef<HTMLInputElement>(null);
  const [requirements, setRequirements] = useState<BriefAssetRequirement[]>(() =>
    buildMissingAssetRequirements({ storyPlan })
  );
  const [activeWizard, setActiveWizard] = useState<BriefWizardKind | null>(null);
  const [activeReqId, setActiveReqId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerReqId, setPickerReqId] = useState<string | null>(null);
  const [uploadReqId, setUploadReqId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  const pendingCredits = useMemo(() => estimateMissingAssetCredits(requirements), [requirements]);

  const persistProject = (project: HomeCheffProjectPackage) => {
    const saved = persistHcProjectWithSync(project, { syncToServer: true });
    onProjectChange?.(saved);
    return saved;
  };

  const patchRequirement = (id: string, patch: Partial<BriefAssetRequirement>) => {
    setRequirements((current) => current.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const linkAssetToHc = (req: BriefAssetRequirement, selection: AssetPickerSelection) => {
    if (!hcProject) return;
    const ref = createHcAssetReference({
      id: selection.id,
      url: selection.url ?? "",
      storageKey: selection.storageKey,
      kind: req.kind,
      role: selection.name,
      sourceService: "studio",
    });
    let next = upsertHcAssetReference(hcProject, ref);
    next = storeStudioWorkflowInHc(next, { phase: "generate" });
    persistProject(next);
    patchRequirement(req.id, {
      status: "linked",
      assetRefId: selection.id,
      thumbnailUrl: selection.url,
      source: "library",
    });
  };

  const runGeneration = async (req: BriefAssetRequirement, kind: BriefWizardKind, concept: BriefWizardConcept) => {
    if (!hcProject) return;
    setGenerating(true);
    setGenError("");
    const result = await generateBriefAssetImage({
      kind,
      concept,
      projectId: hcProject.id,
      workflowId: hcProject.workflowState.aiWorkflowV2 ? String(hcProject.id) : undefined,
    });
    setGenerating(false);
    if (!result.ok) {
      setGenError(result.error);
      return;
    }
    const next = persistGeneratedBriefAssetToHc(hcProject, result.asset);
    persistProject(next);
    patchRequirement(req.id, {
      status: "generated",
      assetRefId: result.asset.id,
      thumbnailUrl: result.asset.thumbnailUrl,
      provider: result.asset.provider,
      creditsUsed: result.asset.estimatedCredits,
      generatedPrompt: result.asset.generatedPrompt,
      source: result.asset.origin,
    });
    setActiveWizard(null);
    setActiveReqId(null);
  };

  const handleAction = (req: BriefAssetRequirement, action: AssetAction) => {
    if (action === "skip") {
      patchRequirement(req.id, { status: "skipped" });
      return;
    }
    if (action === "library") {
      setPickerReqId(req.id);
      setPickerOpen(true);
      return;
    }
    if (action === "upload") {
      setUploadReqId(req.id);
      fileRef.current?.click();
      return;
    }
    if (req.kind === "voice" || req.kind === "music") {
      if (!hcProject) return;
      const ref = createHcAssetReference({
        id: `stub_${req.kind}_${req.id}`,
        kind: req.kind,
        role: req.label,
        sourceService: "studio",
        url: "",
      });
      let next = upsertHcAssetReference(hcProject, ref);
      next = storeStudioWorkflowInHc(next, { phase: "generate" });
      persistProject(next);
      patchRequirement(req.id, { status: "generated", assetRefId: ref.id, source: "metadata" });
      return;
    }
    if (req.kind === "character" || req.kind === "location" || req.kind === "prop" || req.kind === "world") {
      setActiveReqId(req.id);
      setActiveWizard(req.kind);
      return;
    }
  };

  const handleUpload = async (file: File) => {
    if (!hcProject || !uploadReqId) return;
    const req = requirements.find((r) => r.id === uploadReqId);
    if (!req) return;
    const url = URL.createObjectURL(file);
    const ref = createHcAssetReference({
      id: `upload_${req.kind}_${req.id}`,
      url,
      kind: req.kind,
      role: file.name,
      sourceService: "studio",
      mimeType: file.type,
    });
    let next = upsertHcAssetReference(hcProject, ref);
    next = storeStudioWorkflowInHc(next, { phase: "generate" });
    persistProject(next);
    patchRequirement(req.id, {
      status: "linked",
      assetRefId: ref.id,
      thumbnailUrl: url,
      source: "upload",
    });
    setUploadReqId(null);
  };

  const missing = requirements.filter((r) => r.status === "missing");
  const activeReq = requirements.find((r) => r.id === activeReqId);

  return (
    <section className="space-y-4" data-testid="studio-generate-missing-assets">
      <header>
        <h3 className="text-sm font-semibold text-zinc-900">{t("studio.generateMissing.title" as never)}</h3>
        <p className="mt-1 text-xs text-zinc-500">{t("studio.generateMissing.subtitle" as never)}</p>
        {pendingCredits > 0 ?
          <p className="mt-2 text-xs font-medium text-amber-800">
            {t("studio.generateMissing.creditsEstimate" as never, { credits: pendingCredits } as never)}
          </p>
        : null}
      </header>

      {generating ?
        <HomeCheffOrbitLoader state="generating" size="md" message={t("studio.generateMissing.generating" as never)} />
      : null}

      {genError ?
        <p className="text-sm text-red-700">{genError}</p>
      : null}

      {activeWizard && activeReq ?
        <StudioBriefAssetWizardPanel
          kind={activeWizard}
          onComplete={(concept) => {
            void runGeneration(activeReq, activeWizard, concept);
          }}
          onCancel={() => {
            setActiveWizard(null);
            setActiveReqId(null);
          }}
        />
      : null}

      <ul className="space-y-2">
        {requirements.map((req) => (
          <li key={req.id} className="rounded-xl border border-zinc-200 bg-white p-3">
            <div className="flex flex-wrap items-start gap-3">
              {req.thumbnailUrl ?
                // eslint-disable-next-line @next/next/no-img-element
                <img src={req.thumbnailUrl} alt="" className="h-14 w-14 rounded-lg border object-cover" />
              : null}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900">{req.label}</p>
                <p className="text-xs text-zinc-500">
                  {req.kind} · {req.sceneIds.length} {t("studio.generateMissing.scenes" as never)}
                </p>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    req.status === "missing" ? "bg-amber-50 text-amber-800"
                    : req.status === "skipped" ? "bg-zinc-100 text-zinc-600"
                    : "bg-emerald-50 text-emerald-800"
                  }`}
                >
                  {t(`studio.generateMissing.status.${req.status}` as never)}
                </span>
                {req.provider ?
                  <p className="mt-1 text-[10px] text-zinc-500">
                    {t("studio.generateMissing.source" as never, { source: req.source ?? req.provider } as never)}
                    {req.creditsUsed != null ? ` · ${req.creditsUsed} credits` : ""}
                  </p>
                : null}
              </div>
              {req.status === "missing" && !generating ?
                <div className="flex flex-wrap gap-1">
                  {(["generate", "library", "upload", "skip"] as AssetAction[]).map((action) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => handleAction(req, action)}
                      className="rounded-full border border-zinc-200 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:border-[#006D52]"
                    >
                      {t(`studio.generateMissing.action.${action}` as never)}
                    </button>
                  ))}
                </div>
              : null}
            </div>
          </li>
        ))}
      </ul>

      {missing.length === 0 ?
        <p className="text-sm font-medium text-emerald-800">{t("studio.generateMissing.allReady" as never)}</p>
      : null}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleUpload(file);
          e.target.value = "";
        }}
      />

      <HomeCheffAssetPickerModal
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setPickerReqId(null);
        }}
        initialCategory={
          requirements.find((r) => r.id === pickerReqId)?.kind === "character" ? "characters"
          : requirements.find((r) => r.id === pickerReqId)?.kind === "location" ? "locations"
          : requirements.find((r) => r.id === pickerReqId)?.kind === "prop" ? "props"
          : requirements.find((r) => r.id === pickerReqId)?.kind === "world" ? "worlds"
          : "images"
        }
        onSelect={(asset) => {
          const req = requirements.find((r) => r.id === pickerReqId);
          if (req) linkAssetToHc(req, asset);
          setPickerOpen(false);
          setPickerReqId(null);
        }}
      />
    </section>
  );
}
