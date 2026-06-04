import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { emptySceneTextDraft } from "@/components/instant/instant-mode-panel";
import {
  buildFullRerenderRenderBodyFromDraft,
  draftPayloadToEditorSlots,
  parseFullRerenderDraftPayload,
  serializeFullRerenderDraftPayload,
} from "@/lib/full-rerender-draft";
import { buildStoryboardOverlayPreviewLines } from "@/lib/storyboard-overlay-preview";
import { createWizardSceneId } from "@/lib/instant-wizard-scene-slots";

describe("full-rerender-draft", () => {
  it("persists multiple subtitle beats through serialize and parse", () => {
    const slots = [
      {
        sceneId: createWizardSceneId(),
        image: {
          id: "img-1",
          previewUrl: "https://cdn.example.com/a.jpg",
          originalFileName: "a.jpg",
        },
        text: {
          ...emptySceneTextDraft(5),
          subtitleBeats: ["Beat one", "Beat two", "Beat three"],
          subtitle: "Beat one",
        },
      },
    ];
    const payload = serializeFullRerenderDraftPayload({
      slots,
      versionNote: "test",
      userIntent: "intent",
      transitionSeconds: 5,
      instantMode: "transition",
      expandedIndex: 0,
      initialImageIds: ["img-1"],
    });
    const json = JSON.stringify(payload);
    const restored = parseFullRerenderDraftPayload(JSON.parse(json));
    assert.ok(restored);
    const editorSlots = draftPayloadToEditorSlots(restored);
    assert.deepEqual(editorSlots[0]?.text.subtitleBeats, [
      "Beat one",
      "Beat two",
      "Beat three",
    ]);
  });

  it("restores draft state after close and reopen roundtrip", () => {
    const payload = serializeFullRerenderDraftPayload({
      slots: [
        {
          sceneId: "scene-a",
          image: null,
          text: {
            ...emptySceneTextDraft(5),
            title: "Saved title",
            headlineBeats: ["MOVEMENT"],
          },
        },
      ],
      versionNote: "v2",
      userIntent: "More energy",
      transitionSeconds: 8,
      instantMode: "story",
      expandedIndex: 2,
      initialImageIds: [],
    });
    const parsed = parseFullRerenderDraftPayload(JSON.parse(JSON.stringify(payload)));
    assert.ok(parsed);
    assert.equal(parsed.versionNote, "v2");
    assert.equal(parsed.userIntent, "More energy");
    assert.equal(parsed.transitionSeconds, 8);
    assert.equal(parsed.instantMode, "story");
    assert.equal(parsed.expandedIndex, 2);
    assert.equal(draftPayloadToEditorSlots(parsed)[0]?.text.title, "Saved title");
  });

  it("buildFullRerenderRenderBodyFromDraft uses saved beats for render", () => {
    const payload = serializeFullRerenderDraftPayload({
      slots: [
        {
          sceneId: "scene-1",
          image: {
            id: "img-1",
            previewUrl: "https://cdn.example.com/a.jpg",
            originalFileName: "a.jpg",
            remoteWorkingUrl: "https://cdn.example.com/work.jpg",
          },
          text: {
            ...emptySceneTextDraft(5),
            subtitleBeats: ["First", "Second"],
            subtitle: "First",
          },
        },
        {
          sceneId: "scene-2",
          image: {
            id: "img-2",
            previewUrl: "https://cdn.example.com/b.jpg",
            originalFileName: "b.jpg",
            remoteWorkingUrl: "https://cdn.example.com/work2.jpg",
          },
          text: emptySceneTextDraft(5),
        },
      ],
      versionNote: "",
      userIntent: "",
      transitionSeconds: 5,
      instantMode: "transition",
      expandedIndex: 0,
      initialImageIds: ["img-1", "img-2"],
    });
    const body = buildFullRerenderRenderBodyFromDraft(payload);
    assert.equal(body.sceneTexts.length, 2);
    const beats = body.sceneTexts[0]?.subtitleBeats;
    assert.ok(Array.isArray(beats));
    assert.equal(beats?.length, 2);
    assert.equal(beats?.[0], "First");
    assert.equal(beats?.[1], "Second");
    assert.equal(body.imageChanges.sequence.length, 2);
  });

  it("DELETE draft API route exists for concept removal", () => {
    const route = readFileSync(
      join(process.cwd(), "src/app/api/instant-premium/projects/[id]/full-rerender-draft/route.ts"),
      "utf8"
    );
    assert.match(route, /export async function DELETE/);
    assert.match(route, /deleteFullRerenderDraft/);
  });

  it("live preview shows all subtitle beats", () => {
    const scene = {
      ...emptySceneTextDraft(5),
      template: "scene" as const,
      subtitleBeats: ["Line A", "Line B"],
      subtitle: "Line A",
    };
    const lines = buildStoryboardOverlayPreviewLines(scene);
    const subtitleLines = lines.filter((line) => line.kind === "subtitle");
    assert.equal(subtitleLines.length, 2);
    assert.equal(subtitleLines[0]?.text, "Line A");
    assert.equal(subtitleLines[1]?.text, "Line B");
  });
});
