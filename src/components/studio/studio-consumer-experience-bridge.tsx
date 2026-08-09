"use client";

/**
 * S.6G — Mount on consumer generate surfaces.
 * Ensures entry doors call openExperience (Director) and persist session.
 * Does not redesign host pages.
 */

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  loadConsumerExperienceSession,
  openExperience,
  saveConsumerExperienceSession,
  type StudioProductMode,
} from "@/lib/studio-creative-director";

function parseMode(raw: string | null): StudioProductMode {
  const v = (raw ?? "").toLowerCase();
  if (v === "professional") return "PROFESSIONAL";
  if (v === "director") return "DIRECTOR";
  return "QUICK";
}

type Props = {
  /** When true, redirect Quick intent/experience entries to the guided funnel. */
  redirectQuickToFunnel?: boolean;
};

export function StudioConsumerExperienceBridge({
  redirectQuickToFunnel = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    const fromExperience = searchParams.get("fromExperience") === "1";
    const experience = searchParams.get("experience");
    const intent = searchParams.get("intent");
    const photoIntent = searchParams.get("photoIntent");
    const preset = searchParams.get("preset");
    const flow = searchParams.get("flow");
    const style = searchParams.get("style");
    const mode = parseMode(searchParams.get("mode"));
    const entryFan = searchParams.get("entryFan");

    if (!experience && !intent && !photoIntent && !preset && !flow && !style && !entryFan) {
      return;
    }

    ran.current = true;

    const opened = openExperience({
      experienceId: experience,
      videoIntent: intent,
      photoIntent,
      motionPreset: preset,
      characterStudioFlow: flow,
      instantStyle: style,
      entryFan,
      mode,
      answers: loadConsumerExperienceSession()?.answers ?? null,
    });

    if (opened.ok && opened.orchestration) {
      saveConsumerExperienceSession({
        version: 1,
        experienceId: opened.orchestration.experience.experienceId,
        mode: opened.mode,
        answers: loadConsumerExperienceSession()?.answers ?? {},
        matrixExperienceId: opened.orchestration.handoff.matrixExperienceId,
        continuityStrategy: opened.continuityStrategy,
        sourceAsset: opened.sourceAsset,
        returnTo: opened.returnTo,
        updatedAt: Date.now(),
      });
    }

    if (
      redirectQuickToFunnel &&
      !fromExperience &&
      opened.ok &&
      opened.mode === "QUICK" &&
      opened.orchestration
    ) {
      const params = new URLSearchParams();
      params.set("experience", opened.orchestration.experience.experienceId);
      params.set("mode", "quick");
      if (intent) params.set("intent", intent);
      if (photoIntent) params.set("photoIntent", photoIntent);
      if (preset) params.set("preset", preset);
      if (flow) params.set("flow", flow);
      router.replace(`/studio/experience?${params.toString()}`);
    }
  }, [router, searchParams, redirectQuickToFunnel]);

  return null;
}
