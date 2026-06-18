import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assessIdentityDrift,
  buildIdentityPreservationProfile,
  enrichToolMatchWithIdentity,
  IDENTITY_DRIFT_THRESHOLD,
  mergeIdentityIntoSettings,
  profilePreserveLabels,
  resolveIdentityKind,
} from "@/lib/assistant-identity-preservation";
import { matchAssistantTool } from "@/lib/assistant-tool-matcher";
import { buildAssistantExecutionPreview } from "@/lib/assistant-v4-execution-preview";
import { buildAssistantContextSnapshot } from "@/lib/assistant-context-layer";
import { buildAssistantStudioContext } from "@/lib/assistant-studio-brain";
import { createAssistantSessionMemory } from "@/lib/assistant-session-memory";
import {
  readIdentityPreservationOverrides,
  writeIdentityPreservationOverrides,
  STUDIO_COPILOT_IDENTITY_PRESERVATION_KEY,
} from "@/lib/studio-copilot-identity-preservation-storage";
import { nl } from "@/i18n/locales/nl";
import { en } from "@/i18n/locales/en";
import type { AssistantToolMatchResult } from "@/types/assistant-v4";

function editorTurnInput(message: string, editorContext: Record<string, unknown> = {}) {
  const snapshot = buildAssistantContextSnapshot({ projects: [], libraryRecords: [] });
  const studio = buildAssistantStudioContext({ pathname: "/editor", snapshot });
  return {
    message,
    locale: "nl" as const,
    memory: createAssistantSessionMemory(),
    snapshot,
    studio,
    activeProject: null,
    pathname: "/editor",
    editorContext: { module: "editor" as const, ...editorContext },
    billingContext: { walletAvailableCredits: 500 },
  };
}

function stubMatch(overrides: Partial<AssistantToolMatchResult> = {}): AssistantToolMatchResult {
  return {
    bestTool: {
      toolId: "mascot_variant",
      displayNameNl: "Mascotte variant",
      displayNameEn: "Mascot variant",
      route: "/editor",
      defaultSettings: {},
      preserveOptions: [],
      creditActionType: "image_edit",
      isFreeLocal: false,
    } as never,
    alternativeTools: [],
    requiredSettings: {},
    recommendedSettings: {},
    preserveConstraints: [],
    estimatedCredits: 10,
    warnings: [],
    route: "/editor",
    blocked: false,
    unavailable: false,
    ...overrides,
  };
}

