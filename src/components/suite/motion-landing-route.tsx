"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StudioProductLandingPage } from "@/components/suite/studio-product-landing-page";
import { motionLandingHasDeepLink } from "@/lib/studio-product-landing-routes";
import { studioProductLandingConfig } from "@/lib/studio-product-landing-config";

function MotionLandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!motionLandingHasDeepLink(searchParams)) {
      return;
    }
    const query = searchParams.toString();
    router.replace(`/animate/instant${query ? `?${query}` : ""}`);
  }, [router, searchParams]);

  if (motionLandingHasDeepLink(searchParams)) {
    return null;
  }

  return <StudioProductLandingPage config={studioProductLandingConfig("motion")} />;
}

export function MotionLandingRoute() {
  return (
    <Suspense fallback={null}>
      <MotionLandingContent />
    </Suspense>
  );
}
