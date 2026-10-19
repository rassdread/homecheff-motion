"use client";

import { use } from "react";
import { StudioStoryboardEditor } from "@/components/studio/studio-storyboard-editor";
import { StudioFilmReturnLink } from "@/components/studio/studio-film-return-link";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function StudioStoryboardClassicEditorPage({ params }: PageProps) {
  const { id } = use(params);
  return (
    <>
      <StudioFilmReturnLink storyboardId={id} />
      <StudioStoryboardEditor storyboardId={id} />
    </>
  );
}
