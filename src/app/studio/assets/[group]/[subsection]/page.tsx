import { notFound } from "next/navigation";
import { StudioAssetsHubSection } from "@/components/studio/studio-assets-hub-section";
import { resolveHubSection } from "@/lib/studio-asset-hub-sections";

type Props = {
  params: Promise<{ group: string; subsection: string }>;
};

export default async function StudioAssetsHubSectionPage({ params }: Props) {
  const { group, subsection } = await params;
  const section = resolveHubSection(group, subsection);
  if (!section) {
    notFound();
  }
  return <StudioAssetsHubSection section={section} />;
}
