/**
 * Client helpers for Studio orchestrator production run (reserve → analyze → bootstrap → motion).
 */

import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";
import type {
  AudioAnalysisProfile,
  HcOrchestratorState,
  ProductionExecutionState,
  ProductionTransaction,
  StudioAnalysisPlan,
  StudioWorkflowReservation,
} from "@/types/studio-video-production";
import { readOrchestratorState } from "@/lib/studio-production-orchestrator";

export type OrchestratorReservePreview = {
  ok: boolean;
  requiredCredits: number;
  availableCredits: number;
  analysisPlan: StudioAnalysisPlan;
};

export type OrchestratorRunResult = {
  ok: true;
  runPhase: string;
  lifecycle?: string;
  storyboardId: string;
  sceneCount: number;
  title: string;
  reservation: StudioWorkflowReservation;
  productionTransaction?: ProductionTransaction;
  productionExecution?: ProductionExecutionState;
  productionPath?: string;
  finishPath?: string;
  publishPath: string;
  analysisPlan: StudioAnalysisPlan;
};

export async function uploadOrchestratorAsset(
  file: File,
  kind: import("@/types/studio-video-production").HcPersistedProductionAssetKind
): Promise<import("@/types/studio-video-production").HcPersistedProductionAsset> {
  const form = new FormData();
  form.set("file", file);
  form.set("kind", kind);
  const res = await fetch("/api/studio/orchestrator/upload-asset", { method: "POST", body: form });
  const data = (await res.json()) as { ok?: boolean; asset?: import("@/types/studio-video-production").HcPersistedProductionAsset; error?: string };
  if (!res.ok || !data.asset) {
    throw new Error(data.error ?? "Upload failed");
  }
  return data.asset;
}

export async function previewOrchestratorReservation(params: {
  orchestrator: HcOrchestratorState;
  hcProjectId: string;
}): Promise<OrchestratorReservePreview> {
  const res = await fetch("/api/studio/orchestrator/reserve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: params.orchestrator.intent,
      totalCredits: params.orchestrator.analysisPlan?.totalCredits,
      hcProjectId: params.hcProjectId,
      orchestrator: {
        audioAnalysis: params.orchestrator.audioAnalysis,
        videoAnalysis: params.orchestrator.videoAnalysis,
        characterId: params.orchestrator.characterId,
      },
      authorize: false,
    }),
  });
  const data = (await res.json()) as OrchestratorReservePreview & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Reservation preview failed");
  }
  return data;
}

export async function authorizeOrchestratorReservation(params: {
  orchestrator: HcOrchestratorState;
  hcProjectId: string;
  confirmed?: boolean;
}): Promise<{ ok: true; reservation: StudioWorkflowReservation }> {
  const res = await fetch("/api/studio/orchestrator/reserve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: params.orchestrator.intent,
      totalCredits: params.orchestrator.analysisPlan?.totalCredits,
      hcProjectId: params.hcProjectId,
      orchestrator: {
        audioAnalysis: params.orchestrator.audioAnalysis,
        videoAnalysis: params.orchestrator.videoAnalysis,
        characterId: params.orchestrator.characterId,
      },
      authorize: true,
      confirmed: params.confirmed ?? true,
    }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    reservation?: StudioWorkflowReservation;
    message?: string;
    code?: string;
  };
  if (!res.ok || !data.ok || !data.reservation) {
    throw new Error(data.message ?? data.code ?? "Authorization failed");
  }
  return { ok: true, reservation: data.reservation };
}

export async function analyzeAudioWithFfprobe(file: File): Promise<{
  audioProfile: AudioAnalysisProfile;
  analysisMethod: "ffprobe" | "heuristic";
}> {
  const form = new FormData();
  form.set("file", file);
  const res = await fetch("/api/studio/orchestrator/analyze-audio", {
    method: "POST",
    body: form,
  });
  const data = (await res.json()) as {
    audioProfile?: AudioAnalysisProfile;
    analysisMethod?: "ffprobe" | "heuristic";
    error?: string;
  };
  if (!res.ok || !data.audioProfile) {
    throw new Error(data.error ?? "Audio analysis failed");
  }
  return {
    audioProfile: data.audioProfile,
    analysisMethod: data.analysisMethod ?? "heuristic",
  };
}

export async function runOrchestratorProduction(params: {
  project: HomeCheffProjectPackage;
  idea?: string;
  characterId?: string;
}): Promise<OrchestratorRunResult> {
  const orchestrator = readOrchestratorState(params.project);
  const res = await fetch("/api/studio/orchestrator/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orchestrator,
      hcProjectId: params.project.id,
      idea: params.idea,
      characterId: params.characterId ?? orchestrator.characterId,
      confirmed: true,
    }),
  });
  const data = (await res.json()) as OrchestratorRunResult & { error?: string; message?: string };
  if (!res.ok || !data.ok) {
    throw new Error(data.error ?? data.message ?? "Production run failed");
  }
  return data;
}
