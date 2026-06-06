import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildVersionLineageTree } from "@/lib/build-version-lineage-tree";
import type { AnimationProjectDetailResponse } from "@/types/animation-api";

describe("buildVersionLineageTree", () => {
  it("chains text versions under original", () => {
    const tree = buildVersionLineageTree({
      id: "p1",
      title: "Demo",
      status: "completed",
      createdAt: "2024-01-01T00:00:00.000Z",
      renderVersions: [
        {
          id: "rv1",
          renderVersionNumber: 1,
          kind: "initial",
          status: "completed",
          isDefault: false,
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "rv2",
          renderVersionNumber: 2,
          kind: "text_rerender",
          status: "completed",
          isDefault: true,
          createdAt: "2024-01-02T00:00:00.000Z",
          versionNote: "Headline tweak",
        },
      ],
      languageExports: [
        {
          id: "le1",
          languageCode: "nl",
          languageLabel: "Dutch",
          status: "completed",
          createdAt: "2024-01-03T00:00:00.000Z",
        },
      ],
    } as AnimationProjectDetailResponse);

    assert.ok(tree);
    assert.equal(tree?.kind, "original");
    assert.ok(tree?.children.length > 0);
  });
});
