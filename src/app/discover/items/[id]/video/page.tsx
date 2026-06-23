import { DiscoverItemVideoCta } from "@/components/motion/discover-item-video-cta";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function DiscoverItemVideoPage({ params }: Props) {
  const { id } = await params;
  return <DiscoverItemVideoCta itemId={id} />;
}
