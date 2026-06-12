import type { PublishProject } from "@/types/publish-overlay";

const STORAGE_KEY = "hc-publish-projects-v1";

function readStore(): Record<string, PublishProject> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, PublishProject>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, PublishProject>): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function createPublishProjectId(): string {
  return crypto.randomUUID();
}

export function createPublishProject(params: {
  name: string;
  videoUrl: string;
  durationSeconds?: number;
  source?: PublishProject["source"];
  motionProjectId?: string;
  mediaKind?: PublishProject["mediaKind"];
  imageUrl?: string;
  imageUrls?: string[];
  editorSessionId?: string;
  publishIntent?: string;
  generationPackageId?: string;
  workflow?: string;
  metadata?: Record<string, unknown>;
}): PublishProject {
  const now = new Date().toISOString();
  return {
    id: createPublishProjectId(),
    name: params.name,
    videoUrl: params.videoUrl,
    durationSeconds: params.durationSeconds ?? 30,
    platform: "tiktok",
    overlays: [],
    subtitles: [],
    status: "draft",
    source: params.source ?? "standalone",
    motionProjectId: params.motionProjectId,
    mediaKind: params.mediaKind ?? "video",
    imageUrl: params.imageUrl,
    imageUrls: params.imageUrls,
    editorSessionId: params.editorSessionId,
    publishIntent: params.publishIntent,
    generationPackageId: params.generationPackageId,
    workflow: params.workflow,
    metadata: params.metadata,
    createdAt: now,
    updatedAt: now,
  };
}

export function savePublishProject(project: PublishProject): PublishProject {
  const next = { ...project, updatedAt: new Date().toISOString() };
  const store = readStore();
  store[next.id] = next;
  writeStore(store);
  return next;
}

export function loadPublishProject(id: string): PublishProject | null {
  return readStore()[id] ?? null;
}

export function listPublishProjects(limit = 20): PublishProject[] {
  return Object.values(readStore())
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}
