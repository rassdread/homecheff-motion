/**
 * Studio Director Panel V2 — feature flag.
 * Set NEXT_PUBLIC_STUDIO_DIRECTOR_V2=true to enable the film console UI per scene.
 */
export function isStudioDirectorV2Enabled(): boolean {
  return process.env.NEXT_PUBLIC_STUDIO_DIRECTOR_V2 === "true";
}
