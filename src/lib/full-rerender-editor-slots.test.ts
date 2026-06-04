import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFullRerenderImageSequencePayload,
  buildFullRerenderSlotsFromProject,
  computeImageChangeAuditFromSlots,
  moveFullRerenderSlotsByImageId,
  removeFullRerenderSlotAt,
  validateFullRerenderSlotsForRender,
} from "@/lib/full-rerender-editor-slots";
import type { FullRerenderEditorSlot } from "@/lib/full-rerender-editor-types";

describe("full-rerender-editor-slots", () => {
  it("builds slots with aligned scene texts", () => {
    const slots = buildFullRerenderSlotsFromProject({
      images: [
        { id: "img-a", previewUrl: "https://cdn.example/a.jpg" },
        { id: "img-b", previewUrl: "https://cdn.example/b.jpg" },
      ],
      instantSceneTexts: [{ heroText: "A" }, { heroText: "B" }],
      transitionSeconds: 5,
    });
    assert.equal(slots.length, 2);
    assert.equal(slots[0]?.image?.id, "img-a");
    assert.equal(slots[0]?.text.heroText, "A");
    assert.equal(slots[1]?.text.heroText, "B");
  });

  it("reorders image and text together", () => {
    const slots = buildFullRerenderSlotsFromProject({
      images: [
        { id: "img-a", previewUrl: "https://cdn.example/a.jpg" },
        { id: "img-b", previewUrl: "https://cdn.example/b.jpg" },
      ],
      instantSceneTexts: [{ heroText: "A" }, { heroText: "B" }],
      transitionSeconds: 5,
    });
    const reordered = moveFullRerenderSlotsByImageId(slots, "img-a", "img-b");
    assert.equal(reordered[0]?.image?.id, "img-b");
    assert.equal(reordered[0]?.text.heroText, "B");
    assert.equal(reordered[1]?.text.heroText, "A");
  });

  it("maps payload with new image rows", () => {
    const slots: FullRerenderEditorSlot[] = [
      {
        sceneId: "s1",
        image: {
          id: "new-abc",
          isNew: true,
          previewUrl: "https://cdn.example/new.jpg",
          originalFileName: "new.jpg",
          remoteWorkingUrl: "https://cdn.example/working.jpg",
          remoteThumbnailUrl: "https://cdn.example/new.jpg",
        },
        text: { heroText: "N" } as FullRerenderEditorSlot["text"],
      },
    ];
    const payload = buildFullRerenderImageSequencePayload(slots);
    assert.equal(payload.sequence.length, 1);
    assert.equal(payload.sequence[0]?.imageId, undefined);
    assert.equal(payload.sequence[0]?.workingImageUrl, "https://cdn.example/working.jpg");
  });

  it("tracks replace and reorder in audit", () => {
    const initial = ["img-a", "img-b", "img-c"];
    const slots = buildFullRerenderSlotsFromProject({
      images: initial.map((id, index) => ({
        id,
        previewUrl: `https://cdn.example/${index}.jpg`,
      })),
      instantSceneTexts: [{}, {}, {}],
      transitionSeconds: 5,
    });
    const reordered = moveFullRerenderSlotsByImageId(slots, "img-c", "img-a");
    reordered[1] = {
      ...reordered[1]!,
      image: reordered[1]?.image
        ? { ...reordered[1].image, isReplaced: true }
        : null,
    };
    const audit = computeImageChangeAuditFromSlots(initial, reordered);
    assert.equal(audit.reordered, true);
    assert.equal(audit.replacedCount, 1);
  });

  it("enforces minimum image count", () => {
    const slots = buildFullRerenderSlotsFromProject({
      images: [{ id: "img-a", previewUrl: "https://cdn.example/a.jpg" }],
      instantSceneTexts: [{}],
      transitionSeconds: 5,
    });
    const removed = removeFullRerenderSlotAt(slots, 0);
    const err = validateFullRerenderSlotsForRender({
      slots: removed,
      instantMode: "story",
    });
    assert.match(err ?? "", /At least 2 images/);
  });
});
