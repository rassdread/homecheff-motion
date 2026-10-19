import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  validateStudioSceneCreateInput,
  validateStudioSceneUpdateInput,
} from "@/lib/studio-scene-validation";
import { mergeSceneSubtitleLine } from "@/lib/studio-project-linking";

const BAKER_DIALOGUE = "I love baking cupcakes.\nEvery little detail makes me happy!";
const BAKER_SUBTITLE = "Ik hou ervan om cupcakes te bakken.\nElk klein detail maakt me blij!";
const POTTER_DIALOGUE = "Working with clay is my passion.\nEvery piece is something special.";
const GARDENER_DIALOGUE = "There's nothing better than\ngrowing something yourself!";

test("scene dialogue is optional and does not replace the description", () => {
  const created = validateStudioSceneCreateInput({ title: "Bakkerij", description: "Een warme keuken" });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  assert.equal(created.value.dialogueText, null);
  assert.equal(created.value.description, "Een warme keuken");

  const omitted = validateStudioSceneUpdateInput({ description: "Alleen de beschrijving" });
  assert.equal(omitted.ok, true);
  if (!omitted.ok) return;
  assert.equal(omitted.value.dialogueText, undefined);
  assert.equal(omitted.value.description, "Alleen de beschrijving");
});

test("scene dialogue trims, caps, and clears without touching other fields", () => {
  const saved = validateStudioSceneUpdateInput({ dialogueText: `  ${BAKER_DIALOGUE}  ` });
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  assert.equal(saved.value.dialogueText, BAKER_DIALOGUE);
  assert.equal(saved.value.description, undefined);
  assert.equal(saved.value.action, undefined);

  const cleared = validateStudioSceneUpdateInput({ dialogueText: "   " });
  assert.equal(cleared.ok, true);
  if (!cleared.ok) return;
  assert.equal(cleared.value.dialogueText, null);

  const capped = validateStudioSceneUpdateInput({ dialogueText: "a".repeat(5000) });
  assert.equal(capped.ok, true);
  if (!capped.ok) return;
  assert.equal(capped.value.dialogueText?.length, 4000);
});

test("English dialogue and Dutch subtitles stay independent", () => {
  const lines = [
    { id: "baker", order: 0, dialogueText: BAKER_DIALOGUE, subtitle: BAKER_SUBTITLE },
    { id: "potter", order: 1, dialogueText: POTTER_DIALOGUE, subtitle: "Werken met klei is mijn passie." },
    { id: "gardener", order: 2, dialogueText: GARDENER_DIALOGUE, subtitle: "" },
  ];
  let entries = [] as Array<{ start: number; end: number; text: string; sceneId?: string }>;
  for (const line of lines) {
    const dialogue = validateStudioSceneUpdateInput({ dialogueText: line.dialogueText });
    assert.equal(dialogue.ok, true);
    if (!dialogue.ok) return;
    assert.notEqual(dialogue.value.dialogueText, line.subtitle);
    entries = mergeSceneSubtitleLine(entries, { id: line.id, order: line.order }, line.subtitle);
  }
  assert.equal(entries.find((entry) => entry.sceneId === "baker")?.text, BAKER_SUBTITLE);
  assert.equal(entries.find((entry) => entry.sceneId === "gardener"), undefined);
  assert.equal(entries.find((entry) => entry.sceneId === "baker")?.text.includes("baking"), false);
});

test("dialogue migration is additive and the service does not charge or rewrite masters", () => {
  const root = process.cwd();
  const sql = readFileSync(
    join(root, "prisma/migrations/20261019153000_studio_scene_dialogue_text/migration.sql"),
    "utf8",
  );
  assert.match(sql, /ADD COLUMN "dialogueText" TEXT/);
  assert.doesNotMatch(sql, /DROP |UPDATE |DELETE |NOT NULL/i);
  const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
  assert.match(schema, /dialogueText\s+String\?/);
  const service = readFileSync(join(root, "src/server/studio/studio-film-preparation.ts"), "utf8");
  assert.match(service, /dialogueText\?: string \| null/);
  assert.doesNotMatch(service, /reserveStudioCredits|requireStudioCredits/);
  assert.equal((service.match(/referenceImageUrl/g) ?? []).length, 1);
  assert.match(service, /referenceImageUrl: true/);
  assert.doesNotMatch(service, /cmvcbmxdp00032jryohiw8a84|cmvdlq3wy0005k007dpq2mp8c/);
  const route = readFileSync(
    join(root, "src/app/api/studio/projects/[projectId]/scenes/[sceneId]/route.ts"),
    "utf8",
  );
  assert.match(route, /dialogueText/);
  assert.match(route, /subtitleText/);
  assert.match(route, /requireActiveUser/);
});
