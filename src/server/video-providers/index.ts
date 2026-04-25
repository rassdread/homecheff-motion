import { MockVideoProvider } from "./mock-provider";
import type { VideoProvider } from "./types";
import { ViduVideoProvider } from "./vidu";

export * from "./types";

export type AnimationProviderId = "vidu" | "mock";

/**
 * Which provider the app is configured to use (env only, server-side).
 * `mock` when ANIMATION_PROVIDER is unset or not `vidu`.
 */
export function getSelectedAnimationProviderId(): AnimationProviderId {
  const raw = (process.env.ANIMATION_PROVIDER ?? "mock").trim().toLowerCase();
  return raw === "vidu" ? "vidu" : "mock";
}

export function getVideoProvider(): VideoProvider {
  if (getSelectedAnimationProviderId() === "vidu") {
    return new ViduVideoProvider();
  }
  return new MockVideoProvider();
}
