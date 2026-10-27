"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StudioRootPage } from "@/components/studio/studio-root-page";
import { StudioUnifiedHomePage } from "@/components/studio/studio-unified-home-page";
import { studioRouteNeedsRootPage } from "@/lib/studio-product-landing-routes";

function StudioStoryboardOpenRedirect({ storyboardId, stage }: { storyboardId: string; stage: string | null }) {
  const router = useRouter();
  useEffect(() => {
    const params = new URLSearchParams();
    if (stage) params.set("stage", stage);
    const query = params.toString();
    router.replace(`/studio/open/storyboard/${encodeURIComponent(storyboardId)}${query ? `?${query}` : ""}`);
  }, [router, stage, storyboardId]);
  return null;
}

function StudioLandingContent() {
  const searchParams = useSearchParams();
  const storyboardId = searchParams.get("storyboardId")?.trim() ?? "";
  if (storyboardId && searchParams.get("legacy") !== "1") {
    return <StudioStoryboardOpenRedirect storyboardId={storyboardId} stage={searchParams.get("stage")} />;
  }
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
