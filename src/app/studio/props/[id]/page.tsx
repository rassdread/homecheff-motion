import { StudioPropDetailView } from "@/components/studio/studio-prop-detail-view";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function StudioPropDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <StudioPropDetailView propId={id} />;
}
