import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptySceneTextDraft } from "@/components/instant/instant-mode-panel";
import {
  assignImagesToSceneSlots,
  clearSceneImageByImageId,
  createWizardSceneSlot,
  deleteSceneAt,
  mergePersistedSceneSlotsWithImages,
  restoreSceneSlotsFromPersisted,
  sceneHasUserText,
  serializeSceneSlotsForPersist,
} from "@/lib/instant-wizard-scene-slots";
import { EMPTY_WIZARD_IMAGE_BLOB } from "@/lib/instant-wizard-image-model";

function makeImage(id: string) {
  return {
    id,
    originalFileName: `${id}.jpg`,
    mimeType: "image/jpeg",
    sizeBytes: 10,
    optimizedBlob: new Blob(["x"], { type: "image/jpeg" }),
    thumbnailBlob: new Blob(["t"], { type: "image/jpeg" }),
    bakedText: {
      enabled: false,
      status: "none" as const,
      blocks: [],
      exactText: "",
      positionY: 0.12,
      manualMode: false,
    },
  };
}

describe("instant wizard scene slots", () => {
  it("clear image keeps storyboard text", () => {
    const slots = [
      {
        ...createWizardSceneSlot(5, makeImage("a")),
        text: { ...emptySceneTextDraft(5), title: "Keep me" },
      },
    ];
    const cleared = clearSceneImageByImageId(slots, "a");
    assert.equal(cleared[0]!.image, null);
    assert.equal(cleared[0]!.text.title, "Keep me");
  });

  it("assignImagesToSceneSlots fills empty slots before appending", () => {
    const slots = [
      { ...createWizardSceneSlot(5, null), text: { ...emptySceneTextDraft(5), heroText: "Hero" } },
    ];
    const next = assignImagesToSceneSlots(slots, [makeImage("new")], 5);
    assert.equal(next.length, 1);
    assert.equal(next[0]!.image?.id, "new");
    assert.equal(next[0]!.text.heroText, "Hero");
  });

  it("delete scene removes text only on explicit delete", () => {
    const slots = [
      {
        ...createWizardSceneSlot(5, makeImage("a")),
        text: { ...emptySceneTextDraft(5), title: "Gone on delete" },
      },
    ];
    const deleted = deleteSceneAt(slots, 0);
    assert.equal(deleted.length, 0);
  });

  it("restoreSceneSlotsFromPersisted keeps storyboard without images", () => {
    const restored = restoreSceneSlotsFromPersisted(
      [
        {
          sceneId: "scene-1",
          text: {
            ...emptySceneTextDraft(5),
            title: "Survives refresh",
          },
          image: null,
        },
      ],
      [],
      undefined,
      5
    );
    assert.equal(restored.length, 1);
    assert.equal(restored[0]!.text.title, "Survives refresh");
    assert.equal(restored[0]!.image, null);
  });

  it("serialize and merge persisted slots round-trip metadata", () => {
    const slots = [
      {
        ...createWizardSceneSlot(5, {
          ...makeImage("img-1"),
          optimizedBlob: EMPTY_WIZARD_IMAGE_BLOB,
          thumbnailBlob: EMPTY_WIZARD_IMAGE_BLOB,
        }),
        text: { ...emptySceneTextDraft(5), subtitle: "Round trip" },
      },
    ];
    const serialized = serializeSceneSlotsForPersist(slots);
    const merged = mergePersistedSceneSlotsWithImages(
      serialized,
      [],
      undefined,
      5,
      (meta) => ({
        ...makeImage(meta.id),
        remoteWorkingUrl: meta.remoteWorkingUrl,
      })
    );
    assert.equal(merged[0]!.text.subtitle, "Round trip");
    assert.equal(merged[0]!.image?.id, "img-1");
  });

  it("sceneHasUserText detects saved copy", () => {
    assert.equal(sceneHasUserText({ ...emptySceneTextDraft(5), title: "Hello" }), true);
    assert.equal(sceneHasUserText(emptySceneTextDraft(5)), false);
  });
});
