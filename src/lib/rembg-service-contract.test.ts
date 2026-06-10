import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { segmentationProviderAvailable } from "@/lib/premium-foreground-segmentation";

describe("rembg service contract", () => {
  it("segment-editor-layer posts JPEG body to REMBG_API_URL", () => {
    const source = readFileSync(
      join(process.cwd(), "src/server/editor/segment-editor-layer.ts"),
      "utf8"
    );
    assert.ok(source.includes('process.env.REMBG_API_URL'));
    assert.ok(source.includes('"Content-Type": "image/jpeg"'));
    assert.ok(source.includes("segmentationSource = \"rembg\""));
  });

  it("rembg-service exposes POST /segment and GET /health", () => {
    const app = readFileSync(join(process.cwd(), "rembg-service/app.py"), "utf8");
    assert.ok(app.includes('@app.post("/segment")'));
    assert.ok(app.includes('@app.get("/health")'));
    assert.ok(app.includes("media_type=\"image/png\""));
  });

  it("env example documents REMBG_API_URL", () => {
    const example = readFileSync(join(process.cwd(), ".env.example"), "utf8");
    assert.ok(example.includes("REMBG_API_URL"));
  });

  it("segmentationProviderAvailable rembg follows env", () => {
    const prev = process.env.REMBG_API_URL;
    delete process.env.REMBG_API_URL;
    assert.equal(segmentationProviderAvailable("rembg"), false);
    process.env.REMBG_API_URL = "https://rembg.example/segment";
    assert.equal(segmentationProviderAvailable("rembg"), true);
    if (prev === undefined) {
      delete process.env.REMBG_API_URL;
    } else {
      process.env.REMBG_API_URL = prev;
    }
  });
});
