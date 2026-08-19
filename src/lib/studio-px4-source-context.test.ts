import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { isPublicStudioSurface, validateStudioReturnTo } from "@/lib/identity/return-path";
import { PX3_INTENTS } from "@/lib/studio-px3-home";
import {
  PX4_EXCLUDED_LISTING_FIELDS,
  PX4_MEDIA_CAP,
  authorizeOwnerProductProjection,
  isPx4OpaqueId,
  normalizeHttpsMediaUrls,
  normalizeStudioSourceContext,
  px4IntentHref,
  px4SessionRememberPayload,
  signStudioSourceContextRequest,
  studioPx4CanonicalPath,
  studioPx4SsoReturnTo,
  verifyStudioSourceContextRequest,
} from "@/lib/studio-px4-source-context";

const OWNER = "11111111-1111-4111-8111-111111111111";
const PRODUCT = "22222222-2222-4222-8222-222222222222";
const FOREIGN = "33333333-3333-4333-8333-333333333333";

describe("PX.4 source context", () => {
  it("uses a path-based deep link that survives SSO returnTo stripping", () => {
    const path = studioPx4CanonicalPath("product", PRODUCT);
    assert.equal(path, `/studio/from/homecheff/product/${PRODUCT}`);
    assert.equal(studioPx4SsoReturnTo("product", PRODUCT), path);
    assert.equal(validateStudioReturnTo(`${path}?title=secret&id=${FOREIGN}`), path);
    assert.equal(isPublicStudioSurface(path), false);
  });

  it("does not accept listing PII in query as the transport", () => {
    const leaked = `/studio/experience?source=homecheff&title=Roti&description=private`;
    assert.equal(validateStudioReturnTo(leaked), "/studio/experience");
  });

  it("rejects non-uuid identifiers", () => {
    assert.equal(isPx4OpaqueId("not-a-uuid"), false);
    assert.equal(isPx4OpaqueId(PRODUCT), true);
    assert.equal(normalizeStudioSourceContext({ sourceType: "product", sourceId: "abc" }), null);
  });

  it("caps media and drops non-https URLs", () => {
    const urls = Array.from({ length: 12 }, (_, i) => `https://blob.vercel-storage.com/p${i}.jpg`);
    urls.push("http://insecure.example/a.jpg", "javascript:alert(1)", "data:image/png;base64,xx");
    const media = normalizeHttpsMediaUrls(urls);
    assert.equal(media.length, PX4_MEDIA_CAP);
    assert.ok(media.every((item) => item.url.startsWith("https://")));
  });

  it("authorizes only the listing owner and hides foreign rows", () => {
    const own = authorizeOwnerProductProjection(
      { id: PRODUCT, sellerUserId: OWNER, integrityStatus: "ACTIVE" },
      OWNER,
    );
    assert.equal(own.ok, true);
    const foreign = authorizeOwnerProductProjection(
      { id: PRODUCT, sellerUserId: OWNER, integrityStatus: "ACTIVE" },
      FOREIGN,
    );
    assert.equal(foreign.ok, false);
    const missing = authorizeOwnerProductProjection(null, OWNER);
    assert.equal(missing.ok, false);
    const removed = authorizeOwnerProductProjection(
      { id: PRODUCT, sellerUserId: OWNER, integrityStatus: "REMOVED" },
      OWNER,
    );
    assert.equal(removed.ok, false);
  });

  it("HMAC rejects tampered identity or expired timestamps", () => {
    const secret = "px4-test-secret-value-16";
    const timestampSec = 1_700_000_000;
    const signature = signStudioSourceContextRequest({
      secret,
      timestampSec,
      centralUserId: OWNER,
      sourceType: "product",
      sourceId: PRODUCT,
    });
    assert.equal(
      verifyStudioSourceContextRequest({
        secrets: [secret],
        timestampSec,
        nowSec: timestampSec,
        signature,
        centralUserId: OWNER,
        sourceType: "product",
        sourceId: PRODUCT,
      }),
      true,
    );
    assert.equal(
      verifyStudioSourceContextRequest({
        secrets: [secret],
        timestampSec,
        nowSec: timestampSec,
        signature,
        centralUserId: FOREIGN,
        sourceType: "product",
        sourceId: PRODUCT,
      }),
      false,
    );
    assert.equal(
      verifyStudioSourceContextRequest({
        secrets: [secret],
        timestampSec,
        nowSec: timestampSec + 120,
        signature,
        centralUserId: OWNER,
        sourceType: "product",
        sourceId: PRODUCT,
      }),
      false,
    );
  });

  it("maps PX.3 intents without bypassing the chooser", () => {
    assert.equal(px4IntentHref("image"), "/editor/start");
    assert.equal(px4IntentHref("video"), "/studio/start");
    assert.equal(px4IntentHref("story"), "/studio/storyboards/new");
    assert.equal(px4IntentHref("animation"), "/motion/start");
    assert.equal(PX3_INTENTS.length, 5);
  });

  it("session remember payload stores ids only", () => {
    const raw = px4SessionRememberPayload({ sourceType: "product", sourceId: PRODUCT });
    assert.doesNotMatch(raw, /title|description|price|fileUrl/i);
    assert.match(raw, new RegExp(PRODUCT));
  });

  it("excludes commerce and private listing fields from the contract", () => {
    assert.ok(PX4_EXCLUDED_LISTING_FIELDS.includes("priceCents"));
    assert.ok(PX4_EXCLUDED_LISTING_FIELDS.includes("kvk"));
    const page = readFileSync("src/app/studio/from/homecheff/[type]/[id]/page.tsx", "utf8");
    assert.match(page, /redirectUnauthenticatedPrivate/);
    assert.match(page, /StudioPx4ContextualIntentChooser/);
    const api = readFileSync("src/app/api/studio/source-context/route.ts", "utf8");
    assert.doesNotMatch(api, /credit|stripe|wallet/i);
    assert.doesNotMatch(api, /priceCents/);
  });

  it("does not auto-create projects or spend credits on contextual entry", () => {
    const page = readFileSync("src/app/studio/from/homecheff/[type]/[id]/page.tsx", "utf8");
    assert.doesNotMatch(page, /prisma\.(storyboard|project|generationJob)/i);
    const fetchSrc = readFileSync("src/lib/studio-px4-homecheff-fetch.ts", "utf8");
    assert.match(fetchSrc, /source-context/);
    assert.doesNotMatch(fetchSrc, /debit|reserveCredits/i);
  });
});
