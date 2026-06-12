export function buildPublishHandoffUrl(input: {
  editorSessionId: string;
  intent:
    | "text_overlay"
    | "social_post"
    | "social_carousel"
    | "subtitles"
    | "voice"
    | "music"
    | "print"
    | "flyer"
    | "story";
  resultUrl?: string;
  packageId?: string;
}): string {
  const params = new URLSearchParams({
    editorSession: input.editorSessionId,
    publishIntent: input.intent,
    handoffSource: "editor_generation",
  });
  if (input.resultUrl) {
    params.set("resultUrl", input.resultUrl);
  }
  if (input.packageId) {
    params.set("generationPackage", input.packageId);
  }
  return `/publish/start?${params.toString()}`;
}

export function parsePublishHandoffParams(searchParams: URLSearchParams): {
  editorSessionId?: string;
  intent?: string;
  resultUrl?: string;
  packageId?: string;
} {
  return {
    editorSessionId: searchParams.get("editorSession") ?? undefined,
    intent: searchParams.get("publishIntent") ?? undefined,
    resultUrl: searchParams.get("resultUrl") ?? undefined,
    packageId: searchParams.get("generationPackage") ?? undefined,
  };
}
