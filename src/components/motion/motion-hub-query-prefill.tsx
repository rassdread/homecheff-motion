"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  buildAssistantPrefillRoute,
  storeAssistantPrefillPackage,
} from "@/lib/assistant-prefill-storage";
import { buildMotionHubPrefillPackage } from "@/lib/motion-hub-navigation";
import { isMotionActionPresetId } from "@/lib/motion-action-presets";
import type { MotionHubPhotoIntentId } from "@/types/motion-studio-hub";

const PHOTO_INTENTS: MotionHubPhotoIntentId[] = [
  "animate_photo",
  "bring_photo_to_life",
  "photo_to_video",
];

function isPhotoIntent(value: string | null): value is MotionHubPhotoIntentId {
  return Boolean(value && (PHOTO_INTENTS as readonly string[]).includes(value));
}

/** Applies Motion Hub deep links (?preset=, ?photoIntent=, ?showcaseItem=) via existing prefill storage. */
export function MotionHubQueryPrefillApplier() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const appliedRef = useRef(false);

  useEffect(() => {
    if (appliedRef.current) {
      return;
    }
    const presetParam = searchParams.get("preset");
    const photoIntentParam = searchParams.get("photoIntent");
    const showcaseItem = searchParams.get("showcaseItem") ?? undefined;
    const prefillId = searchParams.get("prefill");

    if (prefillId) {
      return;
    }

    const presetId =
      presetParam && isMotionActionPresetId(presetParam) ? presetParam : undefined;
    const photoIntentId = isPhotoIntent(photoIntentParam) ? photoIntentParam : undefined;

    if (!presetId && !photoIntentId && !showcaseItem) {
      return;
    }

    const pkg = buildMotionHubPrefillPackage({
      presetId,
      photoIntentId: photoIntentId ?? (showcaseItem ? "photo_to_video" : undefined),
      showcaseItemId: showcaseItem,
    });
    if (!pkg) {
      return;
    }

    appliedRef.current = true;
    storeAssistantPrefillPackage(pkg);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("preset");
    next.delete("photoIntent");
    next.delete("showcaseItem");
    next.set("prefill", pkg.id);
    router.replace(`/animate/instant?${next.toString()}`, { scroll: false });
  }, [router, searchParams]);

  return null;
}
