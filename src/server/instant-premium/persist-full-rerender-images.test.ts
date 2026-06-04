import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computePersistedImageChangeAudit,
  type FullRerenderImageSequenceInput,
} from "@/server/instant-premium/persist-full-rerender-images";

function entry(
  partial: Partial<FullRerenderImageSequenceInput> & Pick<FullRerenderImageSequenceInput, "fileName" | "previewUrl" | "workingImageUrl">
): FullRerenderImageSequenceInput {
  return {
    mimeType: "image/jpeg",
    sizeBytes: 1,
    ...partial,
  };
}

describe("persist-full-rerender-images audit", () => {
  it("detects added and removed images", () => {
    const audit = computePersistedImageChangeAudit({
      beforeIds: ["a", "b"],
      afterIds: ["a", "c"],
      replacedImageIds: [],
    });
    assert.equal(audit.addedCount, 1);
    assert.equal(audit.removedCount, 1);
    assert.deepEqual(audit.addedImageIds, ["c"]);
    assert.deepEqual(audit.removedImageIds, ["b"]);
  });

  it("detects pure reorder", () => {
    const audit = computePersistedImageChangeAudit({
      beforeIds: ["a", "b", "c"],
      afterIds: ["c", "a", "b"],
      replacedImageIds: [],
    });
    assert.equal(audit.reordered, true);
    assert.equal(audit.addedCount, 0);
    assert.equal(audit.removedCount, 0);
  });

  it("counts replaced images", () => {
    const audit = computePersistedImageChangeAudit({
      beforeIds: ["a", "b"],
      afterIds: ["a", "b"],
      replacedImageIds: ["b"],
    });
    assert.equal(audit.replacedCount, 1);
    assert.deepEqual(audit.replacedImageIds, ["b"]);
  });
});

describe("persist-full-rerender-images module", () => {
  it("exports image sequence validation helpers", async () => {
    const mod = await import("@/server/instant-premium/persist-full-rerender-images");
    assert.equal(typeof mod.persistFullRerenderImagesForProject, "function");
    assert.equal(typeof mod.computePersistedImageChangeAudit, "function");
  });

  it("full rerender route wires image persistence", async () => {
    const src = await import("node:fs/promises").then((fs) =>
      fs.readFile(
        new URL("../../app/api/instant-premium/projects/[id]/full-rerender/route.ts", import.meta.url),
        "utf8"
      )
    );
    assert.match(src, /persistFullRerenderImagesForProject/);
    assert.match(src, /imageChangeAudit/);
  });

  it("full rerender service stores imageChanges in audit", async () => {
    const src = await import("node:fs/promises").then((fs) =>
      fs.readFile(
        new URL("./full-rerender-project.ts", import.meta.url),
        "utf8"
      )
    );
    assert.match(src, /imageChanges: imageChangeAudit/);
  });
});
