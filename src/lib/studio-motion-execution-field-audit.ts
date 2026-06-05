/**
 * Studio V30 Phase 1 — execution audit of Studio → Motion handoff fields.
 * Status: used by Motion (Vidu/story prompt), stored only, or ignored.
 */

export type StudioHandoffFieldStatus = "used" | "stored" | "ignored";

export type StudioHandoffFieldAuditRow = {
  field: string;
  status: StudioHandoffFieldStatus;
  notes: string;
};

export const STUDIO_MOTION_HANDOFF_FIELD_AUDIT: StudioHandoffFieldAuditRow[] = [
  { field: "directorProfile", status: "used", notes: "World rules + director prompt in execution package (V11)." },
  { field: "shotType", status: "used", notes: "Director execution injection per scene." },
  { field: "cameraMovement", status: "used", notes: "Director execution injection per scene." },
  { field: "sceneEnergy", status: "used", notes: "Energy language in director execution block." },
  { field: "worldMemory", status: "used", notes: "World rules on every scene execution package." },
  { field: "characterMemory", status: "used", notes: "Character constraint lines in execution prompts." },
  { field: "locationMemory", status: "used", notes: "Location rules when scene matches story location." },
  { field: "propMemory", status: "used", notes: "Prop rules when scene props match memory." },
  { field: "generatedPrompt", status: "used", notes: "Primary prompt in sceneExecutionPackage / executionPrompt." },
  { field: "continuityPrompt", status: "used", notes: "Continuity rules block in execution package." },
  { field: "stylePrompt", status: "stored", notes: "Folded into generatedPrompt; not separately injected at Vidu." },
  { field: "characterBlocking", status: "used", notes: "V45 motion instructions → Vidu story prompt." },
  { field: "sceneComposition", status: "used", notes: "V45 motion instructions (composition focus)." },
  { field: "assetPlacement", status: "used", notes: "V45 motion instructions (blocking layout)." },
  { field: "speakerPerformance", status: "used", notes: "V45 emotion/performance line in motion instructions." },
  { field: "storyIntelligence", status: "used", notes: "Arc phase heuristic in motion instructions (structural)." },
  { field: "aiDirectorDirection", status: "used", notes: "aiDirectorNotes on scene 1 via motion instructions." },
  { field: "transitionToNext", status: "used", notes: "Camera/transition line in motion instructions when not cut." },
  { field: "consistencyReport", status: "stored", notes: "QA metadata; warnings surface via executionWarnings." },
  { field: "visionReport", status: "stored", notes: "Motion QA UI only." },
  { field: "characterConsistencyReport", status: "stored", notes: "Intelligence snapshot + drift warnings." },
  { field: "sceneConsistencyScore", status: "stored", notes: "Motion inspector QA badges." },
  { field: "promptStyleProfile", status: "used", notes: "Included in executionPackage summary." },
  { field: "studioContext.notes", status: "ignored", notes: "Wizard context only; scene text uses title/action." },
];
