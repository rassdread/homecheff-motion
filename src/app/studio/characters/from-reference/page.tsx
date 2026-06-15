"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StudioCharacterFromReferenceWizard } from "@/components/studio/studio-character-from-reference-wizard";
import type { CharacterReferenceMode } from "@/types/character-cluster";

function FromReferencePageContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const initialMode =
    mode === "exact" || mode === "custom_variant" || mode === "new_character" ? mode : null;

  const hcProject = searchParams.get("hcProject");
  const projectId = hcProject ?? searchParams.get("projectId");

  return (
    <StudioCharacterFromReferenceWizard
      projectId={projectId}
      projectTitle={searchParams.get("projectTitle")}
      storyboardId={searchParams.get("storyboardId")}
      sceneId={searchParams.get("sceneId")}
      requirementId={searchParams.get("requirementId")}
      returnTo={searchParams.get("returnTo")}
      seedImageUrl={searchParams.get("sourceImage")}
      seedStorageKey={searchParams.get("sourceAsset")}
      seedName={searchParams.get("sourceName")}
      seedCharacterId={searchParams.get("characterId")}
      initialMode={initialMode as CharacterReferenceMode | null}
    />
  );
}

export default function StudioCharacterFromReferencePage() {
  return (
    <Suspense fallback={null}>
      <FromReferencePageContent />
    </Suspense>
  );
}
