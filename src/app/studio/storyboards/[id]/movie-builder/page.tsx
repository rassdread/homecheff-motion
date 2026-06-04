"use client";

import { use } from "react";
import { StudioMovieBuilder } from "@/components/studio/studio-movie-builder";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function StudioMovieBuilderPage({ params }: PageProps) {
  const { id } = use(params);
  return <StudioMovieBuilder storyboardId={id} />;
}
