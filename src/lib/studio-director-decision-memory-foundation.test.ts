import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { getTranslator } from "@/i18n";
import { en } from "@/i18n/locales/en";
import { nl } from "@/i18n/locales/nl";
import {
  buildApplyBaselineFromProposal,
  compareDirectorApplyBaseline,
  detectStoryboardDrift,
  directorAuditsToTimelineEvents,
  recordDirectorProposalApplied,
  recordDirectorProposalRejected,
  recordDirectorModificationsIfDrift,
  resolveApplyAuditKind,
} from "@/lib/studio-director-apply-audit";
import {
  buildDirectorDecisionMemory,
  enrichIdeaWithDirectorDecisionMemory,
} from "@/lib/studio-director-decision-memory";
import {
  clearDirectorDecisionStorageForTests,
  loadDirectorDecisionRegistry,
} from "@/lib/studio-director-decision-storage";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import { buildCreativeReview } from "@/lib/studio-creative-review";
import { buildCreationAssistantView } from "@/lib/studio-creation-assistant";
import { buildProductionTimeline } from "@/lib/studio-production-timeline";
import {
  studioSceneDetail,
  studioStoryboardDetail,
} from "@/test/studio-api-fixtures";

const tEn = getTranslator("en");

describe("studio-director-decision-memory-foundation", () => {
  beforeEach(() => {
    clearDirectorDecisionStorageForTests();
  });

  it("records apply audit and maps timeline events", () => {
    const storyboard = studioStoryboardDetail({
      id: "sb-dir-apply",
      scenes: [],
    });
    const proposal = buildDirectorProposal({
      idea: "Garden promo with mascot chef",
      storyboard,
      characters: [],
      locations: [],
      props: [],
      t: tEn,
    });
    assert.ok(proposal);

    recordDirectorProposalApplied({
      storyboardId: storyboard.id,
      proposal: proposal!,
      mode: "all",
      result: {
        ok: true,
        createdSceneIds: ["s1", "s2", "s3", "s4", "s5"],
        updatedSceneIds: [],
        skippedNewAssets: 0,
        errors: [],
      },
      storyboard: studioStoryboardDetail({
        id: storyboard.id,
        scenes: proposal!.scenes.map((scene, order) =>
          studioSceneDetail({ order, title: `Scene ${order + 1}` })
        ),
      }),
      t: tEn,
    });

    const registry = loadDirectorDecisionRegistry(storyboard.id);
    assert.equal(registry.audits[0]?.kind, "director_applied");
    assert.ok(registry.applyBaseline);

    const events = directorAuditsToTimelineEvents(registry.audits);
    assert.ok(events.some((event) => event.kind === "director_applied"));
    assert.equal(events[0]?.titleKey, "studio.productionTimeline.event.directorApplied");
  });

  it("records rejection audit", () => {
    const storyboard = studioStoryboardDetail({ id: "sb-dir-reject", scenes: [] });
    const proposal = buildDirectorProposal({
      idea: "Short promo",
      storyboard,
      characters: [],
      locations: [],
      props: [],
    });
    assert.ok(proposal);

    recordDirectorProposalRejected({ storyboardId: storyboard.id, proposal: proposal! });
    const registry = loadDirectorDecisionRegistry(storyboard.id);
    assert.equal(registry.audits[0]?.kind, "director_rejected");
    assert.ok(
      directorAuditsToTimelineEvents(registry.audits).some((event) => event.kind === "director_rejected")
    );
  });

  it("detects modification drift after apply", () => {
    const storyboard = studioStoryboardDetail({
      id: "sb-dir-drift",
      voiceProfile: "warm_narrator",
      scenes: [
        studioSceneDetail({ order: 0, title: "Opening", description: "Hook" }),
        studioSceneDetail({ order: 1, title: "Peak", description: "Action" }),
      ],
    });
    const proposal = buildDirectorProposal({
      idea: "Two scene promo",
      storyboard,
      characters: [],
      locations: [],
      props: [],
      t: tEn,
    });
    assert.ok(proposal);

    recordDirectorProposalApplied({
      storyboardId: storyboard.id,
      proposal: proposal!,
      mode: "all",
      result: { ok: true, createdSceneIds: ["s1", "s2"], updatedSceneIds: [], skippedNewAssets: 0, errors: [] },
      storyboard,
      t: tEn,
    });

    const edited = studioStoryboardDetail({
      id: storyboard.id,
      voiceProfile: "energetic_host",
      scenes: [
        studioSceneDetail({ order: 0, title: "New opening", description: "Hook" }),
        studioSceneDetail({ order: 1, title: "Peak", description: "Action" }),
        studioSceneDetail({ order: 2, title: "Extra", description: "Added" }),
      ],
    });

    const modified = recordDirectorModificationsIfDrift({
      storyboardId: storyboard.id,
      storyboard: edited,
      proposal: proposal!,
    });
    assert.ok(modified);
    assert.equal(modified!.kind, "director_modified");
    assert.ok(modified!.changes.some((change) => change.kind === "scene_added"));
    assert.ok(modified!.changes.some((change) => change.kind === "scene_rewritten"));
    assert.ok(modified!.changes.some((change) => change.kind === "voice_changed"));
  });

  it("builds decision memory from audits", () => {
    const storyboard = studioStoryboardDetail({ id: "sb-dir-memory", scenes: [] });
    const proposal = buildDirectorProposal({
      idea: "Compact promo",
      storyboard,
      characters: [],
      locations: [],
      props: [],
    });
    assert.ok(proposal);

    for (let i = 0; i < 2; i += 1) {
      recordDirectorProposalApplied({
        storyboardId: storyboard.id,
        proposal: proposal!,
        mode: "all",
        result: {
          ok: true,
          createdSceneIds: proposal!.scenes.map((_, idx) => `s${idx}`),
          updatedSceneIds: [],
          skippedNewAssets: 0,
          errors: [],
        },
        storyboard: studioStoryboardDetail({
          id: storyboard.id,
          scenes: proposal!.scenes.map((_, order) => studioSceneDetail({ order })),
        }),
        t: tEn,
      });
    }

    const memory = buildDirectorDecisionMemory({ storyboardId: storyboard.id });
    assert.ok(memory.oftenAcceptedStructures.length > 0);
    assert.ok(memory.preferredSceneCountMin != null);
    assert.ok(memory.recommendationKeys.includes("studio.directorDecision.recommend.sceneCount"));
  });

  it("enriches AI Director idea with decision memory context", () => {
    const storyboard = studioStoryboardDetail({ id: "sb-dir-enrich", scenes: [] });
    const proposal = buildDirectorProposal({
      idea: "Brand story",
      storyboard,
      characters: [],
      locations: [],
      props: [],
    });
    assert.ok(proposal);

    for (let i = 0; i < 2; i += 1) {
      recordDirectorProposalRejected({ storyboardId: storyboard.id, proposal: proposal! });
    }

    const memory = buildDirectorDecisionMemory({ storyboardId: storyboard.id });
    const enriched = enrichIdeaWithDirectorDecisionMemory("Fresh idea", {
      memory,
      contextLines: memory.directorContextLines,
      recommendationKeys: memory.recommendationKeys,
    });
    assert.ok(enriched.includes("[Director preferences:"));
  });

  it("feeds production timeline with director audit events", () => {
    const storyboard = studioStoryboardDetail({ id: "sb-dir-timeline", scenes: [] });
    const proposal = buildDirectorProposal({
      idea: "Timeline test",
      storyboard,
      characters: [],
      locations: [],
      props: [],
    });
    assert.ok(proposal);

    recordDirectorProposalRejected({ storyboardId: storyboard.id, proposal: proposal! });
    const registry = loadDirectorDecisionRegistry(storyboard.id);
    const timeline = buildProductionTimeline({
      storyboard,
      directorApplyAudits: registry.audits,
    });
    assert.ok(timeline.timelineEvents.some((event) => event.kind === "director_rejected"));
  });

  it("compares apply baseline to current storyboard", () => {
    const baseline = buildApplyBaselineFromProposal({
      auditId: "audit-1",
      proposal: buildDirectorProposal({
        idea: "Compare test",
        storyboard: studioStoryboardDetail({ id: "sb-cmp", scenes: [] }),
        characters: [],
        locations: [],
        props: [],
        t: tEn,
      })!,
      storyboard: studioStoryboardDetail({
        id: "sb-cmp",
        scenes: [
          studioSceneDetail({ order: 0, title: "A", description: "One" }),
          studioSceneDetail({ order: 1, title: "B", description: "Two" }),
        ],
      }),
      t: tEn,
    });

    const compare = compareDirectorApplyBaseline({
      baseline,
      storyboard: studioStoryboardDetail({
        id: "sb-cmp",
        voiceProfile: "new_voice",
        scenes: [
          studioSceneDetail({ order: 0, title: "A changed", description: "One" }),
          studioSceneDetail({ order: 1, title: "B", description: "Two" }),
          studioSceneDetail({ order: 2, title: "C", description: "Three" }),
        ],
      }),
    });

    assert.ok(compare.hasChanges);
    assert.ok(compare.lines.some((line) => line.id === "scene-count"));
    assert.ok(compare.lines.some((line) => line.id === "voice-profile"));
  });

  it("Creative Review surfaces proposal retention suggestion", () => {
    const storyboard = studioStoryboardDetail({
      id: "sb-dir-review",
      scenes: [
        studioSceneDetail({ order: 0, title: "Keep", description: "Same" }),
      ],
    });
    const proposal = buildDirectorProposal({
      idea: "Retention review",
      storyboard,
      characters: [],
      locations: [],
      props: [],
      t: tEn,
    });
    assert.ok(proposal);

    recordDirectorProposalApplied({
      storyboardId: storyboard.id,
      proposal: proposal!,
      mode: "all",
      result: { ok: true, createdSceneIds: ["s1"], updatedSceneIds: [], skippedNewAssets: 0, errors: [] },
      storyboard,
      t: tEn,
    });

    const edited = studioStoryboardDetail({
      id: storyboard.id,
      scenes: [
        studioSceneDetail({ order: 0, title: "Rewritten", description: "Different" }),
      ],
    });

    recordDirectorModificationsIfDrift({
      storyboardId: storyboard.id,
      storyboard: edited,
      proposal: proposal!,
    });

    const review = buildCreativeReview({ storyboard: edited });
    assert.ok(
      review.improvementSuggestions.some(
        (item) => item.messageKey === "studio.directorDecision.retention.oftenEdited"
      )
    );
  });

  it("Creation Assistant exposes director learning keys", () => {
    const storyboard = studioStoryboardDetail({ id: "sb-dir-ca", scenes: [] });
    const proposal = buildDirectorProposal({
      idea: "Learning assistant",
      storyboard,
      characters: [],
      locations: [],
      props: [],
    });
    assert.ok(proposal);

    for (let i = 0; i < 2; i += 1) {
      recordDirectorProposalApplied({
        storyboardId: storyboard.id,
        proposal: proposal!,
        mode: "all",
        result: {
          ok: true,
          createdSceneIds: ["s1", "s2", "s3"],
          updatedSceneIds: [],
          skippedNewAssets: 0,
          errors: [],
        },
        storyboard: studioStoryboardDetail({
          id: storyboard.id,
          scenes: [
            studioSceneDetail({ order: 0 }),
            studioSceneDetail({ order: 1 }),
            studioSceneDetail({ order: 2 }),
          ],
        }),
        t: tEn,
      });
    }

    const view = buildCreationAssistantView({ storyboard });
    assert.ok(Array.isArray(view.directorLearningKeys));
  });

  it("resolveApplyAuditKind distinguishes partial apply", () => {
    const kind = resolveApplyAuditKind({
      mode: "scenes",
      result: { ok: true, createdSceneIds: ["s1"], updatedSceneIds: [], skippedNewAssets: 0, errors: [] },
      proposalSceneCount: 5,
    });
    assert.equal(kind, "director_partially_applied");
  });

  it("detectStoryboardDrift flags character removal", () => {
    const changes = detectStoryboardDrift({
      baseline: {
        appliedAt: new Date().toISOString(),
        auditId: "a1",
        proposalSceneCount: 1,
        voiceProfile: "",
        scenes: [
          {
            order: 0,
            title: "Scene",
            description: "Desc",
            characterIds: ["char-1"],
            locationId: null,
          },
        ],
      },
      storyboard: studioStoryboardDetail({
        scenes: [
          studioSceneDetail({
            order: 0,
            title: "Scene",
            description: "Desc",
            characters: [],
          }),
        ],
      }),
    });
    assert.ok(changes.some((change) => change.kind === "character_removed"));
  });

  it("has NL/EN i18n parity for director decision keys", () => {
    const prefixes = [
      "studio.directorDecision.",
      "studio.directorPreferences.",
      "studio.creationAssistant.section.directorLearning",
    ];
    for (const prefix of prefixes) {
      const nlKeys = Object.keys(nl).filter((key) => key.startsWith(prefix));
      const enKeys = Object.keys(en).filter((key) => key.startsWith(prefix));
      assert.deepEqual(nlKeys.sort(), enKeys.sort(), `parity failed for ${prefix}`);
    }

    const timelineNl = Object.keys(nl).filter((key) =>
      key.startsWith("studio.productionTimeline.event.director")
    );
    const timelineEn = Object.keys(en).filter((key) =>
      key.startsWith("studio.productionTimeline.event.director")
    );
    assert.deepEqual(timelineNl.sort(), timelineEn.sort());
  });
});
