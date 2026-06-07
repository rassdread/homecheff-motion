import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getTranslator } from "@/i18n";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import { resolveProposedSceneText } from "@/lib/studio-director-proposal-apply";
import {
  applySceneBeatDedupe,
  distillStorySubject,
  extractProposalStoryEntities,
  sceneCopySimilarity,
  translateStoryBeatForScene,
} from "@/lib/studio-scene-beat-translation";
import {
  buildStoryArchitecture,
  pickStoryMomentForPhase,
} from "@/lib/studio-story-architecture";
import { studioStoryboardDetail } from "@/test/studio-api-fixtures";

const tNl = getTranslator("nl");

describe("studio-scene-beat-translation", () => {
  it("strips meta prefix from story subject", () => {
    const subject = distillStorySubject(
      "Een filmpje waar ik mijn reis door de markt in Marrakech laat zien"
    );
    assert.ok(!subject.toLowerCase().startsWith("een filmpje"));
    assert.match(subject.toLowerCase(), /markt|marrakech|reis/);
  });

  it("extracts setting and subject entities without copying raw prompt opener", () => {
    const architecture = buildStoryArchitecture({
      userIdea: "Een filmpje waar ik mijn reis door de markt in Marrakech laat zien",
      plannedSceneCount: 5,
    });
    const entities = extractProposalStoryEntities({
      idea: "Een filmpje waar ik mijn reis door de markt in Marrakech laat zien",
      architecture,
      promptTokens: ["reis", "markt", "marrakech"],
    });
    assert.ok(entities.subject.length > 0);
    assert.ok(!entities.subject.toLowerCase().startsWith("een filmpje"));
    assert.match(entities.setting.toLowerCase(), /marrakech|markt/);
  });

  it("translates narrative moments into distinct beat template keys", () => {
    const architecture = buildStoryArchitecture({
      userIdea: "Chef ontdekt verse groenten op de markt",
      plannedSceneCount: 5,
    });
    const entities = extractProposalStoryEntities({
      idea: "Chef ontdekt verse groenten op de markt",
      architecture,
      promptTokens: ["chef", "markt", "groenten"],
    });

    const phases = ["opening", "discovery", "build_up", "climax", "resolution"] as const;
    const beats = phases.map((phase, index) =>
      translateStoryBeatForScene({
        architecture,
        moment: pickStoryMomentForPhase(architecture, phase),
        sceneIndex: index,
        sceneCount: 5,
        entities,
      })
    );

    const titleKeys = new Set(beats.map((b) => b.titleKey));
    const descriptionKeys = new Set(beats.map((b) => b.descriptionKey));
    assert.equal(titleKeys.size, 5);
    assert.equal(descriptionKeys.size, 5);
    assert.ok(beats.every((b) => b.titleKey.includes("beatTranslation")));
    assert.ok(beats.every((b) => b.beatKey.includes(".beat")));
  });

  it("produces five unique resolved titles and descriptions for a five-scene proposal", () => {
    const proposal = buildDirectorProposal({
      idea: "Een filmpje waar ik mijn reis door de markt in Marrakech laat zien",
      storyboard: studioStoryboardDetail({ scenes: [], aiDirectorPrompt: "" }),
      characters: [],
      locations: [],
      props: [],
      t: tNl,
    });
    assert.ok(proposal);
    assert.equal(proposal!.scenes.length, 5);

    const copies = proposal!.scenes.map((scene) => resolveProposedSceneText(scene, tNl));
    const titles = new Set(copies.map((c) => c.title));
    const descriptions = new Set(copies.map((c) => c.description));

    assert.equal(titles.size, 5, `expected 5 unique titles, got: ${[...titles].join(" | ")}`);
    assert.equal(
      descriptions.size,
      5,
      `expected 5 unique descriptions, got: ${[...descriptions].join(" | ")}`
    );

    for (const copy of copies) {
      assert.ok(!copy.title.toLowerCase().startsWith("een filmpje"));
      assert.ok(!copy.description.toLowerCase().includes("een filmpje waar ik"));
    }
  });

  it("names suggested assets from entities instead of raw prompt opener", () => {
    const proposal = buildDirectorProposal({
      idea: "Restaurant promotie met chef in de keuken",
      storyboard: studioStoryboardDetail({ scenes: [] }),
      characters: [],
      locations: [],
      props: [],
    });
    assert.ok(proposal);
    const newCharacter = proposal!.scenes.flatMap((s) => s.proposedCharacters)[0];
    const newLocation = proposal!.scenes.map((s) => s.proposedLocation).find(Boolean);
    if (newCharacter) {
      assert.ok(!/^restaurant promotie met chef/i.test(newCharacter.name));
    }
    if (newLocation) {
      assert.ok(!newLocation.name.toLowerCase().startsWith("restaurant promotie"));
      assert.match(newLocation.name.toLowerCase(), /keuken|chef|restaurant/);
    }
  });

  it("detects similar scene copy and applies alternate beat variant", () => {
    const architecture = buildStoryArchitecture({
      userIdea: "Markt verhaal",
      plannedSceneCount: 5,
    });
    const entities = extractProposalStoryEntities({
      idea: "Markt verhaal",
      architecture,
      promptTokens: ["markt"],
    });
    const moment = pickStoryMomentForPhase(architecture, "discovery");
    const base = translateStoryBeatForScene({
      architecture,
      moment,
      sceneIndex: 1,
      sceneCount: 5,
      entities,
      variantIndex: 0,
    });

    const scenes = [
      {
        order: 0,
        titleKey: base.titleKey,
        descriptionKey: base.descriptionKey,
        actionKey: base.actionKey,
        titleParams: base.sceneParams,
        descriptionParams: base.sceneParams,
        actionParams: base.sceneParams,
        momentId: moment.id,
        variantIndex: 0,
      },
      {
        order: 1,
        titleKey: base.titleKey,
        descriptionKey: base.descriptionKey,
        actionKey: base.actionKey,
        titleParams: base.sceneParams,
        descriptionParams: base.sceneParams,
        actionParams: base.sceneParams,
        momentId: moment.id,
        variantIndex: 0,
      },
    ];

    assert.ok(sceneCopySimilarity(tNl(base.titleKey, base.sceneParams), tNl(base.titleKey, base.sceneParams)) >= 0.99);

    const deduped = applySceneBeatDedupe({
      scenes,
      architecture,
      entities,
      t: tNl,
    });
    assert.ok(deduped.warnings.length >= 1);
    assert.notEqual(deduped.scenes[0]!.titleKey, deduped.scenes[1]!.titleKey);
  });
});
