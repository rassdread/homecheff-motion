import { redirect } from "next/navigation";
import { StudioLandingRoute } from "@/components/suite/studio-landing-route";

type StudioPageProps = {
  searchParams: Promise<{ storyboardId?: string; stage?: string; legacy?: string }>;
};

export default async function StudioPage({ searchParams }: StudioPageProps) {
  const params = await searchParams;
  const storyboardId = params.storyboardId?.trim() ?? "";
  if (storyboardId && params.legacy !== "1") {
    const stage = params.stage?.trim() ?? "";
    const query = stage ? `?stage=${encodeURIComponent(stage)}` : "";
    redirect(`/studio/open/storyboard/${encodeURIComponent(storyboardId)}${query}`);
  }
  return <StudioLandingRoute />;
}
