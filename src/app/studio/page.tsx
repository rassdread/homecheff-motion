import { redirect } from "next/navigation";
import { StudioLandingRoute } from "@/components/suite/studio-landing-route";
import { studioStoryboardOpenHref } from "@/lib/studio-v27-workflow-routes";

type StudioPageProps = {
  searchParams: Promise<{
    storyboardId?: string;
    stage?: string;
    legacy?: string;
    tool?: string;
    scene?: string;
    idea?: string;
    returnTo?: string;
  }>;
};

export default async function StudioPage({ searchParams }: StudioPageProps) {
  const params = await searchParams;
  const storyboardId = params.storyboardId?.trim() ?? "";
  if (storyboardId && params.legacy !== "1") {
    const destination =
      studioStoryboardOpenHref({
        storyboardId,
        stage: params.stage,
        tool: params.tool,
        scene: params.scene,
        idea: params.idea,
        returnTo: params.returnTo,
      }) ?? `/studio/open/storyboard/${encodeURIComponent(storyboardId)}`;
    redirect(destination);
  }
  return <StudioLandingRoute />;
}
