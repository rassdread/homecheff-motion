import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyLanguageExportPrepareResponse,
  buildLanguageExportPrepareRequest,
  languageExportPrepareUrl,
  LANGUAGE_EXPORT_NO_LAYERS,
  resolveLanguageExportPrepareLayers,
} from "@/lib/language-export-prepare";
import type { LanguageTextLayerRecord } from "@/lib/video-language-export";

const messages = {
  prepareFailed: "Prepare failed.",
  noLayers: "No translatable text layers found.",
  translationFailed: "Translation failed; edit manually.",
};

const sampleLayer: LanguageTextLayerRecord = {
  id: "layer-1",
  sourceText: "Hello",
  translatedText: "Hallo",
  x: 0.5,
  y: 0.2,
};

describe("language-export-prepare", () => {
  it("builds prepare POST body with action and languageCode", () => {
    assert.deepEqual(buildLanguageExportPrepareRequest("nl"), {
      action: "prepare",
      languageCode: "nl",
    });
  });

  it("builds project-scoped prepare API URL", () => {
    assert.equal(
      languageExportPrepareUrl("proj-abc"),
      "/api/instant-premium/projects/proj-abc/language-exports"
    );
  });

  it("shows no-layers message when prepare returns empty layers", () => {
    const result = applyLanguageExportPrepareResponse({
      httpOk: true,
      httpStatus: 200,
      data: { ok: true, layers: [], layerCount: 0, languageCode: "nl" },
      messages,
    });
    assert.equal(result.phase, "failed");
    assert.equal(result.error, messages.noLayers);
    assert.equal(result.layers.length, 0);
    assert.equal(result.debug.errorCode, LANGUAGE_EXPORT_NO_LAYERS);
  });

  it("shows failed state on API error response", () => {
    const result = applyLanguageExportPrepareResponse({
      httpOk: false,
      httpStatus: 400,
      data: { ok: false, code: "INVALID", message: "Bad request." },
      messages,
    });
    assert.equal(result.phase, "failed");
    assert.equal(result.error, "Bad request.");
    assert.equal(result.debug.lastApiOk, false);
  });

  it("populates editable layers on successful prepare", () => {
    const result = applyLanguageExportPrepareResponse({
      httpOk: true,
      httpStatus: 200,
      data: {
        ok: true,
        languageCode: "nl",
        layers: [sampleLayer],
        layerCount: 1,
        translationProvider: "openai",
      },
      messages,
    });
    assert.equal(result.phase, "ready");
    assert.equal(result.layers.length, 1);
    assert.equal(result.layers[0]?.translatedText, "Hallo");
    assert.equal(result.debug.layerCount, 1);
  });

  it("accepts legacy textLayers field", () => {
    const layers = resolveLanguageExportPrepareLayers({
      textLayers: [sampleLayer],
    });
    assert.equal(layers.length, 1);
    assert.equal(layers[0]?.id, "layer-1");
  });

  it("shows translation info while still returning layers for manual edit", () => {
    const result = applyLanguageExportPrepareResponse({
      httpOk: true,
      httpStatus: 200,
      data: {
        ok: true,
        layers: [{ ...sampleLayer, translatedText: "Hello" }],
        translationFailed: true,
        translationProvider: "manual_fallback",
      },
      messages,
    });
    assert.equal(result.phase, "ready");
    assert.equal(result.info, messages.translationFailed);
    assert.equal(result.layers[0]?.translatedText, "Hello");
  });
});
