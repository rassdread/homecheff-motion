import assert from "node:assert/strict";
import {
  publishStudioFilmAssistantContext,
  readStudioFilmAssistantContext,
} from "@/lib/studio-film-assistant-bridge";
import { readFileSync, existsSync } from "node:fs";
import { describe, it } from "node:test";
import {
  classifyStudioCreativeIntent,
  creativeIntentHandoffHref,
  creativeProjectKind,
  filmRequestKey,
  filmTitleFromPrompt,
  parseStudioWorkflow,
  workflowDefaultSection,
  workflowLegacyHref,
  workflowPrimarySections,
  workspaceSelectionSearch,
} from "@/lib/studio-v23-intent";
import {
  manualEditConflicts,
  parseStudioV23Request,
  proposeStudioV23Command,
  shortenDialogue,
} from "@/lib/studio-v23-actions";
import {
  executeStudioV23Action,
  type StudioV23Deps,
  type StudioV23Success,
} from "@/lib/studio-v23-action-runner";
import { safeStudioProjectReturnTo } from "@/lib/studio-return-to";
import {
  beginPendingSceneEdit,
  clearPendingSceneEditsForTests,
  finishPendingSceneEdit,
  flushPendingSceneEdits,
} from "@/lib/studio-v23-pending-edits";

const actor = { id: "user-a", email: "a@example.com", role: "USER" };

function deps(overrides: Partial<StudioV23Deps> = {}): StudioV23Deps & { calls: string[] } {
  const calls: string[] = [];
  const memory = new Map<string, StudioV23Success>();
  const base: StudioV23Deps = {
    createFilm: async () => {
      calls.push("createFilm");
      return { projectId: "film-1", storyboardId: "board-1", title: "Film", created: true };
    },
    createScene: async () => {
      calls.push("createScene");
      return { scene: { id: "scene-new" } };
    },
    updateScene: async () => {
      calls.push("updateScene");
      return { scene: { id: "scene-1" } };
    },
    reorderScenes: async () => {
      calls.push("reorder");
      return {};
    },
    quoteVideo: async () => {
      calls.push("quoteVideo");
      return { actionType: "motion_render", requiredCredits: 450, allowed: false, reason: "free_account_provider_action" };
    },
    quoteDialogue: async () => {
      calls.push("quoteDialogue");
      return { actionType: "voice_generation", requiredCredits: 15, allowed: false, reason: "provider_disabled", voiceProfile: "nl-studio" };
    },
    getTimeline: async () => ({ timeline: { revision: 3, tracks: [{ id: "music", type: "MUSIC" }] } }),
    setTrackVolume: async () => {
      calls.push("volume");
      return {};
    },
    reverseStory: async () => {
      calls.push("reverse");
      return {};
    },
    updateCharacterReference: async () => {
      calls.push("reference");
      return { character: { id: "char-1" } };
    },
    getAsset: async (assetId) => (assetId === "asset-b" ? null : { id: assetId, family: "image", previewUrl: "https://cdn.example/a.jpg", storageKey: "library/a" }),
    getProject: async (_owner, projectId) => (projectId === "foreign" ? null : { id: projectId, title: "Owned" }),
    sceneInProject: async (_owner, _project, sceneId) => (sceneId === "foreign-scene" ? null : { id: sceneId, updatedAt: "2026-10-27T00:00:00.000Z" }),
    characterInFilm: async (_owner, _project, characterId) => characterId !== "foreign-character",
    readIdempotency: async (_owner, projectId, key) => memory.get(`${projectId}:${key}`) ?? null,
    saveIdempotency: async (_owner, projectId, key, value) => {
      memory.set(`${projectId}:${key}`, value);
    },
  };
  return { calls, ...base, ...overrides, calls };
}

