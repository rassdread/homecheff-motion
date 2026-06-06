import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyLanguageExportPollRow,
  applyLanguageExportRenderStartResponse,
  buildLanguageExportRenderRequest,
} from "@/lib/language-export-render";
import { filterCompletedLanguageExportsForPlayback } from "@/lib/language-export-playback";

describe("language-export-render", () => {
  const messages = {
    renderFailed: "Render failed.",
    renderProgress: "Rendering...",
    renderComplete: "Ready.",
    outputMissing: "Output missing.",
  };

  it("builds render POST with action, languageCode, and layers", () => {
    assert.deepEqual(
      buildLanguageExportRenderRequest({
        languageCode: "nl",
        layers: [{ id: "a", sourceText: "Hi", translatedText: "Hoi", x: 0.5, y: 0.2 }],
        exportId: "exp-1",
      }),
      {
        action: "render",
        languageCode: "nl",
        layers: [{ id: "a", sourceText: "Hi", translatedText: "Hoi", x: 0.5, y: 0.2 }],
        exportId: "exp-1",
      }
    );
  });

  it("returns rendering phase for queued export", () => {
    const result = applyLanguageExportRenderStartResponse({
      httpOk: true,
      httpStatus: 200,
      data: {
        ok: true,
        exportId: "exp-new",
        status: "queued",
        languageCode: "nl",
      },
      messages,
    });
    assert.equal(result.phase, "rendering");
    assert.equal(result.exportId, "exp-new");
  });

  it("poll marks completed export with URL as ready", () => {
    const polled = applyLanguageExportPollRow(
      {
        id: "exp-1",
        languageCode: "nl",
        languageLabel: "Nederlands",
        status: "completed",
        outputVideoUrl: "https://cdn.example/nl.mp4",
        sourceFinalVideoUrl: "https://cdn.example/final.mp4",
        textLayerJson: null,
        translationProvider: null,
        errorMessage: null,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        version: 1,
        isDefault: true,
      },
      messages
    );
    assert.equal(polled?.phase, "completed");
    assert.equal(polled?.outputVideoUrl, "https://cdn.example/nl.mp4");
  });

  it("filters DB exports for playback selector", () => {
    const rows = filterCompletedLanguageExportsForPlayback([
      {
        id: "1",
        languageCode: "nl",
        languageLabel: "NL",
        status: "completed",
        outputVideoUrl: "https://x/nl.mp4",
        errorMessage: null,
        createdAt: "",
        completedAt: null,
        version: 1,
        isDefault: true,
      },
      {
        id: "2",
        languageCode: "en",
        languageLabel: "EN",
        status: "rendering",
        outputVideoUrl: null,
        errorMessage: null,
        createdAt: "",
        completedAt: null,
        version: 1,
        isDefault: false,
      },
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.languageCode, "nl");
  });
});
