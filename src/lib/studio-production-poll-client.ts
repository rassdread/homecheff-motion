"use client";

import { fetchInstantPremiumStatus } from "@/lib/instant-premium-polling-api";

const POLL_MS = 3000;
const MAX_POLL_MS = 600_000;

export async function pollMotionProjectFinalVideo(projectId: string): Promise<string> {
  const started = Date.now();
  while (Date.now() - started < MAX_POLL_MS) {
    const status = await fetchInstantPremiumStatus(projectId);
    if (status.kind === "ok") {
      const url = status.data.finalVideoUrl?.trim();
      if (url) {
        return url;
      }
      if (status.data.status === "failed" || status.data.status === "cancelled") {
        throw new Error("Video creation failed");
      }
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  throw new Error("Video creation timed out");
}
