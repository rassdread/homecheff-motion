"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StudioRootPage } from "@/components/studio/studio-root-page";
import { StudioUnifiedHomePage } from "@/components/studio/studio-unified-home-page";
import { studioRouteNeedsRootPage } from "@/lib/studio-product-landing-routes";

function StudioLandingContent() {
  const searchParams = useSearchParams();
  if (studioRouteNeedsRootPage(searchParams)) {
    return <StudioRootPage />;
  }
  return <StudioUnifiedHomePage />;
}

export function StudioLandingRoute() {
  return (
    <Suspense fallback={null}>
      <StudioLandingContent />
    </Suspense>
  );
}
