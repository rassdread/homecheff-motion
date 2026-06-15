"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { EditorProductPage } from "@/components/editor/editor-product-page";
import { EditorLandingContinueCard } from "@/components/suite/editor-landing-continue-card";
import { StudioProductLandingPage } from "@/components/suite/studio-product-landing-page";
import { editorLandingHasDeepLink } from "@/lib/studio-product-landing-routes";
import { studioProductLandingConfig } from "@/lib/studio-product-landing-config";

function EditorLandingContent() {
  const searchParams = useSearchParams();
  if (editorLandingHasDeepLink(searchParams)) {
    return <EditorProductPage />;
  }

  const config = studioProductLandingConfig("editor");

  return (
    <StudioProductLandingPage
      config={config}
      continueSlot={<EditorLandingContinueCard />}
    />
  );
}

export function EditorLandingRoute() {
  return (
    <Suspense fallback={null}>
      <EditorLandingContent />
    </Suspense>
  );
}
