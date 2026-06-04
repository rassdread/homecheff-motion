import { StudioWorldDetailView } from "@/components/studio/studio-world-detail-view";

type PageProps = { params: Promise<{ id: string }> };

export default async function StudioWorldDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <StudioWorldDetailView worldId={id} />;
}