describe("assistant identity preservation", () => {
  it("human variant preserves identity by default", () => {
    const profile = buildIdentityPreservationProfile({
      taxonomyType: "human",
      assetName: "Alex",
      message: "maak hem een viking",
    });
    assert.equal(profile.kind, "human");
    assert.equal(profile.preserveFace, true);
    assert.equal(profile.preserveEyes, true);
    assert.ok(profile.lockedTraits.includes("face_structure"));
    const settings = mergeIdentityIntoSettings(profile, {});
    assert.equal(settings.preserveFace, true);
    assert.equal(settings.preserveIdentity, true);
  });

  it("animal variant preserves breed", () => {
    const profile = buildIdentityPreservationProfile({
      taxonomyType: "animal",
      assetName: "Max the dog",
      message: "maak mijn hond een piraat",
    });
    assert.equal(profile.kind, "animal");
    assert.equal(profile.preserveBreedCharacteristics, true);
    assert.ok(profile.lockedTraits.includes("breed"));
  });

  it("animal variant preserves fur pattern", () => {
    const profile = buildIdentityPreservationProfile({
      taxonomyType: "animal",
      assetName: "Bella",
      message: "pirate outfit",
    });
    assert.equal(profile.preserveFurPattern, true);
    const labels = profilePreserveLabels(profile, "nl");
    assert.ok(labels.some((l) => /vachtpatroon/i.test(l)));
  });

  it("mascot variant preserves face", () => {
    const profile = buildIdentityPreservationProfile({
      taxonomyType: "mascot",
      assetName: "Brand Mascot",
      message: "garden outfit",
    });
    assert.equal(profile.kind, "mascot");
    assert.equal(profile.preserveFace, true);
    assert.equal(profile.preserveBrandIdentity, true);
  });

  it("homecheff mascot preserves globe", () => {
    const kind = resolveIdentityKind({ assetName: "Globe Man", taxonomyType: "mascot" });
    assert.equal(kind, "homecheff_mascot");
    const profile = buildIdentityPreservationProfile({
      assetName: "Globe Man",
      message: "maak hem garden chef",
    });
    assert.equal(profile.preserveGlobe, true);
    const labels = profilePreserveLabels(profile, "en");
    assert.ok(labels.some((l) => /globe/i.test(l)));
  });

  it("homecheff mascot preserves personality", () => {
    const profile = buildIdentityPreservationProfile({
      assetName: "Globe Man",
      message: "chef outfit",
    });
    assert.equal(profile.preservePersonality, true);
    assert.ok(profile.lockedTraits.includes("personality"));
  });

  it("identity drift warning triggers on high drift message", () => {
    const profile = buildIdentityPreservationProfile({
      assetName: "Globe Man",
      message: "geef hem een nieuw gezicht",
    });
    const drift = assessIdentityDrift({
      profile,
      message: "geef hem een nieuw gezicht",
      recommendedSettings: { preserveFace: false },
    });
    assert.ok(drift.driftScore >= IDENTITY_DRIFT_THRESHOLD);
    assert.equal(drift.exceedsThreshold, true);
    assert.ok(drift.warningNl?.includes("kernidentiteit"));
  });

  it("preview shows preserved traits", () => {
    const turn = editorTurnInput("maak hem garden outfit", {
      selectedAssetName: "Globe Man",
      selectedAssetType: "mascot",
      taxonomyType: "mascot",
    });
    const match = matchAssistantTool({
      message: turn.message,
      locale: turn.locale,
      turnInput: turn,
      availableCredits: 500,
    });
    assert.ok(match?.identityProfile);
    const preview = buildAssistantExecutionPreview({
      locale: "nl",
      message: turn.message,
      match: match!,
      availableCredits: 500,
      assetName: "Globe Man",
    });
    assert.ok(preview.preserveItems.length > 0);
    assert.ok(
      preview.preserveItems.some((item) => /gezicht|globe|wereldbol|persoonlijkheid/i.test(item))
    );
    assert.ok(preview.identityRetentionPercent != null && preview.identityRetentionPercent >= 60);
  });

  it("advanced preservation settings persist", () => {
    writeIdentityPreservationOverrides({
      preserveFace: false,
      preserveEyes: true,
      preserveMouth: true,
      preservePersonality: true,
      preserveBodyShape: true,
      preserveCoreShape: true,
      preserveBrandIdentity: true,
    });
    const stored = readIdentityPreservationOverrides();
    assert.equal(stored.preserveFace, false);
    assert.equal(STUDIO_COPILOT_IDENTITY_PRESERVATION_KEY, "homecheff:studio-copilot-identity-preservation");
    writeIdentityPreservationOverrides({
      preserveFace: true,
      preserveEyes: true,
      preserveMouth: true,
      preservePersonality: true,
      preserveBodyShape: true,
      preserveCoreShape: true,
      preserveBrandIdentity: true,
    });
  });

  it("tool receives identityProfile via enrichToolMatchWithIdentity", () => {
    const enriched = enrichToolMatchWithIdentity({
      match: stubMatch(),
      assetType: "mascot",
      assetName: "Globe Man",
      taxonomyType: "mascot",
      message: "chef outfit",
      locale: "nl",
    });
    assert.ok(enriched.identityProfile);
    assert.ok(enriched.recommendedSettings.preserveFace);
    assert.ok(enriched.recommendedSettings.preserveGlobe);
    assert.ok(enriched.identityDrift);
  });

  it("i18n parity for identity preservation keys", () => {
    const keys = [
      "assistant.clarity.identity.title",
      "assistant.clarity.identity.face",
      "assistant.clarity.identity.eyes",
      "assistant.clarity.identity.mouth",
      "assistant.clarity.identity.personality",
      "assistant.clarity.identity.bodyShape",
      "assistant.clarity.identity.coreSilhouette",
      "assistant.clarity.identity.brandIdentity",
      "assistant.v4.preview.identityRetention",
      "assistant.v4.preview.changes",
    ] as const;
    for (const key of keys) {
      assert.ok(nl[key], `missing nl key ${key}`);
      assert.ok(en[key], `missing en key ${key}`);
    }
  });
});
