"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HomeCheffOrbitLoader } from "@/components/ui/homecheff-orbit-loader";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { useActiveTranslator } from "@/i18n/client";
import { loadHomeCheffProject, persistHomeCheffProject } from "@/lib/homecheff-project-persist";
import { readOrchestratorState, writeOrchestratorState } from "@/lib/studio-production-orchestrator";
import { markHcProductionCompleted, markHcProductionFailed, syncRenderedVideoToHcProject } from "@/lib/studio-production-continuity";
import { pollMotionProjectFinalVideo } from "@/lib/studio-production-poll-client";
import { PRODUCTION_TRANSACTION_HEADER } from "@/lib/studio-production-transaction";
import { HC_PROJECT_HEADER } from "@/lib/studio-production-request-headers";
import { STUDIO_RUN_PHASE_LABEL_KEYS } from "@/lib/studio-orchestrator-phases";
import type { HcOrchestratorState, ProductionExecutionState } from "@/types/studio-video-production";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

function ProductionShellContent() {
  const t = useActiveTranslator();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hcProjectId = searchParams.get("hcProject")?.trim() ?? "";
  const storyboardId = searchParams.get("storyboardId")?.trim() ?? "";
  const [project, setProject] = useState<HomeCheffProjectPackage | null>(() =>
    hcProjectId ? loadHomeCheffProject(hcProjectId) : null
  );
  const [messageKey, setMessageKey] = useState("studio.production.creating");
  const [error, setError] = useState("");
  const startedRef = useRef(false);

  const orchestrator = project ? readOrchestratorState(project) : null;
  const execution = orchestrator?.productionExecution;

  const persist = useCallback((next: HomeCheffProjectPackage) => {
    persistHomeCheffProject(next);
    setProject(next);
  }, []);

  const runBatchPipeline = useCallback(
    async (state: HcOrchestratorState) => {
      if (!project || !state.productionExecution) return;

      let currentExecution: ProductionExecutionState = state.productionExecution;
      let currentOrchestrator = state;
      const productionTransactionId = state.productionTransaction?.id ?? "";

      while (true) {
        const advanceRes = await fetch("/api/studio/orchestrator/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "advance",
            orchestrator: currentOrchestrator,
            hcProjectId: project.id,
          }),
        });
        const advance = (await advanceRes.json()) as {
          ok?: boolean;
          batchIndex?: number;
          sceneIndices?: number[];
          done?: boolean;
          needsMerge?: boolean;
          execution?: ProductionExecutionState;
          error?: string;
        };

        if (!advanceRes.ok || !advance.ok) {
          throw new Error(advance.error ?? "Batch advance failed");
        }

        if (advance.execution) {
          currentExecution = advance.execution;
          currentOrchestrator = { ...currentOrchestrator, productionExecution: currentExecution };
          persist(writeOrchestratorState(project, { productionExecution: currentExecution }));
        }

        if (advance.done) {
          break;
        }

        if (advance.sceneIndices && advance.sceneIndices.length > 0 && storyboardId) {
          setMessageKey("studio.production.rendering");
          const renderRes = await fetch("/api/studio/orchestrator/render-batch", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(productionTransactionId
                ? {
                    [PRODUCTION_TRANSACTION_HEADER]: productionTransactionId,
                    [HC_PROJECT_HEADER]: project.id,
                  }
                : {}),
            },
            body: JSON.stringify({
              storyboardId,
              sceneIndices: advance.sceneIndices,
              batchIndex: advance.batchIndex,
              productionTransactionId,
            }),
          });
          const renderBody = (await renderRes.json()) as { ok?: boolean; projectId?: string; error?: string };
          if (!renderRes.ok || !renderBody.projectId) {
            throw new Error(renderBody.error ?? "Batch render failed");
          }

          const segmentUrl = await pollMotionProjectFinalVideo(renderBody.projectId);

          const completeAdvance = await fetch("/api/studio/orchestrator/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "advance",
              orchestrator: currentOrchestrator,
              hcProjectId: project.id,
              batchIndex: advance.batchIndex,
              batchSegmentUrl: segmentUrl,
            }),
          });
          const completeBody = (await completeAdvance.json()) as { execution?: ProductionExecutionState };
          if (completeBody.execution) {
            currentExecution = completeBody.execution;
            currentOrchestrator = {
              ...currentOrchestrator,
              productionExecution: currentExecution,
              motionProjectId: renderBody.projectId,
            };
            persist(
              writeOrchestratorState(project, {
                productionExecution: currentExecution,
                motionProjectId: renderBody.projectId,
              })
            );
          }
        } else {
          break;
        }
      }

      if (currentExecution.renderBatchPlan?.ffmpegMergeRequired) {
        setMessageKey("studio.production.merging");
        const mergeRes = await fetch("/api/studio/orchestrator/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "merge",
            orchestrator: currentOrchestrator,
            hcProjectId: project.id,
          }),
        });
        const merge = (await mergeRes.json()) as {
          ok?: boolean;
          mergedVideoUrl?: string;
          finishPath?: string;
          execution?: ProductionExecutionState;
          error?: string;
        };
        if (!mergeRes.ok || !merge.mergedVideoUrl) {
          throw new Error(merge.error ?? "Merge failed");
        }

        let next = syncRenderedVideoToHcProject({
          project,
          videoUrl: merge.mergedVideoUrl,
          storyboardId,
          motionProjectId: currentOrchestrator.motionProjectId,
        });
        if (merge.execution) {
          next = writeOrchestratorState(next, { productionExecution: merge.execution });
        }
        next = markHcProductionCompleted(next, merge.mergedVideoUrl);
        persist(next);

        setMessageKey("studio.production.finishing");
        await fetch("/api/studio/orchestrator/settle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hcProjectId: project.id,
            outcome: "complete",
            completedFraction: 1,
          }),
        });

        router.replace(
          merge.finishPath ??
            `/publish/start?hcProject=${encodeURIComponent(project.id)}&storyboardId=${encodeURIComponent(storyboardId)}&video=${encodeURIComponent(merge.mergedVideoUrl)}&autoFinish=1`
        );
        return;
      }

      const singleUrl = currentExecution.batches.find((b) => b.segmentVideoUrl)?.segmentVideoUrl;
      if (singleUrl) {
        const next = markHcProductionCompleted(
          syncRenderedVideoToHcProject({
            project,
            videoUrl: singleUrl,
            storyboardId,
            motionProjectId: currentOrchestrator.motionProjectId,
          }),
          singleUrl
        );
        persist(next);

        await fetch("/api/studio/orchestrator/settle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hcProjectId: project.id,
            outcome: "complete",
            completedFraction: 1,
          }),
        });

        router.replace(
          `/publish/start?hcProject=${encodeURIComponent(project.id)}&storyboardId=${encodeURIComponent(storyboardId)}&video=${encodeURIComponent(singleUrl)}&autoFinish=1`
        );
        return;
      }

      router.replace(
        `/publish/start?hcProject=${encodeURIComponent(project.id)}&storyboardId=${encodeURIComponent(storyboardId)}&autoFinish=1`
      );
    },
    [orchestrator?.productionTransaction?.reservationId, persist, project, router, storyboardId]
  );

  useEffect(() => {
    if (!project || !execution || startedRef.current) return;
    startedRef.current = true;
    void runBatchPipeline(readOrchestratorState(project)).catch((err) => {
      const message = err instanceof Error ? err.message : "Production failed";
      setError(message);
      persist(markHcProductionFailed(project, message));
      void fetch("/api/studio/orchestrator/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hcProjectId: project.id,
          outcome: "fail",
          errorMessage: message,
        }),
      });
    });
  }, [execution, project, runBatchPipeline]);

  const runPhase = orchestrator?.runPhase ?? "rendering_video";
  const phaseLabel = t(STUDIO_RUN_PHASE_LABEL_KEYS[runPhase] as never);

  return (
    <StudioAuthGate>
      <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4">
        {error ?
          <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
        : <>
            <HomeCheffOrbitLoader state="generating" size="lg" message={t(messageKey as never)} />
            <p className="text-sm text-white/70">{phaseLabel}</p>
            <p className="text-xs text-white/50">{t("studio.production.lead" as never)}</p>
          </>
        }
      </main>
    </StudioAuthGate>
  );
}

export function StudioProductionShellPage() {
  return (
    <Suspense fallback={null}>
      <ProductionShellContent />
    </Suspense>
  );
}