describe("V23 creative intent", () => {
  it("classifies film, image, video, voice, character, and existing projects separately", () => {
    assert.equal(classifyStudioCreativeIntent("Maak een promotiefilm van 30 seconden."), "FILM");
    assert.equal(classifyStudioCreativeIntent("Maak een afbeelding voor mijn bedrijf."), "IMAGE");
    assert.equal(classifyStudioCreativeIntent("Verander alleen de achtergrond van deze productfoto"), "IMAGE_EDIT");
    assert.equal(classifyStudioCreativeIntent("Maak een video van deze foto."), "VIDEO");
    assert.equal(classifyStudioCreativeIntent("Breng deze foto tot leven met een animatie"), "ANIMATION");
    assert.equal(classifyStudioCreativeIntent("Ontwerp een personage."), "CHARACTER");
    assert.equal(classifyStudioCreativeIntent("Maak een voice-over."), "VOICE");
    assert.equal(classifyStudioCreativeIntent("Open mijn laatste project."), "OPEN_EXISTING_PROJECT");
    assert.equal(classifyStudioCreativeIntent("Ontwerp een poster."), "IMAGE");
    assert.equal(classifyStudioCreativeIntent("Animeer deze afbeelding."), "ANIMATION");
    assert.equal(classifyStudioCreativeIntent("Genereer achtergrondmuziek."), "AUDIO");
    assert.equal(classifyStudioCreativeIntent("Maak een geluidseffect."), "AUDIO");
    assert.equal(classifyStudioCreativeIntent("Make an image."), "IMAGE");
    assert.equal(classifyStudioCreativeIntent("Design a character."), "CHARACTER");
  });

  it("opens an existing editor and keeps the request", () => {
    assert.match(creativeIntentHandoffHref("IMAGE", "Ontwerp een poster.") ?? "", /\/editor\/start\?idea=/);
    assert.match(creativeIntentHandoffHref("IMAGE_EDIT", "Bewerk deze foto.") ?? "", /\/editor\/start\?idea=/);
    assert.match(creativeIntentHandoffHref("VIDEO", "Maak een video.") ?? "", /\/studio\/experience\?idea=/);
    assert.match(creativeIntentHandoffHref("VIDEO", "Maak een video van deze foto.") ?? "", /\/studio\/photo-video\?idea=/);
    assert.equal(creativeIntentHandoffHref("ANIMATION", "Maak een animatie van mijn foto.")?.startsWith("/motion?idea="), true);
    assert.match(
      creativeIntentHandoffHref("ANIMATION", "Animeer deze foto.", { mediaUrl: "https://cdn.example/still.jpg" }) ?? "",
      /\/motion\/start\?/,
    );
    assert.match(creativeIntentHandoffHref("VOICE", "Maak een voice-over voor mijn reclame.") ?? "", /\/studio\/audio\/create\?idea=.*mode=voice/);
    assert.match(creativeIntentHandoffHref("AUDIO", "Genereer achtergrondmuziek.") ?? "", /\/studio\/audio\/create\?idea=.*mode=music/);
    assert.match(creativeIntentHandoffHref("CHARACTER", "Ontwerp een personage met donker krullend haar.") ?? "", /\/studio\/characters\/new\?idea=/);
    assert.equal(creativeIntentHandoffHref("FILM", "Maak een promotiefilm."), null);
  });

  it("does not turn a photo video or image into a film", () => {
    assert.notEqual(classifyStudioCreativeIntent("Maak van mijn foto's een snelle video."), "FILM");
    assert.notEqual(classifyStudioCreativeIntent("Maak een afbeelding voor mijn bedrijf."), "FILM");
    assert.equal(filmTitleFromPrompt("Maak een promotiefilm van 30 seconden."), "Maak een promotiefilm van 30 seconden");
    assert.match(filmRequestKey("Maak een promotiefilm van 30 seconden."), /^[A-Za-z0-9_-]{8,80}$/);
    assert.equal(filmRequestKey("same"), filmRequestKey("same"));
  });

  it("labels recent projects from stored ids, not title text", () => {
    assert.equal(creativeProjectKind({ storyboardId: "board", title: "photo" } as never), "film");
    assert.equal(creativeProjectKind({ animationProjectId: "anim" }), "animation");
    assert.equal(creativeProjectKind({ editorCanvasProjectId: "canvas" }), "image");
    assert.equal(creativeProjectKind({}), "project");
  });
});

