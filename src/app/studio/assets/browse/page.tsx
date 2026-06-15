import { StudioLibraryConsistencyBrowse } from "@/components/studio/studio-library-consistency-browse";
import type { LibraryConsistencyFilterTab } from "@/lib/library-asset-index";

type Props = {
  searchParams: Promise<{ tab?: string; project?: string }>;
};

export default async function StudioAssetsBrowsePage({ searchParams }: Props) {
  const params = await searchParams;
  const tab = params.tab as LibraryConsistencyFilterTab | undefined;
  return (
    <StudioLibraryConsistencyBrowse initialTab={tab} initialProjectId={params.project} />
  );
}
