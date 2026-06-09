import { StudioAssetLibrary } from "@/components/studio/studio-asset-library";
import type { AssetLibraryTab } from "@/lib/studio-asset-library-filters";

type Props = {
  searchParams: Promise<{ tab?: string; filter?: string }>;
};

export default async function StudioAssetsBrowsePage({ searchParams }: Props) {
  const params = await searchParams;
  const tab = params.tab as AssetLibraryTab | undefined;
  const collection = params.filter === "favorites" ? "favorites" : params.filter === "generated" ? "generated" : "";
  return <StudioAssetLibrary layout="page" initialTab={tab} initialCollection={collection} />;
}
