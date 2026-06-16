import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAssistantContextSnapshot } from "@/lib/assistant-context-layer";
import { interpretConversationally } from "@/lib/assistant-conversational-interpretation";
import { detectIntentCluster } from "@/lib/assistant-intent-clusters";
import { processAssistantTurn } from "@/lib/assistant-orchestrator";
import {
  buildProducerResponse,
  isGenericAssistantFallbackMessageKey,
  producerResponseFromInterpretation,
} from "@/lib/assistant-producer-response";
import { createAssistantSessionMemory } from "@/lib/assistant-session-memory";
import type { LibraryConsistencyRecord } from "@/types/library-consistency";

function emptySnapshot() {
  return buildAssistantContextSnapshot({ projects: [], libraryRecords: [] });
}

function snapshotWithMascots(records: LibraryConsistencyRecord[]) {
  return buildAssistantContextSnapshot({ projects: [], libraryRecords: records });
}

function assistantReply(turn: ReturnType<typeof processAssistantTurn>) {
  return turn.messages.find((row) => row.role === "assistant");
}

describe("assistant v7 producer intelligence", () => {
  it("maps mascotte alternatief to mascot_variant cluster", () => {
    const message = "ik wil een mascotte alternatief maken";
    const cluster = detectIntentCluster(message);
    assert.equal(cluster?.clusterId, "mascot_variant");
    const interpretation = interpretConversationally(message, { locale: "nl" });
    assert.ok(interpretation);
    assert.equal(interpretation?.detectedIntent, "mascot_variant");
    assert.match(interpretation?.understoodGoal ?? "", /alternatieve versie van een mascotte/i);
  });

  it("mascot variant never returns generic fallback in orchestrator", () => {
    const turn = processAssistantTurn({
      message: "ik wil een mascotte alternatief maken",
      memory: createAssistantSessionMemory(),
      snapshot: emptySnapshot(),
      isAuthenticated: true,
      locale: "nl",
    });
    const reply = assistantReply(turn);
    assert.ok(reply);
    assert.notEqual(reply?.messageKey, "assistant.reply.unknown");
    assert.equal(reply?.messageKey, "assistant.reply.producer");
    assert.ok((reply?.producerResponse?.options.length ?? 0) >= 3);
    assert.ok(
      reply?.producerResponse?.options.some((row) => row.label.includes("mascotte")) ||
        reply?.producerResponse?.options.some((row) => row.label.includes("Mascotte"))
    );
  });

  it("kan je me helpen returns smart low-confidence options", () => {
    const turn = processAssistantTurn({
      message: "kan je me helpen",
      memory: createAssistantSessionMemory(),
      snapshot: emptySnapshot(),
      isAuthenticated: true,
      locale: "nl",
    });
    const reply = assistantReply(turn);
    assert.equal(reply?.messageKey, "assistant.reply.producer");
    assert.match(reply?.producerResponse?.shortReply ?? "", /Zeker|helpen/i);
    assert.ok((reply?.producerResponse?.options.length ?? 0) >= 4);
    assert.ok(
      reply?.producerResponse?.options.some((row) => /video/i.test(row.label))
    );
  });

  it("iets met voetbal returns sports alternatives", () => {
    const interpretation = interpretConversationally("ik wil iets met voetbal", { locale: "nl" });
    assert.ok(interpretation);
    assert.ok(
      interpretation?.detectedIntent === "create_motion_video" ||
        (interpretation?.alternativeIntents?.length ?? 0) >= 2
    );
    const producer = buildProducerResponse({
      message: "ik wil iets met voetbal",
      interpretation: interpretation!,
      context: { locale: "nl" },
      clusterId: "sports_action",
    });
    assert.ok(producer.options.length >= 2);
  });

  it("mensen herkennen mij op straat maps to fans_recognize_me", () => {
    const interpretation = interpretConversationally("mensen herkennen mij op straat", {
      locale: "nl",
    });
    assert.ok(interpretation);
    assert.equal(interpretation?.likelyPresetId, "fans_recognize_me");
  });

  it("subtle celebrity arrival stays in celebrity_scene cluster", () => {
    const message = "niet te overdreven beroemd aankomen";
    const cluster = detectIntentCluster(message);
    assert.equal(cluster?.clusterId, "celebrity_scene");
    const interpretation = interpretConversationally(message, { locale: "nl" });
    assert.ok(interpretation);
    assert.ok(
      interpretation?.intensity === "subtle" ||
        interpretation?.constraints?.includes("not too exaggerated")
    );
  });

  it("alleen kleding gezicht hetzelfde maps outfit_change with protectFace", () => {
    const message = "alleen kleding, gezicht hetzelfde";
    const cluster = detectIntentCluster(message);
    assert.equal(cluster?.clusterId, "outfit_change");
    const interpretation = interpretConversationally(message, { locale: "nl" });
    assert.ok(interpretation);
    assert.equal(interpretation?.detectedIntent, "outfit_from_reference");
    assert.equal(interpretation?.prefillHints?.protectFace, true);
    assert.equal(interpretation?.prefillHints?.clothingOnly, true);
  });

  it("logged-out mascot request returns login-aware producer response", () => {
    const interpretation = interpretConversationally("ik wil een mascotte alternatief maken", {
      locale: "nl",
      isAuthenticated: false,
    });
    assert.ok(interpretation);
    const producer = producerResponseFromInterpretation(
      "ik wil een mascotte alternatief maken",
      interpretation,
      { locale: "nl", isAuthenticated: false }
    );
    assert.equal(producer.requiresLogin, true);
    assert.match(producer.shortReply, /inloggen/i);
  });

  it("library mascot context changes mascot variant response", () => {
    const records: LibraryConsistencyRecord[] = [
      {
        id: "rec_mascot_1",
        assetName: "Chef mascotte",
        category: "characters",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        projectId: "proj_1",
        projectTitle: "Demo",
        thumbnailUrl: null,
        storageKey: "k1",
        generationType: "character",
      } as LibraryConsistencyRecord,
    ];
    const interpretation = interpretConversationally("ik wil een mascotte alternatief maken", {
      locale: "nl",
      snapshot: snapshotWithMascots(records),
      isAuthenticated: true,
    });
    assert.ok(interpretation);
    assert.match(interpretation?.understoodGoal ?? "", /bibliotheek/i);
    const producer = producerResponseFromInterpretation(
      "ik wil een mascotte alternatief maken",
      interpretation,
      { locale: "nl", snapshot: snapshotWithMascots(records), isAuthenticated: true }
    );
    assert.match(producer.shortReply, /bibliotheek/i);
  });

  it("common creative requests do not use generic fallback message key", () => {
    const phrases = [
      "ik wil een mascotte alternatief maken",
      "kan je me helpen",
      "ik wil iets met voetbal",
      "mensen herkennen mij op straat",
      "alleen kleding, gezicht hetzelfde",
      "klaarzetten voor TikTok",
    ];
    for (const phrase of phrases) {
      const turn = processAssistantTurn({
        message: phrase,
        memory: createAssistantSessionMemory(),
        snapshot: emptySnapshot(),
        isAuthenticated: true,
        locale: "nl",
      });
      const reply = assistantReply(turn);
      assert.ok(reply, `missing reply for: ${phrase}`);
      assert.equal(
        isGenericAssistantFallbackMessageKey(reply!.messageKey),
        false,
        `generic fallback for: ${phrase}`
      );
    }
  });

  it("mascot golden path includes expected option labels", () => {
    const producer = producerResponseFromInterpretation(
      "ik wil een mascotte alternatief maken",
      interpretConversationally("ik wil een mascotte alternatief maken", { locale: "nl" }),
      { locale: "nl" }
    );
    const labels = producer.options.map((row) => row.label);
    assert.ok(labels.some((label) => /uploaden|upload/i.test(label)));
    assert.ok(labels.some((label) => /bibliotheek|library/i.test(label)));
    assert.ok(labels.some((label) => /nieuwe mascotte|new mascot/i.test(label)));
    assert.ok(labels.some((label) => /animatie|motion/i.test(label)));
  });
});
