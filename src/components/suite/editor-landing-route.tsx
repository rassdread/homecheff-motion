"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { EditorProductPage } from "@/components/editor/editor-product-page";
import { StudioProductLandingPage } from "@/components/suite/studio-product-landing-page";
import { listRecentEditorDocuments } from "@/lib/editor-canvas-session";
import { editorLandingHasDeepLink } from "@/lib/studio-product-landing-routes";
import { studioProductLandingConfig } from "@/lib/studio-product-landing-config";

function EditorLandingContent() {
  const searchParams = useSearchParams();
  if (editorLandingHasDeepLink(searchParams)) {
    return <EditorProductPage />;
  }

  const recent = listRecentEditorDocuments()[0];
  const config = studioProductLandingConfig("editor");

  return (
    <StudioProductLandingPage
      config={config}
      continueCard={
        recent
          ? {
              label: recent.name,
              href: `/editor?session=${encodeURIComponent(recent.sessionId)}`,
            }
          : null
      }
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