describe("V23 workspace context", () => {
  it("keeps section, scene, and character in the query", () => {
    const next = workspaceSelectionSearch("?section=overview", {
      section: "scenes",
      scene: "scene-2",
      character: "char-1",
      workflow: "film",
    });
    assert.match(next, /section=scenes/);
    assert.match(next, /scene=scene-2/);
    assert.match(next, /character=char-1/);
    assert.equal(parseStudioWorkflow("image"), "image");
    assert.equal(parseStudioWorkflow("not-a-workflow"), null);
    assert.equal(workflowDefaultSection("voice"), "audio");
    assert.deepEqual(workflowPrimarySections("film").length, 7);
    assert.ok(workflowPrimarySections("image").includes("media"));
  });

  it("rejects open redirects and keeps a project return path", () => {
    assert.equal(safeStudioProjectReturnTo("https://evil.example/studio/projects/x"), null);
    assert.equal(safeStudioProjectReturnTo("//evil.example/studio/projects/x"), null);
    assert.equal(safeStudioProjectReturnTo("/studio/projects/abc?next=https://evil.example"), null);
    assert.equal(
      safeStudioProjectReturnTo("/studio/projects/abc?section=scenes&scene=scene-1&workflow=film"),
      "/studio/projects/abc?section=scenes&scene=scene-1&workflow=film",
    );
    const legacy = workflowLegacyHref("image", "abc");
    assert.match(legacy ?? "", /^\/editor\/start\?returnTo=/);
    assert.equal(workflowLegacyHref("voice", "abc"), null);
  });
});

