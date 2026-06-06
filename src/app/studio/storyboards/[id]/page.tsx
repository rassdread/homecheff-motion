import { redirect } from "next/navigation";
import { studioWorkspaceHref } from "@/lib/studio-workspace-href";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function StudioStoryboardPage({ params }: PageProps) {
  const { id } = await params;
  redirect(studioWorkspaceHref(id));
}
