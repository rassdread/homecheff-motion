import type { TextAvoidZone, TextSubjectSafetyDebugEntry } from "@/types/text-avoid-zone";

const DEBUG_ENV = "HC_TEXT_PLACEMENT_DEBUG";

export function isTextPlacementDebugEnabled(): boolean {
  const v = process.env[DEBUG_ENV] ?? process.env.HC_SAFE_ZONE_DEBUG;
  return v === "1" || v === "true";
}

const sessionLog: TextSubjectSafetyDebugEntry[] = [];

export function logTextSubjectSafetyDebug(entry: TextSubjectSafetyDebugEntry): void {
  sessionLog.push(entry);
  if (isTextPlacementDebugEnabled()) {
    console.info("[text-placement-v1]", JSON.stringify(entry, null, 0));
  }
}

export function logAvoidZonePlan(
  sceneKey: string,
  zones: TextAvoidZone[],
  meta: Record<string, unknown>
): void {
  if (!isTextPlacementDebugEnabled()) return;
  console.info(
    "[text-placement-v1:zones]",
    sceneKey,
    JSON.stringify({ zoneCount: zones.length, meta, zones: zones.slice(0, 12) })
  );
}

export function getTextPlacementDebugSession(): TextSubjectSafetyDebugEntry[] {
  return [...sessionLog];
}

export function clearTextPlacementDebugSession(): void {
  sessionLog.length = 0;
}
