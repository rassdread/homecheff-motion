import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PX4A_ITEM_CREATOR_PATH,
  PX4A_ITEM_MAX_TOKEN_CHARS,
  boundListingPhotoUrls,
  canonicalItemHandoffBody,
  isHttpsListingUrl,
  isItemHandoffTokenSizeOk,
  isPx4aItemCreatorPath,
  isPx4aStandaloneCreatorPath,
  itemReturnHref,
  normalizeItemPhotoUrls,
  normalizeItemReturnPath,
  parseItemHandoffPayload,
  withItemReturnResult,
} from "@/lib/photo-video/item-handoff";
import {
  createItemHandoffPayload,
  signItemHandoffPayload,
  verifyItemHandoffToken,
} from "@/lib/photo-video/item-handoff-crypto";
import { validatePhotoVideoExportComposition } from "@/lib/photo-video/export-validate";
import { addPhotos, createLocalPhoto, createPhotoVideoComposition } from "@/lib/photo-video/composition";
import { isPublicStudioSurface, validateStudioReturnTo } from "@/lib/identity/return-path";
import { isAllowedPostAuthPath } from "@/lib/auth-post-auth-redirect";

describe("PX.4A.4 item handoff", () => {
  it("accepts only https listing URLs and /sell/new return", () => {
    assert.equal(isHttpsListingUrl("https://blob.vercel-storage.com/a.jpg"), true);
    assert.equal(isHttpsListingUrl("http://insecure.example/a.jpg"), false);
    assert.equal(isHttpsListingUrl("javascript:alert(1)"), false);
    assert.deepEqual(
      normalizeItemPhotoUrls(["https://cdn.example/a.jpg", "https://cdn.example/a.jpg", "http://x/y"], 12),
      ["https://cdn.example/a.jpg"]
    );
    assert.equal(normalizeItemReturnPath("/sell/new?px4a=1"), "/sell/new");
    assert.equal(normalizeItemReturnPath("/studio"), null);
    assert.equal(normalizeItemReturnPath("//evil"), null);
  });

  it("signs and verifies HMAC tokens without putting media in the creator path", () => {
    const payload = createItemHandoffPayload({
      centralUserId: "user-1",
      photoUrls: ["https://cdn.example/p1.jpg", "https://cdn.example/p2.jpg"],
      nowSec: 1_000_000,
    });
    assert.ok(payload);
    const token = signItemHandoffPayload(payload!, "test-secret");
    const verified = verifyItemHandoffToken(token, ["test-secret"], 1_000_000);
    assert.deepEqual(verified, payload);
    assert.equal(verifyItemHandoffToken(token, ["other"], 1_000_000), null);
    assert.equal(verifyItemHandoffToken(token, ["test-secret"], 1_000_000 + 8 * 60 * 60), null);
    assert.equal(isPx4aItemCreatorPath(PX4A_ITEM_CREATOR_PATH), true);
    assert.equal(isPx4aStandaloneCreatorPath("/studio/photo-video"), true);
    assert.equal(isPx4aStandaloneCreatorPath("/studio/photo-video?resume=1"), true);
    assert.equal(isPx4aStandaloneCreatorPath(PX4A_ITEM_CREATOR_PATH), false);
    assert.equal(canonicalItemHandoffBody(payload!).includes("http://"), false);
  });

  it("rejects tampered payloads and foreign return paths", () => {
    const payload = parseItemHandoffPayload({
      v: 1,
      u: "u1",
      p: ["https://cdn.example/a.jpg"],
      e: Date.now() / 1000 + 60,
      r: "/account",
    });
    assert.equal(payload, null);
  });

  it("keeps from-item private and allowlisted for SSO returnTo", () => {
    assert.equal(validateStudioReturnTo("/studio/photo-video/from-item"), "/studio/photo-video/from-item");
    assert.equal(isPublicStudioSurface("/studio/photo-video/from-item"), false);
    assert.equal(isPublicStudioSurface("/studio/photo-video"), true);
    assert.equal(isAllowedPostAuthPath("/studio/photo-video/from-item"), true);
  });

  it("binds listing photos only to the signed central user", () => {
    const payload = createItemHandoffPayload({
      centralUserId: "user-1",
      photoUrls: ["https://cdn.example/p1.jpg"],
      nowSec: 1_000_000,
    });
    assert.deepEqual(boundListingPhotoUrls(payload, "user-1"), ["https://cdn.example/p1.jpg"]);
    assert.deepEqual(boundListingPhotoUrls(payload, "user-2"), []);
    assert.doesNotMatch(itemReturnHref("https://homecheff.eu", payload, "user-1"), /cdn\.example/);
    assert.ok(withItemReturnResult("https://homecheff.eu/sell/new?px4a=1", "ready").includes("px4aResult=ready"));
    assert.equal(isItemHandoffTokenSizeOk("a".repeat(PX4A_ITEM_MAX_TOKEN_CHARS + 1)), false);
  });

  it("allows composition export preflight when duration is valid", () => {
    let composition = createPhotoVideoComposition(undefined, "homecheff-item");
    composition = addPhotos(composition, [
      createLocalPhoto({ id: "a", previewUrl: "blob:a", naturalWidth: 10, naturalHeight: 10 }),
      createLocalPhoto({ id: "b", previewUrl: "blob:b", naturalWidth: 10, naturalHeight: 10 }),
    ]);
    const result = validatePhotoVideoExportComposition(composition, "homecheff-item");
    assert.equal(result.ok, true);
  });
});
