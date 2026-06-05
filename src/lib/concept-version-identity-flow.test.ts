import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  buildFullRerenderRenderBodyFromDraft,
  parseFullRerenderDraftPayload,
  serializeFullRerenderDraftPayload,
} from "@/lib/full-rerender-draft";
import { emptySceneTextDraft } from "@/lib/instant-scene-text-draft-model";

describe("concept version identity flow", () => {
  it("draft payload persists target language and version name", () => {
    const payload = serializeFullRerenderDraftPayload({
      slots: [
        {
          sceneId: "scene-1",
          image: null,
          text: emptySceneTextDraft(5),
        },
      ],
      versionNote: "Director Cut",
      targetLanguage: "en",
      userIntent: "",
      transitionSeconds: 5,
      instantMode: "transition",
      expandedIndex: 0,
      initialImageIds: [],
    });
    const parsed = parseFullRerenderDraftPayload(JSON.parse(JSON.stringify(payload)));
    assert.ok(parsed);
    assert.equal(parsed.versionNote, "Director Cut");
    assert.equal(parsed.targetLanguage, "en");
  });

  it("render body includes explicit sourceLanguage, targetLanguage, versionName", () => {
    const payload = serializeFullRerenderDraftPayload({
      slots: [
        {
          sceneId: "scene-1",
          image: {
            id: "img-1",
            previewUrl: "https://cdn.example/a.jpg",
            originalFileName: "a.jpg",
          },
          text: emptySceneTextDraft(5),
        },
        {
          sceneId: "scene-2",
          image: {
            id: "img-2",
            previewUrl: "https://cdn.example/b.jpg",
            originalFileName: "b.jpg",
          },
          text: emptySceneTextDraft(5),
        },
      ],
      versionNote: "EN V2",
      targetLanguage: "en",
      userIntent: "More energy",
      transitionSeconds: 5,
      instantMode: "transition",
      expandedIndex: 0,
      initialImageIds: ["img-1", "img-2"],
    });
    const body = buildFullRerenderRenderBodyFromDraft(payload, { sourceLanguage: "nl" });
    assert.equal(body.versionName, "EN V2");
    assert.equal(body.targetLanguage, "en");
    assert.equal(body.sourceLanguage, "nl");
  });

  it("concept editor posts explicit version identity on render", () => {
    const editor = readFileSync(
      join(__dirname, "../components/instant/full-rerender-editor.tsx"),
      "utf8"
    );
    assert.match(editor, /ConceptVersionIdentitySection/);
    assert.match(editor, /sourceLanguage:/);
    assert.match(editor, /targetLanguage,/);
    assert.match(editor, /versionName:/);
  });

  it("instant export client sends version identity fields", () => {
    const src = readFileSync(join(__dirname, "instant-export-client.ts"), "utf8");
    assert.match(src, /sourceLanguage\?: string/);
    assert.match(src, /targetLanguage\?: string/);
    assert.match(src, /versionName\?: string/);
    assert.match(src, /versionName: options\?\.versionName/);
  });

  it("draft render route forwards version identity to start-draft", () => {
    const route = readFileSync(
      join(
        __dirname,
        "../app/api/instant-premium/projects/[id]/full-rerender/route.ts"
      ),
      "utf8"
    );
    assert.match(route, /versionName\?: string/);
    assert.match(route, /targetLanguage\?: string/);
    assert.match(route, /versionIdentity:/);

    const startDraft = readFileSync(
      join(__dirname, "../server/instant-premium/start-draft-project-render.ts"),
      "utf8"
    );
    assert.match(startDraft, /explicit: true/);
    assert.match(startDraft, /createPendingFullRerenderVersion/);
  });
});