describe("V23 assistant actions", () => {
  it("rejects unknown and malformed actions", async () => {
    assert.equal(parseStudioV23Request(null).ok, false);
    assert.equal(parseStudioV23Request({ action: "DROP_TABLE" }).ok, false);
    assert.equal(parseStudioV23Request({ action: "ADD_SCENE", requiredCredits: 1 }).ok, false);
    assert.equal(parseStudioV23Request({ action: "QUOTE_SCENE_VIDEO", executeProvider: true }).ok, false);
  });

  it("does not write until the user confirms", async () => {
    const fake = deps();
    const parsed = parseStudioV23Request({ action: "ADD_SCENE", projectId: "film-1", title: "Keuken" });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const waiting = await executeStudioV23Action({ actor, request: parsed.value }, fake);
    assert.equal(waiting.ok, true);
    if (waiting.ok) assert.equal(waiting.status, "confirmation_required");
    assert.deepEqual(fake.calls, []);
    const done = await executeStudioV23Action({ actor, request: { ...parsed.value, confirmed: true } }, fake);
    assert.equal(done.ok, true);
    assert.deepEqual(fake.calls, ["createScene"]);
  });

  it("rejects another user's project, scene, character, and asset", async () => {
    const fake = deps();
    for (const body of [
      { action: "OPEN_PROJECT", projectId: "foreign", confirmed: true },
      { action: "UPDATE_SCENE", projectId: "film-1", sceneId: "foreign-scene", description: "x", confirmed: true },
      { action: "ASSIGN_CHARACTER", projectId: "film-1", sceneId: "scene-1", characterId: "foreign-character", confirmed: true },
      { action: "ASSOCIATE_CHARACTER_REFERENCE", projectId: "film-1", characterId: "char-1", assetId: "asset-b", confirmed: true },
    ]) {
      const parsed = parseStudioV23Request(body);
      assert.equal(parsed.ok, true);
      if (!parsed.ok) continue;
      const result = await executeStudioV23Action({ actor, request: parsed.value }, fake);
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.httpStatus, 404);
    }
    assert.equal(fake.calls.includes("updateScene"), false);
    assert.equal(fake.calls.includes("reference"), false);
  });

  it("quotes video and dialogue without calling a provider", async () => {
    const fake = deps();
    const video = parseStudioV23Request({ action: "QUOTE_SCENE_VIDEO", projectId: "film-1", sceneId: "scene-1", requiredCredits: 1 });
    assert.equal(video.ok, false);
    const parsed = parseStudioV23Request({ action: "QUOTE_SCENE_VIDEO", projectId: "film-1", sceneId: "scene-1", confirmed: true });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const result = await executeStudioV23Action({ actor, request: parsed.value }, fake);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.providerCalls, 0);
    assert.equal(result.creditsConsumed, 0);
    assert.equal(result.quote?.requiredCredits, 450);
    assert.equal(result.quote?.allowed, false);
    assert.equal(fake.calls.includes("quoteVideo"), true);
    const voice = parseStudioV23Request({ action: "QUOTE_SCENE_DIALOGUE", projectId: "film-1", sceneId: "scene-1" });
    assert.equal(voice.ok, true);
    if (!voice.ok) return;
    const quoted = await executeStudioV23Action({ actor, request: voice.value }, fake);
    assert.equal(quoted.ok, true);
    if (quoted.ok) assert.equal(quoted.quote?.reason, "provider_disabled");
  });

  it("repeats a scene create without writing twice and blocks pending manual fields", async () => {
    const fake = deps();
    const parsed = parseStudioV23Request({
      action: "ADD_SCENE",
      projectId: "film-1",
      title: "Keuken",
      confirmed: true,
      idempotencyKey: "v23actrepeat1",
    });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    await executeStudioV23Action({ actor, request: parsed.value }, fake);
    await executeStudioV23Action({ actor, request: parsed.value }, fake);
    assert.deepEqual(fake.calls, ["createScene"]);

    const update = parseStudioV23Request({
      action: "UPDATE_SCENE",
      projectId: "film-1",
      sceneId: "scene-1",
      dialogueText: "Korter.",
      confirmed: true,
      pendingFields: ["dialogueText"],
    });
    assert.equal(update.ok, true);
    if (!update.ok) return;
    const blocked = await executeStudioV23Action({ actor, request: update.value }, fake);
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.equal(blocked.code, "pending_manual_edit");
    assert.equal(fake.calls.includes("updateScene"), false);
    assert.deepEqual(manualEditConflicts(["dialogueText"], { dialogueText: "Korter." }), ["dialogueText"]);
  });

  it("changes timeline volume only after confirmation and requires destructive confirmation to reverse", async () => {
    const fake = deps();
    const volume = parseStudioV23Request({ action: "UPDATE_TIMELINE_VOLUME", projectId: "film-1", volume: 40, confirmed: true });
    assert.equal(volume.ok, true);
    if (!volume.ok) return;
    const saved = await executeStudioV23Action({ actor, request: volume.value }, fake);
    assert.equal(saved.ok, true);
    assert.deepEqual(fake.calls, ["volume"]);
    const reverse = parseStudioV23Request({ action: "REVERSE_TIMELINE_STORY", projectId: "film-1", confirmed: true });
    assert.equal(reverse.ok, true);
    if (!reverse.ok) return;
    const refused = await executeStudioV23Action({ actor, request: reverse.value }, fake);
    assert.equal(refused.ok, false);
    const allowed = await executeStudioV23Action(
      { actor, request: { ...reverse.value, confirmDestructive: true } },
      fake,
    );
    assert.equal(allowed.ok, true);
    assert.equal(fake.calls.includes("reverse"), true);
  });

  it("proposes a shorter line for the selected scene and asks when the scene is ambiguous", () => {
    const scenes = [
      { id: "s1", order: 1, title: "Een", dialogueText: "Eerst dit. Daarna nog een zin." },
      { id: "s2", order: 2, title: "Twee", dialogueText: "Alleen twee." },
    ];
    const proposed = proposeStudioV23Command({
      text: "Maak de dialoog korter",
      projectId: "film-1",
      scenes,
      selectedSceneId: "s1",
      selectedCharacterId: null,
    });
    assert.equal(proposed.kind, "action");
    if (proposed.kind === "action") assert.equal(proposed.request.dialogueText, "Eerst dit.");
    const ambiguous = proposeStudioV23Command({
      text: "Maak de dialoog korter",
      projectId: "film-1",
      scenes,
      selectedSceneId: null,
      selectedCharacterId: null,
    });
    const adapt = proposeStudioV23Command({
      text: "Pas de dialoog van deze scène aan",
      projectId: "film-1",
      scenes,
      selectedSceneId: "scene-2",
      selectedCharacterId: null,
    });
    assert.equal(adapt.kind, "clarify");
    if (adapt.kind === "clarify") assert.equal(adapt.messageKey, "studio.v23.assistant.askDialogue");
    assert.equal(ambiguous.kind, "clarify");
    assert.equal(shortenDialogue("Eerst dit. Daarna nog een zin."), "Eerst dit.");
  });
});

