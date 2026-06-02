import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  classifyInstantExportClientError,
  instantExportUserErrorMessage,
  languageExportsPath,
  rebuildFinalVideoPath,
} from "@/lib/instant-export-client";
import { isAbortLikeError } from "@/lib/client-api-fetch";
import {
  VIDEO_PREVIEW_MAIN_FRAME_CLASS,
  VIDEO_PREVIEW_MAIN_VIDEO_CLASS,
  VIDEO_PREVIEW_VERSION_FRAME_CLASS,
  VIDEO_PREVIEW_VERSION_VIDEO_CLASS,
} from "@/components/ui/video-preview";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("instant-export-client", () => {
  it("language-export paths are relative same-origin", () => {
    assert.match(languageExportsPath("proj_1"), /^\//);
    assert.match(rebuildFinalVideoPath("proj_1"), /^\//);
    assert.match(languageExportsPath("proj_1"), /language-exports/);
  });

  it("classifies AbortError for user-safe messaging", () => {
    assert.equal(classifyInstantExportClientError(new DOMException("aborted", "AbortError")), "abort");
    assert.ok(isAbortLikeError(new Error("The user aborted a request.")));
  });

  it("instantExportUserErrorMessage prefers aborted copy for users", () => {
    const msg = instantExportUserErrorMessage({
      kind: "abort",
      abortedMessage: "Tekstversie kon niet worden gestart. Probeer opnieuw.",
      networkMessage: "Network failed",
    });
    assert.match(msg, /Probeer opnieuw/);
  });

  it("instantExportUserErrorMessage shows admin detail when requested", () => {
    const msg = instantExportUserErrorMessage({
      kind: "abort",
      abortedMessage: "User safe",
      networkMessage: "Network failed",
      adminDetail: "AbortError: operation aborted",
      isAdmin: true,
    });
    assert.equal(msg, "AbortError: operation aborted");
  });
});

describe("video preview sizing", () => {
  it("main preview uses viewport vh caps and object-contain", () => {
    assert.match(VIDEO_PREVIEW_MAIN_FRAME_CLASS, /max-h-\[60vh\]/);
    assert.match(VIDEO_PREVIEW_MAIN_FRAME_CLASS, /md:max-h-\[50vh\]/);
    assert.match(VIDEO_PREVIEW_MAIN_FRAME_CLASS, /lg:max-h-\[40vh\]/);
    assert.match(VIDEO_PREVIEW_MAIN_FRAME_CLASS, /aspect-\[9\/16\]/);
    assert.match(VIDEO_PREVIEW_MAIN_VIDEO_CLASS, /object-contain/);
  });

  it("version previews share viewport caps with narrower max width", () => {
    assert.match(VIDEO_PREVIEW_VERSION_FRAME_CLASS, /max-h-\[60vh\]/);
    assert.match(VIDEO_PREVIEW_VERSION_FRAME_CLASS, /lg:max-h-\[40vh\]/);
    assert.match(VIDEO_PREVIEW_VERSION_FRAME_CLASS, /max-w-sm/);
    assert.match(VIDEO_PREVIEW_VERSION_VIDEO_CLASS, /object-contain/);
  });
});

describe("language-export fetch wiring", () => {
  it("video-versions-panel uses instant-export-client POST helper", () => {
    const source = readFileSync(
      join(__dirname, "../components/instant/video-versions-panel.tsx"),
      "utf8"
    );
    assert.match(source, /postLanguageExportAction/);
    assert.match(source, /getProjectLanguageExports/);
    assert.doesNotMatch(source, /credentials: "include"/);
  });

  it("language-export-panel uses postLanguageExportAction", () => {
    const source = readFileSync(
      join(__dirname, "../components/instant/language-export-panel.tsx"),
      "utf8"
    );
    assert.match(source, /postLanguageExportAction/);
  });

  it("videos detail rebuild uses postRebuildFinalVideo", () => {
    const source = readFileSync(join(__dirname, "../app/videos/[id]/page.tsx"), "utf8");
    assert.match(source, /postRebuildFinalVideo/);
    assert.match(source, /instant\.textRerender\.aborted/);
  });
});
