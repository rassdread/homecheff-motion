"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchRecentLibraryAdditions } from "@/lib/library-consistency-client";
import {
  enrichMotionReferencesWithCharacterAttach,
  motionReadyFromAttachContext,
  resolveMotionCharacterAttachContext,
} from "@/lib/motion-character-reference-attach";
import type { LibraryConsistencyRecord } from "@/types/library-consistency";
import type { PosterMotionSettings } from "@/lib/poster-motion-preserve";
import type { MotionUploadedReference } from "@/types/motion-preset-engine";

export function useMotionCharacterAttach(input: {
  references: Array<MotionUploadedReference & { imageUrl?: string | null }>;
  posterMotionSettings: PosterMotionSettings;
  enabled?: boolean;
}) {
  const [libraryRecords, setLibraryRecords] = useState<LibraryConsistencyRecord[]>([]);

  useEffect(() => {
    if (input.enabled === false) {
      return;
    }
    let cancelled = false;
    void fetchRecentLibraryAdditions(80).then((records) => {
      if (!cancelled) {
        setLibraryRecords(records);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [input.enabled]);

  const attachContext = useMemo(
    () =>
      resolveMotionCharacterAttachContext({
        posterMotionSettings: input.posterMotionSettings,
        libraryRecords,
        preparedCharacterAssetId: input.posterMotionSettings.preparedCharacterAssetId,
      }),
    [input.posterMotionSettings, libraryRecords]
  );

  const enrichedReferences = useMemo(
    () =>
      enrichMotionReferencesWithCharacterAttach({
        references: input.references,
        attachContext,
        libraryRecords,
      }),
    [input.references, attachContext, libraryRecords]
  );

  return {
    enrichedReferences,
    attachContext,
    motionReadyFlag: motionReadyFromAttachContext(attachContext),
    libraryRecords,
  };
}