describe("V23 assistant language", () => {
  const scenes = [
    { id: "s1", order: 1, title: "Een", dialogueText: "Eerst dit. Daarna nog een zin." },
    { id: "s2", order: 2, title: "Twee", dialogueText: "Alleen twee." },
  ];
  const base = { projectId: "film-1", scenes, selectedSceneId: "s1", selectedCharacterId: "char-1" };

  it("maps scene, timeline, volume, and quote phrases to existing actions", () => {
    const add = proposeStudioV23Command({ ...base, text: "Ik wil nog een scène." });
    assert.equal(add.kind, "action");
    if (add.kind === "action") assert.equal(add.request.action, "ADD_SCENE");

    const englishAdd = proposeStudioV23Command({ ...base, text: "Add another scene." });
    assert.equal(englishAdd.kind, "action");
    if (englishAdd.kind === "action") assert.equal(englishAdd.request.action, "ADD_SCENE");

    const reverse = proposeStudioV23Command({ ...base, text: "Draai de scènevolgorde om." });
    assert.equal(reverse.kind, "action");
    if (reverse.kind === "action") {
      assert.equal(reverse.request.action, "REVERSE_TIMELINE_STORY");
      assert.equal(reverse.destructive, true);
    }

    const englishReverse = proposeStudioV23Command({ ...base, text: "Reverse the story order." });
    assert.equal(englishReverse.kind, "action");

    const volume = proposeStudioV23Command({ ...base, text: "Zet het muziekvolume op 35%." });
    assert.equal(volume.kind, "action");
    if (volume.kind === "action") {
      assert.equal(volume.request.action, "UPDATE_TIMELINE_VOLUME");
      assert.equal(volume.request.volume, 35);
      assert.equal(volume.quote, false);
    }

    const englishVolume = proposeStudioV23Command({ ...base, text: "Set music volume to 35 percent." });
    assert.equal(englishVolume.kind, "action");
    if (englishVolume.kind === "action") assert.equal(englishVolume.request.volume, 35);

    const softer = proposeStudioV23Command({ ...base, text: "Maak de muziek zachter." });
    assert.equal(softer.kind, "clarify");
    if (softer.kind === "clarify") assert.equal(softer.messageKey, "studio.v23.assistant.askVolume");

    const negative = proposeStudioV23Command({ ...base, text: "Zet het muziekvolume op -1%." });
    assert.equal(negative.kind, "clarify");
    if (negative.kind === "clarify") assert.equal(negative.messageKey, "studio.v23.assistant.askVolume");
    const tooHigh = proposeStudioV23Command({ ...base, text: "Zet het muziekvolume op 101%." });
    assert.equal(tooHigh.kind, "clarify");
    if (tooHigh.kind === "clarify") assert.equal(tooHigh.messageKey, "studio.v23.assistant.askVolume");

    const video = proposeStudioV23Command({ ...base, text: "Maak een video van scène een." });
    assert.equal(video.kind, "action");
    if (video.kind === "action") {
      assert.equal(video.request.action, "QUOTE_SCENE_VIDEO");
      assert.equal(video.quote, true);
    }

    const voice = proposeStudioV23Command({ ...base, text: "Generate dialogue." });
    assert.equal(voice.kind, "action");
    if (voice.kind === "action") assert.equal(voice.request.action, "QUOTE_SCENE_DIALOGUE");
  });

  it("asks for exact text instead of inventing dialogue", () => {
    const longer = proposeStudioV23Command({ ...base, text: "Maak de dialoog langer." });
    assert.equal(longer.kind, "clarify");
    if (longer.kind === "clarify") assert.equal(longer.messageKey, "studio.v23.assistant.needExactText");

    const translated = proposeStudioV23Command({ ...base, text: "Translate the dialogue to English." });
    assert.equal(translated.kind, "clarify");
    if (translated.kind === "clarify") assert.equal(translated.messageKey, "studio.v23.assistant.needExactText");

    const sceneTwo = proposeStudioV23Command({ ...base, selectedSceneId: null, text: "Wijzig de dialoog van scène twee." });
    assert.equal(sceneTwo.kind, "clarify");
    if (sceneTwo.kind === "clarify") assert.equal(sceneTwo.messageKey, "studio.v23.assistant.askDialogue");

    const replacement = proposeStudioV23Command({ ...base, text: "Verander deze tekst in 'Welkom bij HomeCheff'." });
    assert.equal(replacement.kind, "action");
    if (replacement.kind === "action") {
      assert.equal(replacement.request.action, "UPDATE_SCENE");
      assert.equal(replacement.request.dialogueText, "Welkom bij HomeCheff");
      assert.equal(replacement.request.sceneId, "s1");
    }

    const assigned = proposeStudioV23Command({ ...base, text: "Gebruik dit personage." });
    assert.equal(assigned.kind, "action");
    if (assigned.kind === "action") assert.equal(assigned.request.action, "ASSIGN_CHARACTER");

    const missingCharacter = proposeStudioV23Command({ ...base, selectedCharacterId: null, text: "Assign this character." });
    assert.equal(missingCharacter.kind, "clarify");

    const reference = proposeStudioV23Command({ ...base, text: "Gebruik deze afbeelding als referentie." });
    assert.equal(reference.kind, "clarify");
    if (reference.kind === "clarify") assert.equal(reference.messageKey, "studio.v23.assistant.chooseImage");

    const voicePick = proposeStudioV23Command({ ...base, text: "Gebruik deze stem." });
    assert.equal(voicePick.kind, "clarify");
    if (voicePick.kind === "clarify") assert.equal(voicePick.messageKey, "studio.v23.assistant.chooseVoice");
  });
});

