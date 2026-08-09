/**
 * S.6H — Creative Director Adaptive Presentation Layer.
 *
 * Presentation ≠ product mode (QUICK / PROFESSIONAL / DIRECTOR).
 * Adaptive Workspace posture drives chrome; this resolver drives Director visuals only.
 * Never changes Continuity, Matrix, Provider Transform, GenerationJobs, Credits, or Billing.
 */

import {
  resolveStudioOrientation,
  resolveStudioWorkspacePosture,
  STUDIO_POSTURE_BREAKPOINTS,
  type StudioOrientation,
  type StudioWorkspacePosture,
} from "@/lib/studio-workspace-posture";

/** Presentation modes — UI density only. */
export const STUDIO_DIRECTOR_PRESENTATION_MODES = [
  "IMMERSIVE_DESKTOP",
  "COMPACT_TABLET",
  "COMPACT_MOBILE",
  "MINIMAL_MOBILE",
] as const;

export type StudioDirectorPresentationMode =
  (typeof STUDIO_DIRECTOR_PRESENTATION_MODES)[number];

export type StudioDirectorPresentationPlan = {
  version: "6h.1";
  mode: StudioDirectorPresentationMode;
  posture: StudioWorkspacePosture;
  orientation: StudioOrientation;
  /** Creative Globe / orbit — never true on MINIMAL_MOBILE or COMPACT_MOBILE */
  renderGlobe: boolean;
  /** Orbiting pack nodes (desktop / tablet only) */
  renderOrbit: boolean;
  /** Max orbit nodes before clustering into “more” */
  maxVisibleOrbitNodes: number;
  /** CSS / GPU animation budget */
  allowRichMotion: boolean;
  /** Particle / ambient GPU effects (desktop immersive only) */
  allowParticles: boolean;
  /** Pack cards / list (always available; primary on mobile) */
  renderPackCards: boolean;
  /** Larger touch targets */
  touchOptimized: boolean;
  /** Collapsible inspectors / coach */
  collapsibleInspectors: boolean;
  /** Permanent Adaptive Presentation Layer for future Studio capabilities */
  inheritsAdaptiveWorkspace: true;
};

/** Landscape mobile needs enough width for compact director chrome (not globe). */
export const STUDIO_DIRECTOR_COMPACT_MOBILE_MIN_WIDTH = 640;

/**
 * Resolve presentation from viewport. Pure — no provider / billing side effects.
 */
export function resolveStudioDirectorPresentation(
  width: number,
  height: number
): StudioDirectorPresentationPlan {
  const posture = resolveStudioWorkspacePosture(width, height);
  const orientation = resolveStudioOrientation(width, height);

  let mode: StudioDirectorPresentationMode;
  if (posture === "full" || posture === "compact") {
    mode = "IMMERSIVE_DESKTOP";
  } else if (posture === "focused") {
    mode = "COMPACT_TABLET";
  } else if (
    orientation === "landscape" &&
    width >= STUDIO_DIRECTOR_COMPACT_MOBILE_MIN_WIDTH
  ) {
    mode = "COMPACT_MOBILE";
  } else {
    mode = "MINIMAL_MOBILE";
  }

  return planForPresentationMode(mode, posture, orientation);
}

export function planForPresentationMode(
  mode: StudioDirectorPresentationMode,
  posture: StudioWorkspacePosture,
  orientation: StudioOrientation
): StudioDirectorPresentationPlan {
  switch (mode) {
    case "IMMERSIVE_DESKTOP":
      return {
        version: "6h.1",
        mode,
        posture,
        orientation,
        renderGlobe: true,
        renderOrbit: true,
        maxVisibleOrbitNodes: 12,
        allowRichMotion: true,
        allowParticles: true,
        renderPackCards: true,
        touchOptimized: false,
        collapsibleInspectors: false,
        inheritsAdaptiveWorkspace: true,
      };
    case "COMPACT_TABLET":
      return {
        version: "6h.1",
        mode,
        posture,
        orientation,
        renderGlobe: true,
        renderOrbit: true,
        maxVisibleOrbitNodes: 6,
        allowRichMotion: false,
        allowParticles: false,
        renderPackCards: true,
        touchOptimized: true,
        collapsibleInspectors: true,
        inheritsAdaptiveWorkspace: true,
      };
    case "COMPACT_MOBILE":
      return {
        version: "6h.1",
        mode,
        posture,
        orientation,
        renderGlobe: false,
        renderOrbit: false,
        maxVisibleOrbitNodes: 0,
        allowRichMotion: false,
        allowParticles: false,
        renderPackCards: true,
        touchOptimized: true,
        collapsibleInspectors: true,
        inheritsAdaptiveWorkspace: true,
      };
    case "MINIMAL_MOBILE":
    default:
      return {
        version: "6h.1",
        mode: "MINIMAL_MOBILE",
        posture,
        orientation,
        renderGlobe: false,
        renderOrbit: false,
        maxVisibleOrbitNodes: 0,
        allowRichMotion: false,
        allowParticles: false,
        renderPackCards: true,
        touchOptimized: true,
        collapsibleInspectors: true,
        inheritsAdaptiveWorkspace: true,
      };
  }
}

/** Hard gate: mobile presentations never mount the Creative Globe. */
export function shouldRenderCreativeGlobe(plan: StudioDirectorPresentationPlan): boolean {
  if (plan.mode === "MINIMAL_MOBILE" || plan.mode === "COMPACT_MOBILE") {
    return false;
  }
  return plan.renderGlobe;
}

/** Product mode is orthogonal — never rewritten by presentation. */
export function assertPresentationDoesNotReplaceProductMode(
  presentation: StudioDirectorPresentationMode,
  productMode: "QUICK" | "PROFESSIONAL" | "DIRECTOR"
): { presentation: StudioDirectorPresentationMode; productMode: typeof productMode } {
  return { presentation, productMode };
}

export function describeDirectorPresentation(plan: StudioDirectorPresentationPlan): string {
  return `${plan.mode} (globe=${shouldRenderCreativeGlobe(plan)}, orbit=${plan.renderOrbit}, cards=${plan.renderPackCards})`;
}

export { STUDIO_POSTURE_BREAKPOINTS };
