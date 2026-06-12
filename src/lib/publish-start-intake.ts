export type PublishAssetLabel =
  | "video"
  | "logo"
  | "script"
  | "subtitles"
  | "branding"
  | "reference"
  | "music"
  | "voice"
  | "image"
  | "poster";

export type PublishIntakeFile = {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  labels: PublishAssetLabel[];
};

export const PUBLISH_INTAKE_ACCEPT =
  "video/*,image/*,audio/*,.pdf,.txt,.md,.docx,.rtf,.json,.srt,.vtt,.hc";

export function inferPublishLabels(file: File): PublishAssetLabel[] {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  const labels: PublishAssetLabel[] = [];

  if (type.startsWith("video/")) labels.push("video");
  if (type.startsWith("image/")) labels.push("image");
  if (type.startsWith("audio/")) labels.push("voice", "music");
  if (name.endsWith(".srt") || name.endsWith(".vtt")) labels.push("subtitles", "script");
  if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".json")) labels.push("script");
  if (name.endsWith(".pdf") || name.endsWith(".docx") || name.endsWith(".rtf")) labels.push("script");
  if (name.endsWith(".hc")) labels.push("reference");
  if (/logo|brand/.test(name)) labels.push("logo", "branding");
  if (/poster|flyer/.test(name)) labels.push("poster", "image");
  if (labels.length === 0) labels.push("reference");

  return [...new Set(labels)];
}

export function primaryPublishMediaKind(files: PublishIntakeFile[]): "video" | "image" | "carousel" {
  const videos = files.filter((f) => f.labels.includes("video"));
  if (videos.length === 1) return "video";
  const images = files.filter((f) => f.labels.includes("image") || f.labels.includes("poster"));
  if (images.length > 1) return "carousel";
  if (images.length === 1) return "image";
  return "video";
}
