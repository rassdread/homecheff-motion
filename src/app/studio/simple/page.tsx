import type { Metadata } from "next";
import { SimpleStudioCreatePage, SimpleStudioHub } from "@/components/simple-studio/simple-studio-create-page";
import { parseSimpleStudioPurpose } from "@/lib/simple-studio/catalog";

export const metadata: Metadata = {
  title: "Eenvoudig maken | HomeCheff Studio",
  description: "Foto + beschrijving → social content, zonder video-editing kennis.",
};

type Props = {
  searchParams?: Promise<{ purpose?: string }> | { purpose?: string };
};

export default async function StudioSimpleRoute({ searchParams }: Props) {
  const params = await Promise.resolve(searchParams ?? {});
  const purposeRaw = params.purpose?.trim();
  if (!purposeRaw) {
    return <SimpleStudioHub />;
  }
  const purpose = parseSimpleStudioPurpose(purposeRaw);
  return <SimpleStudioCreatePage purpose={purpose} />;
}
