"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StudioRootPage } from "@/components/studio/studio-root-page";
import { StudioProductLandingPage } from "@/components/suite/studio-product-landing-page";
import { studioLandingHasDeepLink } from "@/lib/studio-product-landing-routes";
import { studioProductLandingConfig } from "@/lib/studio-product-landing-config";

function StudioLandingContent() {
  const searchParams = useSearchParams();
  if (studioLandingHasDeepLink(searchParams)) {
    return <StudioRootPage />;
  }
  return <StudioProductLandingPage config={studioProductLandingConfig("studio")} />;
}

export function StudioLandingRoute() {
  return (
    <Suspense fallback={null}>
      <StudioLandingContent />
    </Suspense>
  );
}
