"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PublishProductPage } from "@/components/publish/publish-product-page";
import { StudioProductLandingPage } from "@/components/suite/studio-product-landing-page";
import { publishLandingHasDeepLink } from "@/lib/studio-product-landing-routes";
import { studioProductLandingConfig } from "@/lib/studio-product-landing-config";

function PublishLandingContent() {
  const searchParams = useSearchParams();
  if (publishLandingHasDeepLink(searchParams)) {
    return <PublishProductPage />;
  }
  return <StudioProductLandingPage config={studioProductLandingConfig("publish")} />;
}

export function PublishLandingRoute() {
  return (
    <Suspense fallback={null}>
      <PublishLandingContent />
    </Suspense>
  );
}
