/**
 * Studio V2 — Director decision memory from apply audits (advisory only).
 */

import {
  computeProposalRetentionScore,
  detectProposalEndingPatterns,
} from "@/lib/studio-director-apply-audit";
import { loadDirectorDecisionRegistry } from "@/lib/studio-director-decision-storage";
import type {
  BuildDirectorDecisionMemoryInput,
  DirectorApplyAuditRecord,
  DirectorDecisionMemory,
  DirectorDecisionMemoryContext,
  DirectorDecisionPattern,
} from "@/types/studio-director-decision-memory";
import type { StudioStoryboardDetail } from "@/types/studio-api";

const MIN_PATTERN_COUNT = 2;

function bumpPattern(
  map: Map<string, DirectorDecisionPattern>,
  id: string,
  labelKey: string,
  params?: Record<string, string>
): void {
  const existing = map.get(id);
  if (existing) {
    existing.count += 1;
    existing.confidence =
      existing.count >= 4 ? "high"
      : existing.count >= MIN_PATTERN_COUNT ? "medium"
      : "low";
    return;
  }
  map.set(id, {
    id,
    labelKey,
    count: 1,
    confidence: "low",
    params,
  });
}

function patternsAboveThreshold(map: Map<string, DirectorDecisionPattern>): DirectorDecisionPattern[] {
  return [...map.values()]
    .filter((pattern) => pattern.count >= MIN_PATTERN_COUNT)
    .sort((a, b) => b.count - a.count);
}

function aggregateSceneCounts(audits: DirectorApplyAuditRecord[]): {
  min?: number;
  max?: number;
} {
  const applied = audits.filter(
    (audit) => audit.kind === "director_applied" || audit.kind === "director_partially_applied"
  );
  if (applied.length < MIN_PATTERN_COUNT) {
    return {};
  }
  const counts = applied.map((audit) => audit.appliedSceneCount ?? audit.proposalSceneCount);
  return {
    min: Math.min(...counts),
    max: Math.max(...counts),
  };
}

function buildContextLines(memory: DirectorDecisionMemory): string[] {
  const lines: string[] = [];
  if (memory.preferredSceneCountMin != null && memory.preferredSceneCountMax != null) {
    lines.push(
      `User often chooses ${memory.preferredSceneCountMin}-${memory.preferredSceneCountMax} scenes`
    );
  }
  for (const pattern of memory.oftenRemovedStructures.slice(0, 2)) {
    lines.push(`Often removed: ${pattern.id} (${pattern.count}×)`);
  }
  for (const pattern of memory.favoriteCtaTypes.slice(0, 1)) {
    lines.push(`Preferred CTA style: ${pattern.id}`);
  }
  for (const pattern of memory.favoriteEndingKeys.slice(0, 1)) {
    lines.push(`Preferred ending: ${pattern.id}`);
  }
  return lines.slice(0, 6);
}

