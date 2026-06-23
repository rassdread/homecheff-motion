import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseOpenAiEditSize,
  resolveOpenAiEditSize,
} from "@/lib/editor-instruction-render-dimensions";

describe("editor instruction render dimensions", () => {
  it("resolveOpenAiEditSize picks landscape for wide sources", () => {
    assert.equal(resolveOpenAiEditSize(1920, 1080), "1536x1024");
  });

  it("resolveOpenAiEditSize picks portrait for tall sources", () => {
    assert.equal(resolveOpenAiEditSize(1080, 1920), "1024x1536");
  });

  it("resolveOpenAiEditSize picks square for near-square sources", () => {
    assert.equal(resolveOpenAiEditSize(1000, 950), "1024x1024");
  });

  it("parseOpenAiEditSize returns dimensions", () => {
    assert.deepEqual(parseOpenAiEditSize("1536x1024"), { width: 1536, height: 1024 });
  });

  it("parseOpenAiEditSize falls back for invalid input", () => {
    assert.deepEqual(parseOpenAiEditSize("bad"), { width: 1024, height: 1024 });
  });
});
