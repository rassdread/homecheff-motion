import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PLAYBACK_MEDIA_CACHE, rangedMediaBody, rangedMediaResponse } from "@/lib/studio-local-media";

const bytes = Buffer.from("0123456789");

describe("ranged media responses", () => {
  it("returns the whole file when the browser is not seeking", () => {
    const body = rangedMediaBody(bytes, null);
    assert.equal(body.status, 200);
    assert.equal(body.body.toString(), "0123456789");
    assert.equal(body.contentRange, null);
  });

  it("returns the requested byte range so a media element can finish a seek", () => {
    const body = rangedMediaBody(bytes, "bytes=2-4");
    assert.equal(body.status, 206);
    assert.equal(body.body.toString(), "234");
    assert.equal(body.contentRange, "bytes 2-4/10");
  });

  it("returns an open-ended range through the last byte", () => {
    const body = rangedMediaBody(bytes, "bytes=8-");
    assert.equal(body.status, 206);
    assert.equal(body.body.toString(), "89");
    assert.equal(body.contentRange, "bytes 8-9/10");
  });

  it("rejects a range that starts past the file", () => {
    const body = rangedMediaBody(bytes, "bytes=20-");
    assert.equal(body.status, 416);
    assert.equal(body.body.length, 0);
    assert.equal(body.contentRange, "bytes */10");
  });

  it("advertises byte ranges on the response used by the audio element", async () => {
    assert.equal(PLAYBACK_MEDIA_CACHE.includes("no-store"), false);
    const response = rangedMediaResponse(bytes, "bytes=1-3", "audio/wav", PLAYBACK_MEDIA_CACHE);
    assert.equal(response.status, 206);
    assert.equal(response.headers.get("accept-ranges"), "bytes");
    assert.equal(response.headers.get("content-range"), "bytes 1-3/10");
    assert.equal(response.headers.get("content-type"), "audio/wav");
    assert.equal(response.headers.get("cache-control"), "private");
    assert.equal(Buffer.from(await response.arrayBuffer()).toString(), "123");
  });
});
