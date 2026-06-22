/**
 * Dev logs for fusion wizard analysis timing — upload must stay basic/free.
 */

export type FusionUploadAnalysisLog = {
  phase: "upload";
  analysisDepth: "basic";
  styleDnaCalled: boolean;
  visionPartsCalled: boolean;
  premiumCreditsCalled: boolean;
  providersUsed: string[];
};

export type FusionRenderAnalysisLog = {
  phase: "render";
  cacheHits: number;
  cacheMisses: number;
  premiumAnalysesStarted: number;
  premiumCreditsCharged: number;
  renderCreditsCharged: number;
};

let lastFusionUploadAnalysisLogForTests: FusionUploadAnalysisLog | null = null;
let lastFusionRenderAnalysisLogForTests: FusionRenderAnalysisLog | null = null;

export function logFusionUploadAnalysis(log: FusionUploadAnalysisLog): void {
  lastFusionUploadAnalysisLogForTests = log;
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.info("[editor.fusion.upload.analysis]", log);
  }
}

export function logFusionRenderAnalysis(log: FusionRenderAnalysisLog): void {
  lastFusionRenderAnalysisLogForTests = log;
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.info("[editor.fusion.render.analysis]", log);
  }
}

export function getLastFusionUploadAnalysisLogForTests(): FusionUploadAnalysisLog | null {
  return lastFusionUploadAnalysisLogForTests;
}

export function getLastFusionRenderAnalysisLogForTests(): FusionRenderAnalysisLog | null {
  return lastFusionRenderAnalysisLogForTests;
}

export function resetFusionAnalysisTimingLogsForTests(): void {
  lastFusionUploadAnalysisLogForTests = null;
  lastFusionRenderAnalysisLogForTests = null;
}
