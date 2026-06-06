"use client";

import { use } from "react";
import { StudioStoryboardEditor } from "@/components/studio/studio-storyboard-editor";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function StudioStoryboardClassicEditorPage({ params }: PageProps) {
  const { id } = use(params);
  return <StudioStoryboardEditor storyboardId={id} />;
}
