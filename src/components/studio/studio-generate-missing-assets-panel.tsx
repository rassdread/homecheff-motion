"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HomeCheffAssetPickerModal, type AssetPickerSelection } from "@/components/library/homecheff-asset-picker-modal";
import {
  StudioAssetRequirementAudioFlow,
  type AudioFlowAttachPayload,
} from "@/components/studio/studio-asset-requirement-audio-flow";
import { StudioAssetRequirementDebugPanel } from "@/components/studio/studio-asset-requirement-debug-panel";
import { StudioBriefAssetWizardPanel, type BriefWizardKind } from "@/components/studio/studio-brief-asset-wizard-panel";
import { buildCharacterClusterHref, CHARACTER_CLUSTER_PATHS } from "@/lib/character-cluster-routes";
import { StudioAudioPreviewPlayer } from "@/components/studio/studio-audio-preview-player";
import { HomeCheffOrbitLoader } from "@/components/ui/homecheff-orbit-loader";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useActiveTranslator } from "@/i18n/client";
import { createHcAssetReference, upsertHcAssetReference } from "@/lib/hc-asset-references";
import { persistHcProjectWithSync } from "@/lib/homecheff-project-sync";
import {
  generateBriefAssetImage,
  persistGeneratedBriefAssetToHc,
  type BriefWizardConcept,
} from "@/lib/studio-brief-asset-generation";
import {
  briefWizardKindForRequirement,
  isAudioRequirementKind,
  isRequirementActionable,
  isVisualRequirementKind,
  pickerCategoryForRequirement,
  resolveGenerateEndpoint,
  STUDIO_ASSET_REQUIREMENT_ENDPOINTS,
  uploadAcceptForRequirement,
  type RequirementDebugEntry,
} from "@/lib/studio-asset-requirement-routing";
import { isCharacterRequirementKind } from "@/lib/studio-character-entry-actions";
import {
  loadBriefAssetRequirements,
  persistBriefAssetRequirements,
} from "@/lib/studio-asset-requirement-state";
import { uploadRequirementReference } from "@/lib/studio-asset-requirement-upload";
import {
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

function statusBadgeClass(status: BriefAssetRequirement["status"]): string {
  switch (status) {
    case "missing":
      return "bg-amber-50 text-amber-800";
    case "uploading":
    case "generating":
      return "bg-sky-50 text-sky-800";
    case "processing":
      return "bg-indigo-50 text-indigo-800";
    case "attached":
      return "bg-emerald-50 text-emerald-800";
    case "failed":
      return "bg-red-50 text-red-800";
    case "skipped":
      return "bg-zinc-100 text-zinc-600";
    default:
      return "bg-zinc-100 text-zinc-600";
  }
}

export function StudioGenerateMissingAssetsPanel({ storyPlan, hcProject, onProjectChange }: Props) {
  const t = useActiveTranslator();
  const router = useRouter();
  const auth = useAuthSession();
  const isAdmin = auth.resolved && auth.user?.role === "admin";
  const fileRef = useRef<HTMLInputElement>(null);
  const [requirements, setRequirements] = useState<BriefAssetRequirement[]>(() =>
    loadBriefAssetRequirements({ storyPlan, hcProject })
  );
  const [activeWizard, setActiveWizard] = useState<BriefWizardKind | null>(null);
  const [activeReqId, setActiveReqId] = useState<string | null>(null);
  const [activeAudioReqId, setActiveAudioReqId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerReqId, setPickerReqId] = useState<string | null>(null);
  const [uploadReqId, setUploadReqId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [actionError, setActionError] = useState("");
  const [debugEntry, setDebugEntry] = useState<RequirementDebugEntry | null>(null);
  const [justLinkedId, setJustLinkedId] = useState<string | null>(null);

  const pendingCredits = useMemo(() => estimateMissingAssetCredits(requirements), [requirements]);

  const recordDebug = useCallback((entry: RequirementDebugEntry) => {
    setDebugEntry(entry);
  }, []);

  const persistProject = useCallback(
    (project: HomeCheffProjectPackage, nextRequirements: BriefAssetRequirement[]) => {
      const withReqs = persistBriefAssetRequirements(project, nextRequirements);
      const saved = persistHcProjectWithSync(withReqs, { syncToServer: true });
      onProjectChange?.(saved);
      return saved;
    },
    [onProjectChange]
  );

  const patchRequirement = useCallback(
    (id: string, patch: Partial<BriefAssetRequirement>) => {
      setRequirements((current) => {
        const next = current.map((r) => (r.id === id ? { ...r, ...patch } : r));
        if (hcProject) {
          persistProject(hcProject, next);
        }
        return next;
      });
    },
    [hcProject, persistProject]
  );

  const requireHcProject = (): HomeCheffProjectPackage | null => {
    if (!hcProject) {
      setActionError(t("studio.generateMissing.hcRequired" as never));
      return null;
    }
    return hcProject;
  };

  const linkAssetToHc = (
    req: BriefAssetRequirement,
    selection: AssetPickerSelection,
    endpoint: string
  ) => {
    const project = requireHcProject();
    if (!project) return;

    const url = selection.url ?? selection.audioUrl ?? "";
    const ref = createHcAssetReference({
      id: selection.id,
      url,
      storageKey: selection.storageKey,
      kind: req.kind === "mascot" || req.kind === "team" ? "character" : req.kind,
      role: selection.name,
      sourceService: "studio",
      mimeType: selection.audioUrl ? "audio/mpeg" : undefined,
    });
    let next = upsertHcAssetReference(project, ref);
    next = storeStudioWorkflowInHc(next, { phase: "generate" });

    setRequirements((current) => {
      const updated = current.map((r) =>
        r.id === req.id
          ? {
              ...r,
              status: "attached" as const,
              assetRefId: selection.id,
              thumbnailUrl: selection.url,
              previewUrl: selection.audioUrl ?? selection.url,
              audioUrl: selection.audioUrl,
              source: "library",
              errorMessage: undefined,
            }
          : r
      );
      persistProject(next, updated);
      return updated;
    });

    setJustLinkedId(req.id);
    window.setTimeout(() => setJustLinkedId(null), 2500);
    recordDebug({
      action: `Open Library → Attach ${req.kind}`,
      endpoint,
      at: new Date().toISOString(),
      ok: true,
    });
  };

  const runGeneration = async (
    req: BriefAssetRequirement,
    kind: BriefWizardKind,
    concept: BriefWizardConcept,
    sourceReference?: { name: string; imageUrl: string }
  ) => {
    const project = requireHcProject();
    if (!project) return;

    const endpoint = STUDIO_ASSET_REQUIREMENT_ENDPOINTS.generateImage;
    recordDebug({
      action: `Generate ${req.kind}`,
      endpoint,
      at: new Date().toISOString(),
    });
    patchRequirement(req.id, { status: "generating", errorMessage: undefined });
    setGenerating(true);
    setGenError("");

    const result = await generateBriefAssetImage({
      kind,
      concept,
      projectId: project.id,
      workflowId: project.workflowState.aiWorkflowV2 ? String(project.id) : undefined,
      sourceReference,
    });
    setGenerating(false);

    if (!result.ok) {
      setGenError(result.error);
      patchRequirement(req.id, { status: "failed", errorMessage: result.error });
      recordDebug({
        action: `Generate ${req.kind}`,
        endpoint,
        at: new Date().toISOString(),
        ok: false,
        error: result.error,
      });
      return;
    }

    const next = persistGeneratedBriefAssetToHc(project, result.asset);
    setRequirements((current) => {
      const updated = current.map((r) =>
        r.id === req.id
          ? {
              ...r,
              status: "attached" as const,
              assetRefId: result.asset.id,
              thumbnailUrl: result.asset.thumbnailUrl,
              previewUrl: result.asset.referenceImageUrl,
              provider: result.asset.provider,
              creditsUsed: result.asset.estimatedCredits,
              generatedPrompt: result.asset.generatedPrompt,
              source: result.asset.origin,
              errorMessage: undefined,
            }
          : r
      );
      persistProject(next, updated);
      return updated;
    });
    setActiveWizard(null);
    setActiveReqId(null);
    recordDebug({
      action: `Generate ${req.kind}`,
      endpoint,
      at: new Date().toISOString(),
      ok: true,
    });
  };

  const handleAction = (req: BriefAssetRequirement, action: AssetAction) => {
    setActionError("");
    if (action === "skip") {
      patchRequirement(req.id, { status: "skipped" });
      recordDebug({
        action: `Skip ${req.kind}`,
        endpoint: "local://skip",
        at: new Date().toISOString(),
        ok: true,
      });
      return;
    }
    if (!requireHcProject()) {
      return;
    }
    if (action === "library") {
      setPickerReqId(req.id);
      setPickerOpen(true);
      recordDebug({
        action: `Open Library (${req.kind})`,
        endpoint: STUDIO_ASSET_REQUIREMENT_ENDPOINTS.characters,
        at: new Date().toISOString(),
      });
      return;
    }
    if (action === "upload" && isCharacterRequirementKind(req.kind)) {
      router.push(
        buildCharacterClusterHref("from-reference", {
          projectId: hcProject?.id,
          hcProject: hcProject?.id,
          projectTitle: hcProject?.title,
          requirementId: req.id,
        })
      );
      recordDebug({
        action: `Extract from photo (${req.kind})`,
        endpoint: CHARACTER_CLUSTER_PATHS["from-reference"],
        at: new Date().toISOString(),
      });
      return;
    }
    if (action === "upload") {
      setUploadReqId(req.id);
      fileRef.current?.click();
      recordDebug({
        action: `Upload Reference (${req.kind})`,
        endpoint: isAudioRequirementKind(req.kind)
          ? STUDIO_ASSET_REQUIREMENT_ENDPOINTS.uploadAudio
          : STUDIO_ASSET_REQUIREMENT_ENDPOINTS.uploadImage,
        at: new Date().toISOString(),
      });
      return;
    }
    if (isAudioRequirementKind(req.kind)) {
      setActiveAudioReqId(req.id);
      recordDebug({
        action: `Generate ${req.kind}`,
        endpoint: resolveGenerateEndpoint(req),
        at: new Date().toISOString(),
      });
      return;
    }
    const wizardKind = briefWizardKindForRequirement(req.kind);
    if (wizardKind === "character") {
      router.push(
        buildCharacterClusterHref("new", {
          projectId: hcProject?.id,
          hcProject: hcProject?.id,
          projectTitle: hcProject?.title,
          requirementId: req.id,
        })
      );
      recordDebug({
        action: `Generate ${req.kind}`,
        endpoint: CHARACTER_CLUSTER_PATHS.new,
        at: new Date().toISOString(),
      });
      return;
    }
    if (wizardKind) {
      setActiveReqId(req.id);
      setActiveWizard(wizardKind);
      recordDebug({
        action: `Generate ${req.kind}`,
        endpoint: STUDIO_ASSET_REQUIREMENT_ENDPOINTS.generateImage,
        at: new Date().toISOString(),
      });
    }
  };

  const handleUpload = async (file: File) => {
    const project = requireHcProject();
    if (!project || !uploadReqId) return;
    const req = requirements.find((r) => r.id === uploadReqId);
    if (!req) return;

    patchRequirement(req.id, { status: "uploading", errorMessage: undefined });
    const result = await uploadRequirementReference(file, req.kind);
    if (!result.ok) {
      patchRequirement(req.id, { status: "failed", errorMessage: result.error });
      setActionError(result.error);
      recordDebug({
        action: `Upload Reference (${req.kind})`,
        endpoint: result.endpoint,
        at: new Date().toISOString(),
        ok: false,
        error: result.error,
      });
      setUploadReqId(null);
      return;
    }

    const preview = result.asset.thumbnailUrl ?? result.asset.url;
    patchRequirement(req.id, {
      status: "processing",
      thumbnailUrl: preview,
      previewUrl: preview,
      audioUrl: result.asset.kind === "audio" ? result.asset.url : undefined,
      referenceStorageKey: result.asset.storageKey,
      source: "upload",
      referenceMode: undefined,
      errorMessage: undefined,
    });
    recordDebug({
      action: `Upload Reference (${req.kind})`,
      endpoint: result.asset.endpoint,
      at: new Date().toISOString(),
      ok: true,
    });
    setUploadReqId(null);
  };

  const attachReferenceOnly = (req: BriefAssetRequirement) => {
    const project = requireHcProject();
    if (!project || !req.previewUrl) return;
    const ref = createHcAssetReference({
      id: `upload_${req.kind}_${req.id}`,
      url: req.previewUrl,
      storageKey: req.referenceStorageKey,
      kind: isVisualRequirementKind(req.kind) ? (req.kind === "mascot" || req.kind === "team" ? "character" : req.kind) : req.kind,
      role: req.label,
      sourceService: "studio",
      mimeType: req.audioUrl ? "audio/mpeg" : "image/jpeg",
    });
    let next = upsertHcAssetReference(project, ref);
    next = storeStudioWorkflowInHc(next, { phase: "generate" });
    setRequirements((current) => {
      const updated = current.map((r) =>
        r.id === req.id
          ? { ...r, status: "attached" as const, assetRefId: ref.id, referenceMode: "reference_only" as const, source: "upload" }
          : r
      );
      persistProject(next, updated);
      return updated;
    });
    setJustLinkedId(req.id);
    window.setTimeout(() => setJustLinkedId(null), 2500);
    recordDebug({
      action: "Use as reference only",
      endpoint: "hc://asset-references",
      at: new Date().toISOString(),
      ok: true,
    });
  };

  const generateFromReference = (req: BriefAssetRequirement) => {
    if (isCharacterRequirementKind(req.kind)) {
      if (!req.previewUrl) {
        return;
      }
      router.push(
        buildCharacterClusterHref("from-reference", {
          projectId: hcProject?.id,
          hcProject: hcProject?.id,
          projectTitle: hcProject?.title,
          sourceImage: req.previewUrl,
          requirementId: req.id,
        })
      );
      recordDebug({
        action: "Generate from reference (character)",
        endpoint: CHARACTER_CLUSTER_PATHS["from-reference"],
        at: new Date().toISOString(),
      });
      return;
    }
    const wizardKind = briefWizardKindForRequirement(req.kind);
    if (!wizardKind || !req.previewUrl) return;
    setActiveReqId(req.id);
    setActiveWizard(wizardKind);
    patchRequirement(req.id, { referenceMode: "generate_from" });
    recordDebug({
      action: "Generate from reference",
      endpoint: STUDIO_ASSET_REQUIREMENT_ENDPOINTS.generateImage,
      at: new Date().toISOString(),
    });
  };

  const handleAudioAttach = (req: BriefAssetRequirement, payload: AudioFlowAttachPayload) => {
    const project = requireHcProject();
    if (!project) return;
    const ref = createHcAssetReference({
      id: payload.assetRefId,
      url: payload.audioUrl,
      kind: req.kind,
      role: req.label,
      sourceService: "studio",
      mimeType: "audio/mpeg",
    });
    let next = upsertHcAssetReference(project, ref);
    next = storeStudioWorkflowInHc(next, { phase: "generate" });
    setRequirements((current) => {
      const updated = current.map((r) =>
        r.id === req.id
          ? {
              ...r,
              status: "attached" as const,
              assetRefId: payload.assetRefId,
              previewUrl: payload.previewUrl,
              audioUrl: payload.audioUrl,
              provider: payload.provider,
              source: payload.source,
              cacheHit: payload.cacheHit,
              errorMessage: undefined,
            }
          : r
      );
      persistProject(next, updated);
      return updated;
    });
    setActiveAudioReqId(null);
    setJustLinkedId(req.id);
    window.setTimeout(() => setJustLinkedId(null), 2500);
  };

  const missing = requirements.filter((r) => r.status === "missing");
  const activeReq = requirements.find((r) => r.id === activeReqId);
  const activeAudioReq = requirements.find((r) => r.id === activeAudioReqId);
  const uploadAccept = uploadReqId
    ? uploadAcceptForRequirement(requirements.find((r) => r.id === uploadReqId)?.kind ?? "character")
    : "image/*";

  const requirementActionLabel = (req: BriefAssetRequirement, action: AssetAction) => {
    if (isCharacterRequirementKind(req.kind)) {
      if (action === "generate") return t("studio.generateMissing.action.createCharacter" as never);
      if (action === "upload") return t("studio.generateMissing.action.extractPhoto" as never);
      if (action === "library") return t("studio.generateMissing.action.library" as never);
    }
    return t(`studio.generateMissing.action.${action}` as never);
  };

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

      {!hcProject ?
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t("studio.generateMissing.hcRequired" as never)}
        </p>
      : null}

      {generating ?
        <HomeCheffOrbitLoader state="generating" size="md" message={t("studio.generateMissing.generating" as never)} />
      : null}

      {genError ?
        <p className="text-sm text-red-700">{genError}</p>
      : null}
      {actionError ?
        <p className="text-sm text-red-700">{actionError}</p>
      : null}

      {isAdmin ?
        <StudioAssetRequirementDebugPanel entry={debugEntry} />
      : null}

      {activeWizard && activeReq && activeWizard !== "character" ?
        <StudioBriefAssetWizardPanel
          kind={activeWizard}
          onComplete={(concept) => {
            const sourceRef =
              activeReq.referenceMode === "generate_from" && activeReq.previewUrl
                ? { name: activeReq.label, imageUrl: activeReq.previewUrl }
                : undefined;
            void runGeneration(activeReq, activeWizard, concept, sourceRef);
          }}
          onCancel={() => {
            setActiveWizard(null);
            setActiveReqId(null);
          }}
        />
      : null}

      {activeAudioReq ?
        <StudioAssetRequirementAudioFlow
          req={activeAudioReq}
          onAttach={(payload) => handleAudioAttach(activeAudioReq, payload)}
          onCancel={() => setActiveAudioReqId(null)}
          onDebug={recordDebug}
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
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadgeClass(req.status)}`}
                >
                  {t(`studio.generateMissing.status.${req.status}` as never)}
                </span>
                {justLinkedId === req.id ?
                  <span className="ml-1 inline-block text-[10px] font-semibold text-emerald-700">
                    ✓ {t("studio.generateMissing.linkedBadge" as never)}
                  </span>
                : null}
                {req.provider ?
                  <p className="mt-1 text-[10px] text-zinc-500">
                    {t("studio.generateMissing.source" as never, { source: req.source ?? req.provider } as never)}
                    {req.creditsUsed != null ? ` · ${req.creditsUsed} credits` : ""}
                    {req.cacheHit ? ` · ${t("studio.generateMissing.audio.cacheHit" as never)}` : ""}
                  </p>
                : null}
                {req.errorMessage ?
                  <p className="mt-1 text-[10px] text-red-700">{req.errorMessage}</p>
                : null}
                {req.audioUrl && req.status !== "missing" ?
                  <div className="mt-2 max-w-xs">
                    <StudioAudioPreviewPlayer
                      title={req.label}
                      audioUrl={req.audioUrl}
                      source={
                        req.kind === "voice"
                          ? req.cacheHit
                            ? "voice_library"
                            : "voice_tts"
                          : req.kind === "music"
                            ? "music_upload"
                            : "sfx_upload"
                      }
                      variant="compact"
                    />
                  </div>
                : null}
              </div>
              {isRequirementActionable(req.status) && !generating ?
                <div className="flex flex-wrap gap-1">
                  {(["generate", "library", "upload", "skip"] as AssetAction[]).map((action) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => handleAction(req, action)}
                      className="rounded-full border border-zinc-200 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:border-[#006D52]"
                      data-testid={`studio-asset-action-${req.id}-${action}`}
                    >
                      {requirementActionLabel(req, action)}
                    </button>
                  ))}
                </div>
              : null}
            </div>

            {req.status === "processing" && req.previewUrl ?
              <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3">
                <p className="text-xs font-medium text-indigo-900">
                  {t("studio.generateMissing.upload.processing" as never)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {isVisualRequirementKind(req.kind) ?
                    <button
                      type="button"
                      onClick={() => generateFromReference(req)}
                      className="rounded-full bg-[#006D52] px-3 py-1 text-[11px] font-semibold text-white"
                    >
                      {t("studio.generateMissing.upload.generateFrom" as never)}
                    </button>
                  : null}
                  <button
                    type="button"
                    onClick={() => attachReferenceOnly(req)}
                    className="rounded-full border border-indigo-300 px-3 py-1 text-[11px] font-semibold text-indigo-900"
                  >
                    {t("studio.generateMissing.upload.referenceOnly" as never)}
                  </button>
                </div>
              </div>
            : null}
          </li>
        ))}
      </ul>

      {missing.length === 0 ?
        <p className="text-sm font-medium text-emerald-800">{t("studio.generateMissing.allReady" as never)}</p>
      : null}

      <input
        ref={fileRef}
        type="file"
        accept={uploadAccept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleUpload(file);
          e.target.value = "";
        }}
      />

      <HomeCheffAssetPickerModal
        key={pickerReqId ?? "picker-closed"}
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setPickerReqId(null);
        }}
        initialCategory={
          pickerReqId
            ? pickerCategoryForRequirement(
                requirements.find((r) => r.id === pickerReqId)?.kind ?? "character"
              )
            : "images"
        }
        onSelect={(asset) => {
          const req = requirements.find((r) => r.id === pickerReqId);
          if (req) {
            const endpoint =
              asset.category === "voice"
                ? STUDIO_ASSET_REQUIREMENT_ENDPOINTS.voiceLibrary
                : asset.category === "music" || asset.category === "sfx"
                  ? STUDIO_ASSET_REQUIREMENT_ENDPOINTS.audioLibrary
                  : STUDIO_ASSET_REQUIREMENT_ENDPOINTS.characters;
            linkAssetToHc(req, asset, endpoint);
          }
          setPickerOpen(false);
          setPickerReqId(null);
        }}
      />
    </section>
  );
}
