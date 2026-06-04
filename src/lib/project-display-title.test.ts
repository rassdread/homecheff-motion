import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeProjectBundleName,
  previewBundleMembershipAfterRename,
  resolveProjectDisplayTitle,
} from "@/lib/project-display-title";

describe("project-display-title", () => {
  it("normalizes bundle names by trim, lowercase, and collapsed spaces", () => {
    assert.equal(normalizeProjectBundleName("HomeCheff Promo"), "homecheff promo");
    assert.equal(normalizeProjectBundleName("  homecheff   promo "), "homecheff promo");
  });

  it("uses Untitled video fallback instead of date as title", () => {
    assert.equal(resolveProjectDisplayTitle(null, "en"), "Untitled video");
    assert.equal(resolveProjectDisplayTitle("  ", "nl"), "Naamloze video");
    assert.equal(resolveProjectDisplayTitle("Garden Story", "en"), "Garden Story");
  });

  it("previews bundle membership after rename", () => {
    const preview = previewBundleMembershipAfterRename({
      ownerId: "user-1",
      projectType: "instant_premium",
      projectId: "p-b",
      newTitle: "HomeCheff Promo",
      peers: [
        { id: "p-a", title: "HomeCheff Promo", projectType: "instant_premium" },
        { id: "p-c", title: "Other", projectType: "instant_premium" },
      ],
      locale: "en",
    });
    assert.equal(preview.willJoinExisting, true);
    assert.equal(preview.existingVersionCount, 1);
    assert.deepEqual(preview.memberProjectIds, ["p-a"]);
  });
});
