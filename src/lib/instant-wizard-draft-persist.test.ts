import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptySceneTextDraft } from "@/components/instant/instant-mode-panel";
import { createWizardDraftId } from "@/lib/instant-premium-wizard-storage";
import { shouldPersistWizardDraftState } from "@/lib/instant-wizard-image-cleanup";
import {
  clearSceneImageByImageId,
  createWizardSceneSlot,
  restoreSceneSlotsFromPersisted,
  serializeSceneSlotsForPersist,
} from "@/lib/instant-wizard-scene-slots";

const emptyDraft = () => ({
  images: [] as [],
  sceneSlots: undefined as undefined,
  sceneTexts: undefined as undefined,
  step: 1,
  motionText: "",
  chips: [] as [],
  lockedTextLayers: [] as [],
});

describe("instant wizard draft persistence rules", () => {
  it("createWizardDraftId produces unique draft ids", () => {
    const a = createWizardDraftId();
    const b = createWizardDraftId();
    assert.match(a, /^draft-/);
    assert.notEqual(a, b);
  });

  it("keeps text-only storyboard drafts without images", () => {
    const slots = serializeSceneSlotsForPersist([
      {
        ...createWizardSceneSlot(5, null),
        text: { ...emptySceneTextDraft(5), title: "Survives refresh" },
      },
    ]);
    assert.equal(
      shouldPersistWizardDraftState({
        ...emptyDraft(),
        sceneSlots: slots,
        sceneTexts: slots.map((slot) => slot.text),
      }),
      true
    );
  });

  it("does not clear draft when all images are removed but slots remain", () => {
    const image = {
      id: "img-a",
      originalFileName: "a.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1,
      optimizedBlob: new Blob(["x"]),
      thumbnailBlob: new Blob(["t"]),
      bakedText: {
        enabled: false,
        status: "none" as const,
        blocks: [],
        exactText: "",
        positionY: 0.12,
        manualMode: false,
      },
    };
    const cleared = clearSceneImageByImageId(
      [{ ...createWizardSceneSlot(5, image), text: { ...emptySceneTextDraft(5), heroText: "Stay" } }],
      "img-a"
    );
    const slots = serializeSceneSlotsForPersist(cleared);
    assert.equal(
      shouldPersistWizardDraftState({
        ...emptyDraft(),
        sceneSlots: slots,
        sceneTexts: slots.map((slot) => slot.text),
      }),
      true
    );
  });

  it("clears empty step-1 drafts with no content", () => {
    assert.equal(shouldPersistWizardDraftState(emptyDraft()), false);
  });

  it("restoreSceneSlotsFromPersisted round-trips storyboard text without images", () => {
    const restored = restoreSceneSlotsFromPersisted(
      [
        {
          sceneId: "scene-keep",
          text: { ...emptySceneTextDraft(5), subtitle: "After reload" },
          image: null,
        },
      ],
      [],
      undefined,
      5
    );
    assert.equal(restored[0]!.text.subtitle, "After reload");
    assert.equal(restored[0]!.image, null);
    assert.equal(restored[0]!.sceneId, "scene-keep");
  });

  it("persists overlayLayerStyles in scene slots when customized", () => {
    const slots = serializeSceneSlotsForPersist([
      {
        ...createWizardSceneSlot(5, null),
        text: {
          ...emptySceneTextDraft(5),
          title: "Styled",
          overlayLayerStyles: { title: { fontSize: "smaller" } },
        },
      },
    ]);
    const restored = restoreSceneSlotsFromPersisted(slots, undefined, 5);
    assert.deepEqual(restored[0]!.text.overlayLayerStyles, {
      title: { fontSize: "smaller" },
    });
    assert.deepEqual(serializeSceneSlotsForPersist(restored)[0]!.text.overlayLayerStyles, {
      title: { fontSize: "smaller" },
    });
  });
});
