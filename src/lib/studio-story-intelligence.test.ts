import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAutoShotPlan } from "@/lib/studio-auto-shot-planner";
import { buildStoryArc, detectArcPhaseForIndex } from "@/lib/studio-story-arc";
import {
  analyzeEnergyCurve,
  buildEnergyCurve,
  energyLevelFromSceneEnergy,
} from "@/lib/studio-energy-curve";
import { analyzeStoryIntelligence } from "@/lib/studio-story-intelligence";
import { computeStoryHealthScore } from "@/lib/studio-story-health";
import { analyzeStoryFlow } from "@/lib/studio-story-flow-analyzer";

const sixScenes = () =>
  [0, 1, 2, 3, 4, 5].map((order) => ({
    sceneId: `s${order}`,
    order,
    title: `Scene ${order + 1}`,
    shotType: "",
    cameraMovement: "",
    sceneEnergy: "",
  }));

describe("studio story intelligence V25", () => {
  it("detects story arc phases across six scenes", () => {
    const arc = buildStoryArc(sixScenes());
    assert.equal(arc.length, 6);
    assert.equal(arc[0]?.phase, "opening");
    assert.equal(arc[arc.length - 1]?.phase, "outro");
    assert.ok(arc.some((e) => e.phase === "climax"));
  });

  it("auto shot plan assigns shot movement and energy per scene", () => {
    const plan = buildAutoShotPlan(sixScenes(), "cinematic");
    assert.equal(plan.length, 6);
    assert.ok(plan.every((row) => row.shotType && row.cameraMovement && row.sceneEnergy));
    const climax = plan.find((row) => row.arcPhase === "climax");
    assert.ok(climax);
    assert.equal(climax?.shotType, "close_up");
    assert.equal(climax?.cameraMovement, "crane");
    assert.equal(climax?.sceneEnergy, "intense");
  });

  it("director profile adapts commercial vs documentary plans", () => {
    const commercial = buildAutoShotPlan(sixScenes(), "commercial");
    const documentary = buildAutoShotPlan(sixScenes(), "documentary");
    const commercialClimax = commercial.find((r) => r.arcPhase === "climax");
    const docClimax = documentary.find((r) => r.arcPhase === "climax");
    assert.notEqual(commercialClimax?.sceneEnergy, docClimax?.sceneEnergy);
  });

  it("builds energy curve with low medium high levels", () => {
    const plan = buildAutoShotPlan(sixScenes(), "commercial");
    const curve = buildEnergyCurve(sixScenes(), plan);
    assert.equal(curve.length, 6);
    assert.ok(curve.some((p) => p.level === "low"));
    assert.ok(curve.some((p) => p.level === "high"));
    assert.equal(energyLevelFromSceneEnergy("calm"), "low");
    assert.equal(energyLevelFromSceneEnergy("intense"), "high");
  });

  it("warns on flat pacing and early climax energy", () => {
    const flat = sixScenes().map((s) => ({ ...s, sceneEnergy: "calm" }));
    const curve = buildEnergyCurve(flat);
    const warnings = analyzeEnergyCurve(curve);
    assert.ok(warnings.some((w) => w.code === "flat_pacing"));
  });

  it("computes story health score from flow and arc", () => {
    const scenes = sixScenes().map((s, i) => ({
      ...s,
      shotType: ["wide", "medium_wide", "medium", "medium", "close_up", "wide"][i],
      cameraMovement: ["push_in", "tracking", "follow", "pan_right", "crane", "pull_out"][i],
      sceneEnergy: ["calm", "neutral", "neutral", "dynamic", "intense", "calm"][i],
    }));
    const flow = analyzeStoryFlow(scenes);
    const intel = analyzeStoryIntelligence(scenes, "cinematic");
    assert.ok(intel.storyHealthScore >= 0 && intel.storyHealthScore <= 100);
    const health = computeStoryHealthScore({
      flow,
      arcPhaseCount: new Set(intel.arc.map((a) => a.phase)).size,
      sceneCount: scenes.length,
      intelligenceWarnings: intel.warnings,
      energyWarnings: intel.energyWarnings,
    });
    assert.ok(health.score > 40);
  });

  it("intelligence warns on three close-ups in a row", () => {
    const scenes = sixScenes().map((s, i) => ({
      ...s,
      shotType: i < 3 ? "close_up" : "wide",
      cameraMovement: i < 3 ? "static" : "pull_out",
      sceneEnergy: "neutral",
    }));
    const intel = analyzeStoryIntelligence(scenes, "commercial");
    assert.ok(intel.warnings.some((w) => w.code === "close_up_streak"));
  });

  it("energy curve warns when intense energy starts too early", () => {
    const scenes = sixScenes().map((s, i) => ({
      ...s,
      shotType: "medium",
      sceneEnergy: i === 0 ? "intense" : "calm",
    }));
    const curve = buildEnergyCurve(scenes);
    const warnings = analyzeEnergyCurve(curve);
    assert.ok(warnings.some((w) => w.code === "early_climax_energy"));
  });

  it("arc phase helper covers short boards", () => {
    assert.equal(detectArcPhaseForIndex(0, 1), "opening");
    assert.equal(detectArcPhaseForIndex(1, 2), "resolution");
  });
});
