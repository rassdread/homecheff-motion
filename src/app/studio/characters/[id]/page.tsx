import { StudioCharacterDetailView } from "@/components/studio/studio-character-detail-view";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function StudioCharacterDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <StudioCharacterDetailView characterId={id} />;
}
