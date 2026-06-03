import { StudioLocationDetailView } from "@/components/studio/studio-location-detail-view";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function StudioLocationDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <StudioLocationDetailView locationId={id} />;
}