describe("V23 pending manual edits", () => {
  it("keeps a failed save dirty and clears a successful save", async () => {
    clearPendingSceneEditsForTests();
    const failed = beginPendingSceneEdit({ projectId: "p", sceneId: "s", fields: ["dialogueText"] });
    finishPendingSceneEdit(failed, false);
    assert.deepEqual(await flushPendingSceneEdits("p", "s"), ["dialogueText"]);
    const saved = beginPendingSceneEdit({ projectId: "p", sceneId: "s", fields: ["dialogueText"] });
    finishPendingSceneEdit(saved, true);
    assert.deepEqual(await flushPendingSceneEdits("p", "s"), []);
  });
});

describe("V23 film assistant bridge", () => {
  it("publishes creative film context and clears it", () => {
    publishStudioFilmAssistantContext({
      projectType: "creative_film",
      projectId: "film-1",
      projectTitle: "Made With Passion",
      section: "scenes",
      sectionLabel: "Scènes",
      sceneId: "scene-3",
      sceneTitle: "3. Keuken",
      characterId: null,
      characterName: null,
      scenes: [],
      balance: 0,
    });
    assert.equal(readStudioFilmAssistantContext()?.projectType, "creative_film");
    assert.equal(readStudioFilmAssistantContext()?.sceneId, "scene-3");
    publishStudioFilmAssistantContext(null);
    assert.equal(readStudioFilmAssistantContext(), null);
  });
});

describe("V23 preservation", () => {
  it("keeps the home composer, project workspace, and legacy routes", () => {
    const home = readFileSync("src/components/studio/studio-unified-home-page.tsx", "utf8");
    const composer = readFileSync("src/components/studio/studio-ai-home-composer.tsx", "utf8");
    const workspace = readFileSync("src/components/studio/studio-unified-project-workspace.tsx", "utf8");
    const server = readFileSync("src/server/studio/studio-v23-actions.ts", "utf8");
    assert.match(home, /StudioAiHomeComposer/);
    assert.match(home, /\/api\/studio\/history\?limit=12/);
    assert.match(composer, /classifyStudioCreativeIntent/);
    assert.match(composer, /\/api\/studio\/films/);
    assert.match(composer, /plan\.handoffHref/);
    assert.match(workspace, /overview/);
    assert.match(workspace, /timeline/);
    assert.match(workspace, /StudioProjectAssistantRail/);
    assert.match(workspace, /publishStudioFilmAssistantContext/);
    const sidebar = readFileSync("src/components/growth/growth-sidebar.tsx", "utf8");
    assert.match(sidebar, /StudioFilmAssistantHost/);
    assert.match(sidebar, /AssistantChatPanel/);
    assert.doesNotMatch(server, /startFilmSceneVideo|startFilmSceneDialogue/);
    for (const route of [
      "src/app/editor/page.tsx",
      "src/app/editor/start/page.tsx",
      "src/app/animate/page.tsx",
      "src/app/motion/page.tsx",
      "src/app/publish/page.tsx",
      "src/app/studio/photo-video/page.tsx",
      "src/app/studio/quick-ad/page.tsx",
      "src/app/studio/experience/page.tsx",
      "src/app/studio/assets/page.tsx",
      "src/app/studio/characters/page.tsx",
      "src/app/studio/storyboards/page.tsx",
    ]) {
      assert.equal(existsSync(route), true, route);
    }
  });

  it("keeps the development cache out of the production build directory", () => {
    const config = readFileSync("next.config.ts", "utf8");
    assert.match(config, /NODE_ENV === "development" \? "\.next-dev" : "\.next"/);
    const eslintConfig = readFileSync("eslint.config.mjs", "utf8");
    assert.match(eslintConfig, /\.next-dev\/\*\*/);
  });
});