export function buildDirectorDecisionMemory(
  input: BuildDirectorDecisionMemoryInput = {}
): DirectorDecisionMemory {
  const audits =
    input.audits
    ?? (input.storyboardId ? loadDirectorDecisionRegistry(input.storyboardId).audits : []);

  const accepted = new Map<string, DirectorDecisionPattern>();
  const removed = new Map<string, DirectorDecisionPattern>();
  const endings = new Map<string, DirectorDecisionPattern>();
  const ctas = new Map<string, DirectorDecisionPattern>();

  for (const audit of audits) {
    if (audit.kind === "director_rejected") {
      bumpPattern(removed, "full_proposal", "studio.directorDecision.pattern.rejectedProposal");
      continue;
    }

    if (audit.kind === "director_applied" || audit.kind === "director_partially_applied") {
      bumpPattern(accepted, `scenes_${audit.proposalSceneCount}`, "studio.directorDecision.pattern.sceneCount", {
        count: String(audit.proposalSceneCount),
      });
    }

    for (const change of audit.changes) {
      if (change.kind === "scene_added") {
        bumpPattern(accepted, "scene_added", "studio.directorDecision.pattern.addedScenes");
      }
      if (change.kind === "scene_removed") {
        bumpPattern(removed, "scene_removed", "studio.directorDecision.pattern.removedScenes");
      }
      if (change.kind === "scene_rewritten") {
        bumpPattern(removed, "scene_rewritten", "studio.directorDecision.pattern.rewrittenScenes");
        if (change.detailKey === "studio.directorDecision.change.genericCtaRemoved") {
          bumpPattern(removed, "generic_cta", "studio.directorDecision.pattern.genericCtaRemoved");
        }
        if (change.detailKey === "studio.directorDecision.change.standardEndingReplaced") {
          bumpPattern(removed, "standard_ending", "studio.directorDecision.pattern.standardEndingReplaced");
        }
      }
      if (change.kind === "character_removed") {
        bumpPattern(removed, "character_removed", "studio.directorDecision.pattern.removedCharacters");
      }
      if (change.kind === "voice_changed") {
        bumpPattern(removed, "voice_changed", "studio.directorDecision.pattern.changedVoice");
      }
      if (change.kind === "render_strategy_changed") {
        bumpPattern(removed, "render_changed", "studio.directorDecision.pattern.changedRender");
      }
    }
  }

  const sceneRange = aggregateSceneCounts(audits);
  const learningSummaryKeys: string[] = [];
  const removedPatterns = patternsAboveThreshold(removed);
  const acceptedPatterns = patternsAboveThreshold(accepted);

  if (
    sceneRange.max != null
    && sceneRange.max <= 8
    && (sceneRange.min ?? sceneRange.max) >= 2
  ) {
    learningSummaryKeys.push("studio.directorDecision.learn.shorterVideos");
  }
  if (removedPatterns.some((pattern) => pattern.id === "scene_rewritten")) {
    learningSummaryKeys.push("studio.directorDecision.learn.moreAction");
  }
  if (acceptedPatterns.some((pattern) => pattern.id === "scene_added")) {
    learningSummaryKeys.push("studio.directorDecision.learn.moreCharacters");
  }

  const memory: DirectorDecisionMemory = {
    version: 1,
    auditCount: audits.length,
    preferredSceneCountMin: sceneRange.min,
    preferredSceneCountMax: sceneRange.max,
    oftenAcceptedStructures: patternsAboveThreshold(accepted),
    oftenRemovedStructures: patternsAboveThreshold(removed),
    favoriteEndingKeys: patternsAboveThreshold(endings),
    favoriteCtaTypes: patternsAboveThreshold(ctas),
    directorContextLines: [],
    recommendationKeys: [],
    learningSummaryKeys,
  };

  if (memory.preferredSceneCountMin != null && memory.preferredSceneCountMax != null) {
    memory.recommendationKeys.push("studio.directorDecision.recommend.sceneCount");
  }
  if (memory.oftenRemovedStructures.some((p) => p.id === "scene_rewritten")) {
    memory.recommendationKeys.push("studio.directorDecision.recommend.genericCta");
  }

  memory.directorContextLines = buildContextLines(memory);

  if (input.applyBaseline && input.storyboard) {
    const score = computeProposalRetentionScore({
      baseline: input.applyBaseline,
      storyboard: input.storyboard,
    });
    memory.proposalRetentionScore = score;
    memory.proposalRetentionLabelKey =
      score >= 70
        ? "studio.directorDecision.retention.mostlyKept"
        : "studio.directorDecision.retention.oftenEdited";
  }

  return memory;
}

export function buildDirectorDecisionMemoryContext(
  input: BuildDirectorDecisionMemoryInput = {}
): DirectorDecisionMemoryContext {
  const registry =
    input.storyboardId ? loadDirectorDecisionRegistry(input.storyboardId) : null;
  const memory = buildDirectorDecisionMemory({
    ...input,
    audits: input.audits ?? registry?.audits,
    applyBaseline: input.applyBaseline ?? registry?.applyBaseline,
  });
  return {
    memory,
    contextLines: memory.directorContextLines,
    recommendationKeys: memory.recommendationKeys,
  };
}

export function enrichIdeaWithDirectorDecisionMemory(
  idea: string,
  context: DirectorDecisionMemoryContext
): string {
  if (context.contextLines.length === 0) {
    return idea;
  }
  const lines = context.contextLines.join("; ");
  return `[Director preferences: ${lines}]\n${idea.trim()}`.trim();
}

export function mergeDecisionPatternsIntoProductionMemory<
  T extends { decisionPatterns?: DirectorDecisionPattern[]; directorContextLines: string[] },
>(profile: T, decisionMemory: DirectorDecisionMemory): T {
  const decisionPatterns = [
    ...decisionMemory.oftenAcceptedStructures,
    ...decisionMemory.oftenRemovedStructures,
  ].slice(0, 8);
  const extraLines = decisionMemory.directorContextLines.map((line) => `decision:${line}`);
  return {
    ...profile,
    decisionPatterns,
    directorContextLines: [...profile.directorContextLines, ...extraLines].slice(0, 12),
  };
}

/** Expose ending pattern helper for tests */
export { detectProposalEndingPatterns };
