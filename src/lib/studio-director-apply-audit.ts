/**
 * Studio V2 — Director apply audit & change detection (advisory only).
 */

import { resolveProposedSceneText, type ProposalTextResolver } from "@/lib/studio-director-proposal-apply";
import {
  loadDirectorDecisionRegistry,
  saveDirectorDecisionRegistry,
} from "@/lib/studio-director-decision-storage";
import type { StudioStoryboardDetail } from "@/types/studio-api";
import type {
  DirectorApplyAuditKind,
  DirectorApplyAuditRecord,
  DirectorApplyBaseline,
  DirectorDecisionChange,
  DirectorDecisionChangeKind,
} from "@/types/studio-director-decision-memory";
import type {
  DirectorProposalApplyMode,
  ProposedScene,
  StudioDirectorProposal,
} from "@/types/studio-director-proposal";
import type { ApplyDirectorProposalResult } from "@/lib/studio-director-proposal-apply";
import type { StudioSnapshotCompareLine, StudioSnapshotCompareResult } from "@/types/studio-production-snapshot";

function auditId(): string {
  return `dir-audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isCtaScene(title: string, description: string): boolean {
  const haystack = `${title} ${description}`.toLowerCase();
  return /\b(cta|call to action|join us|shop now|sign up|subscribe|bestel|meld je|doe mee)\b/.test(
    haystack
  );
}

function isGenericEnding(title: string, description: string): boolean {
  const haystack = `${title} ${description}`.toLowerCase();
  return /\b(thank you|thanks for watching|the end|tot ziens|bedankt|closing|outro|finale)\b/.test(
    haystack
  );
}

function pushChange(
  changes: DirectorDecisionChange[],
  kind: DirectorDecisionChangeKind,
  detailKey: string,
  detailParams?: Record<string, string>
): void {
  if (changes.some((change) => change.kind === kind && change.detailKey === detailKey)) {
    return;
  }
  changes.push({ kind, detailKey, detailParams });
}

export function buildProposalSceneFingerprints(
  proposal: StudioDirectorProposal,
  t: ProposalTextResolver
): DirectorApplyBaseline["scenes"] {
  return proposal.scenes.map((scene) => {
    const copy = resolveProposedSceneText(scene, t);
    return {
      order: scene.order,
      title: copy.title,
      description: copy.description,
      characterIds: scene.characterRefs.map((ref) => ref.existingId).sort(),
      locationId: scene.locationRef?.existingId ?? null,
    };
  });
}

export function buildApplyBaselineFromProposal(params: {
  auditId: string;
  proposal: StudioDirectorProposal;
  storyboard: StudioStoryboardDetail;
  renderStrategy?: string;
  t: ProposalTextResolver;
}): DirectorApplyBaseline {
  return {
    appliedAt: new Date().toISOString(),
    auditId: params.auditId,
    proposalSceneCount: params.proposal.scenes.length,
    scenes: buildProposalSceneFingerprints(params.proposal, params.t),
    voiceProfile: params.proposal.audio.voiceProfile,
    renderStrategy: params.renderStrategy,
  };
}

export function resolveApplyAuditKind(params: {
  mode: DirectorProposalApplyMode;
  result: ApplyDirectorProposalResult;
  proposalSceneCount: number;
}): DirectorApplyAuditKind {
  const appliedCount = params.result.createdSceneIds.length + params.result.updatedSceneIds.length;
  if (params.mode === "all" && params.result.ok && appliedCount >= params.proposalSceneCount) {
    return "director_applied";
  }
  return "director_partially_applied";
}

export function computeProposalRetentionScore(params: {
  baseline: DirectorApplyBaseline;
  storyboard: StudioStoryboardDetail;
}): number {
  const currentScenes = [...params.storyboard.scenes].sort((a, b) => a.order - b.order);
  if (params.baseline.scenes.length === 0) {
    return 100;
  }

  let matched = 0;
  for (const proposed of params.baseline.scenes) {
    const current = currentScenes[proposed.order];
    if (!current) {
      continue;
    }
    const titleMatch = normalizeText(current.title) === normalizeText(proposed.title);
    const descMatch =
      normalizeText(current.description ?? "") === normalizeText(proposed.description);
    if (titleMatch && descMatch) {
      matched += 1;
    } else if (titleMatch || descMatch) {
      matched += 0.5;
    }
  }

  return Math.round((matched / params.baseline.scenes.length) * 100);
}

export function detectStoryboardDrift(params: {
  baseline: DirectorApplyBaseline;
  storyboard: StudioStoryboardDetail;
  renderStrategy?: string;
}): DirectorDecisionChange[] {
  const changes: DirectorDecisionChange[] = [];
  const currentScenes = [...params.storyboard.scenes].sort((a, b) => a.order - b.order);

  if (currentScenes.length > params.baseline.proposalSceneCount) {
    pushChange(changes, "scene_added", "studio.directorDecision.change.sceneAdded", {
      count: String(currentScenes.length - params.baseline.proposalSceneCount),
    });
  }
  if (currentScenes.length < params.baseline.proposalSceneCount) {
    pushChange(changes, "scene_removed", "studio.directorDecision.change.sceneRemoved", {
      count: String(params.baseline.proposalSceneCount - currentScenes.length),
    });
  }

  for (const proposed of params.baseline.scenes) {
    const current = currentScenes[proposed.order];
    if (!current) {
      continue;
    }
    const titleChanged = normalizeText(current.title) !== normalizeText(proposed.title);
    const descChanged =
      normalizeText(current.description ?? "") !== normalizeText(proposed.description);
    if (titleChanged || descChanged) {
      pushChange(changes, "scene_rewritten", "studio.directorDecision.change.sceneRewritten", {
        order: String(proposed.order + 1),
      });
    }

    const baselineChars = new Set(proposed.characterIds);
    const currentChars = new Set(current.characters.map((character) => character.id));
    for (const id of baselineChars) {
      if (!currentChars.has(id)) {
        pushChange(changes, "character_removed", "studio.directorDecision.change.characterRemoved", {
          order: String(proposed.order + 1),
        });
        break;
      }
    }

    const baselineLocation = proposed.locationId ?? null;
    const currentLocation = current.location?.id ?? null;
    if (baselineLocation !== currentLocation) {
      pushChange(changes, "location_changed", "studio.directorDecision.change.locationChanged", {
        order: String(proposed.order + 1),
      });
    }
  }

  const baselineVoice = params.baseline.voiceProfile.trim();
  const currentVoice = (params.storyboard.voiceProfile ?? "").trim();
  if (baselineVoice && currentVoice && baselineVoice !== currentVoice) {
    pushChange(changes, "voice_changed", "studio.directorDecision.change.voiceChanged", {
      from: baselineVoice,
      to: currentVoice,
    });
  }

  if (
    params.baseline.renderStrategy
    && params.renderStrategy
    && params.baseline.renderStrategy !== params.renderStrategy
  ) {
    pushChange(changes, "render_strategy_changed", "studio.directorDecision.change.renderChanged", {
      from: params.baseline.renderStrategy,
      to: params.renderStrategy,
    });
  }

  const baselineLast = params.baseline.scenes[params.baseline.scenes.length - 1];
  const currentLast = currentScenes[currentScenes.length - 1];
  if (baselineLast && currentLast) {
    const baselineCta = isCtaScene(baselineLast.title, baselineLast.description);
    const currentCta = isCtaScene(currentLast.title, currentLast.description ?? "");
    if (baselineCta && !currentCta) {
      pushChange(changes, "scene_rewritten", "studio.directorDecision.change.genericCtaRemoved");
    }
    const baselineGeneric = isGenericEnding(baselineLast.title, baselineLast.description);
    const currentGeneric = isGenericEnding(currentLast.title, currentLast.description ?? "");
    if (baselineGeneric && !currentGeneric) {
      pushChange(changes, "scene_rewritten", "studio.directorDecision.change.standardEndingReplaced");
    }
  }

  return changes;
}

export function detectProposalEndingPatterns(
  scenes: ProposedScene[],
  t: ProposalTextResolver
): { cta: boolean; genericEnding: boolean } {
  if (scenes.length === 0) {
    return { cta: false, genericEnding: false };
  }
  const last = scenes[scenes.length - 1]!;
  const copy = resolveProposedSceneText(last, t);
  return {
    cta: isCtaScene(copy.title, copy.description),
    genericEnding: isGenericEnding(copy.title, copy.description),
  };
}

export function appendDirectorApplyAudit(params: {
  storyboardId: string;
  kind: DirectorApplyAuditKind;
  proposal?: StudioDirectorProposal;
  proposalSceneCount?: number;
  mode?: DirectorProposalApplyMode;
  result?: ApplyDirectorProposalResult;
  changes?: DirectorDecisionChange[];
  baseline?: DirectorApplyBaseline | null;
  snapshotId?: string;
}): DirectorApplyAuditRecord {
  const registry = loadDirectorDecisionRegistry(params.storyboardId);
  const appliedCount =
    params.result ?
      params.result.createdSceneIds.length + params.result.updatedSceneIds.length
    : undefined;
  const sceneCount =
    params.proposalSceneCount
    ?? params.proposal?.scenes.length
    ?? params.baseline?.proposalSceneCount
    ?? 0;

  const record: DirectorApplyAuditRecord = {
    id: auditId(),
    storyboardId: params.storyboardId,
    at: new Date().toISOString(),
    kind: params.kind,
    applyMode: params.mode,
    proposalSceneCount: sceneCount,
    appliedSceneCount: appliedCount,
    retentionScore: params.baseline ? undefined : undefined,
    changes: params.changes ?? [],
    snapshotId: params.snapshotId,
  };

  registry.audits = [record, ...registry.audits].slice(0, 40);
  registry.pendingProposalId = null;
  if (params.baseline) {
    registry.applyBaseline = params.baseline;
  }
  saveDirectorDecisionRegistry(registry);
  return record;
}

export function recordDirectorProposalPending(storyboardId: string, proposalId: string): void {
  const registry = loadDirectorDecisionRegistry(storyboardId);
  registry.pendingProposalId = proposalId;
  saveDirectorDecisionRegistry(registry);
}

export function recordDirectorProposalRejected(params: {
  storyboardId: string;
  proposal: StudioDirectorProposal;
}): DirectorApplyAuditRecord {
  return appendDirectorApplyAudit({
    storyboardId: params.storyboardId,
    kind: "director_rejected",
    proposal: params.proposal,
  });
}

export function recordDirectorProposalApplied(params: {
  storyboardId: string;
  proposal: StudioDirectorProposal;
  mode: DirectorProposalApplyMode;
  result: ApplyDirectorProposalResult;
  storyboard: StudioStoryboardDetail;
  renderStrategy?: string;
  t: ProposalTextResolver;
  snapshotId?: string;
}): DirectorApplyAuditRecord {
  const id = auditId();
  const baseline = buildApplyBaselineFromProposal({
    auditId: id,
    proposal: params.proposal,
    storyboard: params.storyboard,
    renderStrategy: params.renderStrategy,
    t: params.t,
  });
  const kind = resolveApplyAuditKind({
    mode: params.mode,
    result: params.result,
    proposalSceneCount: params.proposal.scenes.length,
  });

  return appendDirectorApplyAudit({
    storyboardId: params.storyboardId,
    kind,
    proposal: params.proposal,
    mode: params.mode,
    result: params.result,
    baseline,
    snapshotId: params.snapshotId,
  });
}

export function recordDirectorModificationsIfDrift(params: {
  storyboardId: string;
  storyboard: StudioStoryboardDetail;
  proposal?: StudioDirectorProposal;
  renderStrategy?: string;
}): DirectorApplyAuditRecord | null {
  const registry = loadDirectorDecisionRegistry(params.storyboardId);
  if (!registry.applyBaseline) {
    return null;
  }
  const changes = detectStoryboardDrift({
    baseline: registry.applyBaseline,
    storyboard: params.storyboard,
    renderStrategy: params.renderStrategy,
  });
  if (changes.length === 0) {
    return null;
  }
  const changeSignature = changes.map((change) => change.kind).sort().join(",");
  const recentModified = registry.audits.find(
    (audit) =>
      audit.kind === "director_modified"
      && audit.changes.map((change) => change.kind).sort().join(",") === changeSignature
  );
  if (recentModified && Date.now() - Date.parse(recentModified.at) < 60_000) {
    return null;
  }
  return appendDirectorApplyAudit({
    storyboardId: params.storyboardId,
    kind: "director_modified",
    proposal: params.proposal,
    proposalSceneCount: registry.applyBaseline.proposalSceneCount,
    changes,
  });
}

/** Compare director apply baseline (proposal fingerprint) to current storyboard. */
export function compareDirectorApplyBaseline(params: {
  baseline: DirectorApplyBaseline;
  storyboard: StudioStoryboardDetail;
}): StudioSnapshotCompareResult {
  const lines: StudioSnapshotCompareLine[] = [];
  const fromScenes = params.baseline.scenes;
  const toScenes = [...(params.storyboard.scenes ?? [])].sort((a, b) => a.order - b.order);

  if (fromScenes.length !== toScenes.length) {
    lines.push({
      id: "scene-count",
      category: "scene",
      labelKey: "studio.snapshot.compare.sceneCount",
      labelParams: { from: String(fromScenes.length), to: String(toScenes.length) },
    });
  }

  const fromTitles = fromScenes.map((scene) => scene.title || `#${scene.order + 1}`).join(", ");
  const toTitles = toScenes.map((scene) => scene.title || `#${scene.order + 1}`).join(", ");
  if (fromTitles !== toTitles) {
    lines.push({
      id: "scene-titles",
      category: "scene",
      labelKey: "studio.snapshot.compare.sceneTitles",
      labelParams: { from: fromTitles || "—", to: toTitles || "—" },
    });
  }

  const fromCharacters = new Set(fromScenes.flatMap((scene) => scene.characterIds));
  const toCharacters = new Set(toScenes.flatMap((scene) => scene.characters.map((c) => c.id)));
  if (fromCharacters.size !== toCharacters.size) {
    lines.push({
      id: "asset-characters",
      category: "asset",
      labelKey: "studio.snapshot.compare.characterCount",
      labelParams: {
        from: String(fromCharacters.size),
        to: String(toCharacters.size),
      },
    });
  }

  const baselineVoice = params.baseline.voiceProfile.trim();
  const currentVoice = (params.storyboard.voiceProfile ?? "").trim();
  if (baselineVoice && currentVoice && baselineVoice !== currentVoice) {
    lines.push({
      id: "voice-profile",
      category: "general",
      labelKey: "studio.directorDecision.compare.voiceChanged",
      labelParams: { from: baselineVoice || "—", to: currentVoice || "—" },
    });
  }

  return {
    fromSnapshotId: `baseline-${params.baseline.auditId}`,
    toSnapshotId: `current-${params.storyboard.id}`,
    lines,
    hasChanges: lines.length > 0,
  };
}

const AUDIT_TITLE_KEYS: Record<
  import("@/types/studio-director-decision-memory").DirectorApplyAuditKind,
  string
> = {
  director_applied: "studio.productionTimeline.event.directorApplied",
  director_partially_applied: "studio.productionTimeline.event.directorPartiallyApplied",
  director_modified: "studio.productionTimeline.event.directorModified",
  director_rejected: "studio.productionTimeline.event.directorRejected",
};

export function directorAuditsToTimelineEvents(
  audits: DirectorApplyAuditRecord[]
): import("@/types/studio-production-timeline").ProductionTimelineEvent[] {
  return audits.map((audit) => ({
    id: audit.id,
    at: audit.at,
    kind: audit.kind,
    source: "derived" as const,
    category: "director" as const,
    titleKey: AUDIT_TITLE_KEYS[audit.kind],
    titleParams: {
      scenes: String(audit.proposalSceneCount),
      applied: String(audit.appliedSceneCount ?? audit.proposalSceneCount),
      changes: String(audit.changes.length),
    },
    toolId: "directorPreferences" as const,
  }));
}
