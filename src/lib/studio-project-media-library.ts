export const MADE_WITH_PASSION_PROJECT_ID = "cmvcbmxdp00032jryohiw8a84";

export const PROJECT_MEDIA_ACTIVE_WINDOW_MS = 6 * 60 * 60 * 1000;

export const PROJECT_MEDIA_PAGE_SIZE = 24;

export const PROJECT_MEDIA_SECTIONS = [
  "all",
  "images",
  "videos",
  "audio",
  "processing",
  "failed",
  "archive",
] as const;

export type ProjectMediaSection = (typeof PROJECT_MEDIA_SECTIONS)[number];

export type ProjectMediaBucket = Exclude<ProjectMediaSection, "all">;

export type ProjectMediaStatus = "completed" | "processing" | "failed" | "archived";

export type FileProbe = "valid" | "missing" | "invalid" | "unverified" | "timeout";

export type ProjectMediaSort = "newest" | "oldest" | "name";

export type SceneImageLibraryInput = {
  id: string;
  projectId: string;
  projectTitle: string | null;
  sceneTitle: string | null;
  createdAt: string;
  imageUrl: string;
  probe?: FileProbe;
};

export type AnimationProjectLibraryInput = {
  id: string;
  title: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  videoUrl: string | null;
  posterUrl: string | null;
  durationSeconds: number | null;
  probe?: FileProbe;
  activeJob: boolean;
};

export type AudioLibraryInput = {
  id: string;
  name: string;
  createdAt: string;
  audioUrl: string;
  durationSeconds: number | null;
};

export type GenerationJobLibraryInput = {
  id: string;
  status: string;
  capability: string;
  createdAt: string;
  updatedAt: string;
  projectId: string | null;
  projectTitle: string | null;
};

export type ProjectMediaItem = {
  id: string;
  projectId: string;
  projectTitle: string;
  mediaType: "image" | "video" | "audio";
  section: ProjectMediaBucket;
  status: ProjectMediaStatus;
  createdAt: string;
  updatedAt: string;
  previewUrl: string | null;
  mediaUrl: string | null;
  playable: boolean;
  durationSeconds: number | null;
  projectHref: string | null;
};

const OPEN_JOB = new Set(["pending", "queued", "starting", "generating", "processing", "rendering"]);
const FAILED_JOB = new Set(["failed", "cancelled", "canceled"]);

function trimmed(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function label(title: string | null | undefined, untitledLabel: string): string {
  return trimmed(title) || untitledLabel;
}

function fresh(updatedAt: string, nowMs: number, windowMs: number): boolean {
  const time = Date.parse(updatedAt);
  return Number.isFinite(time) && nowMs - time <= windowMs;
}

function fileKeepsPlayback(probe: FileProbe | undefined): boolean {
  return probe !== "missing" && probe !== "invalid";
}

function isProtected(projectId: string, protectedIds: Set<string>): boolean {
  return protectedIds.has(projectId);
}

export function classifyProbeResponses(
  attempts: Array<{ status: number; contentType: string } | null>
): FileProbe {
  const conclusive = attempts.filter((attempt): attempt is { status: number; contentType: string } => attempt !== null);
  if (conclusive.length === 0) {
    return "timeout";
  }
  const missing = conclusive.filter((attempt) => attempt.status === 404 || attempt.status === 410);
  if (missing.length >= 2 && missing.length === conclusive.length) {
    return "missing";
  }
  const ok = conclusive.find((attempt) => attempt.status === 200 || attempt.status === 206);
  if (!ok) {
    return "timeout";
  }
  if (ok.contentType.toLowerCase().includes("text/html")) {
    return "invalid";
  }
  return "valid";
}

export function isProjectMediaSection(value: string | null): value is ProjectMediaSection {
  return PROJECT_MEDIA_SECTIONS.some((section) => section === value);
}

export function buildProjectMediaLibrary(input: {
  now: string;
  untitledLabel: string;
  activeWindowMs?: number;
  protectedProjectIds?: string[];
  sceneImages: SceneImageLibraryInput[];
  projects: AnimationProjectLibraryInput[];
  audio?: AudioLibraryInput[];
  jobs?: GenerationJobLibraryInput[];
}): ProjectMediaItem[] {
  const nowMs = Date.parse(input.now);
  const windowMs = input.activeWindowMs ?? PROJECT_MEDIA_ACTIVE_WINDOW_MS;
  const protectedIds = new Set(input.protectedProjectIds ?? [MADE_WITH_PASSION_PROJECT_ID]);
  const untitled = input.untitledLabel;
  const items: ProjectMediaItem[] = [];
  const seen = new Set<string>();
  const imageUrls = new Set<string>();
  const representedProjects = new Set<string>();

  const push = (item: ProjectMediaItem) => {
    if (seen.has(item.id)) {
      return;
    }
    seen.add(item.id);
    items.push(item);
  };

  for (const image of input.sceneImages) {
    const url = trimmed(image.imageUrl);
    const id = `scene-image:${image.id}`;
    if (!url || seen.has(id) || imageUrls.has(url)) {
      continue;
    }
    const probe = image.probe ?? "unverified";
    if (!fileKeepsPlayback(probe)) {
      continue;
    }
    imageUrls.add(url);
    const projectTitle = label(image.projectTitle, untitled);
    const scene = trimmed(image.sceneTitle);
    push({
      id,
      projectId: image.projectId,
      projectTitle: scene ? `${projectTitle} — ${scene}` : projectTitle,
      mediaType: "image",
      section: "images",
      status: "completed",
      createdAt: image.createdAt,
      updatedAt: image.createdAt,
      previewUrl: url,
      mediaUrl: url,
      playable: true,
      durationSeconds: null,
      projectHref: `/studio/storyboards/${image.projectId}`,
    });
  }

  for (const project of input.projects) {
    const projectTitle = label(project.title, untitled);
    const videoUrl = trimmed(project.videoUrl);
    const probe = project.probe ?? "unverified";
    const protectedProject = isProtected(project.id, protectedIds);
    if (videoUrl && fileKeepsPlayback(probe)) {
      push({
        id: `animation-video:${project.id}`,
        projectId: project.id,
        projectTitle,
        mediaType: "video",
        section: "videos",
        status: "completed",
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        previewUrl: trimmed(project.posterUrl) || null,
        mediaUrl: videoUrl,
        playable: true,
        durationSeconds: project.durationSeconds,
        projectHref: `/videos/${project.id}`,
      });
      representedProjects.add(project.id);
      continue;
    }

    const running = OPEN_JOB.has(project.status) && (project.activeJob || fresh(project.updatedAt, nowMs, windowMs));
    if (running) {
      push({
        id: `animation-project:${project.id}`,
        projectId: project.id,
        projectTitle,
        mediaType: "video",
        section: "processing",
        status: "processing",
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        previewUrl: trimmed(project.posterUrl) || null,
        mediaUrl: null,
        playable: false,
        durationSeconds: null,
        projectHref: `/videos/${project.id}`,
      });
      representedProjects.add(project.id);
      continue;
    }

    if (protectedProject) {
      continue;
    }

    const failed = FAILED_JOB.has(project.status);
    push({
      id: `animation-project:${project.id}`,
      projectId: project.id,
      projectTitle,
      mediaType: "video",
      section: failed ? "failed" : "archive",
      status: failed ? "failed" : "archived",
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      previewUrl: trimmed(project.posterUrl) || null,
      mediaUrl: null,
      playable: false,
      durationSeconds: null,
      projectHref: `/videos/${project.id}`,
    });
    representedProjects.add(project.id);
  }

  for (const audio of input.audio ?? []) {
    const url = trimmed(audio.audioUrl);
    if (!url) {
      continue;
    }
    push({
      id: `audio:${audio.id}`,
      projectId: "",
      projectTitle: trimmed(audio.name) || untitled,
      mediaType: "audio",
      section: "audio",
      status: "completed",
      createdAt: audio.createdAt,
      updatedAt: audio.createdAt,
      previewUrl: null,
      mediaUrl: url,
      playable: true,
      durationSeconds: audio.durationSeconds,
      projectHref: null,
    });
  }

  for (const job of input.jobs ?? []) {
    const status = job.status.toLowerCase();
    if (status === "succeeded" || status === "completed") {
      continue;
    }
    if (job.projectId && representedProjects.has(job.projectId)) {
      continue;
    }
    const running = OPEN_JOB.has(status) && fresh(job.updatedAt, nowMs, windowMs);
    const failed = FAILED_JOB.has(status);
    if (!running && !failed && !OPEN_JOB.has(status)) {
      continue;
    }
    const mediaType = job.capability.toLowerCase().includes("video") ? "video" : "image";
    push({
      id: `generation-job:${job.id}`,
      projectId: job.projectId ?? "",
      projectTitle: label(job.projectTitle, untitled),
      mediaType,
      section: running ? "processing" : failed ? "failed" : "archive",
      status: running ? "processing" : failed ? "failed" : "archived",
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      previewUrl: null,
      mediaUrl: null,
      playable: false,
      durationSeconds: null,
      projectHref: job.projectId ? `/studio/storyboards/${job.projectId}` : null,
    });
  }

  return items;
}

export function queryProjectMediaLibrary(
  items: ProjectMediaItem[],
  query: {
    section?: ProjectMediaSection;
    q?: string;
    projectId?: string;
    status?: ProjectMediaStatus | "all";
    sort?: ProjectMediaSort;
    page?: number;
    pageSize?: number;
  }
): {
  items: ProjectMediaItem[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<ProjectMediaSection, number>;
  projects: Array<{ id: string; title: string }>;
} {
  const section = query.section ?? "all";
  const status = query.status ?? "all";
  const sort = query.sort ?? "newest";
  const pageSize = Math.min(48, Math.max(1, query.pageSize ?? PROJECT_MEDIA_PAGE_SIZE));
  const needle = trimmed(query.q).toLowerCase();
  const projectId = trimmed(query.projectId);

  const counts = {
    all: 0,
    images: 0,
    videos: 0,
    audio: 0,
    processing: 0,
    failed: 0,
    archive: 0,
  };
  for (const item of items) {
    counts[item.section] += 1;
    if (item.section === "images" || item.section === "videos" || item.section === "audio") {
      counts.all += 1;
    }
  }

  const filtered = items.filter((item) => {
    if (section === "all") {
      if (item.section !== "images" && item.section !== "videos" && item.section !== "audio") {
        return false;
      }
    } else if (item.section !== section) {
      return false;
    }
    if (status !== "all" && item.status !== status) {
      return false;
    }
    if (projectId && item.projectId !== projectId) {
      return false;
    }
    if (needle && !item.projectTitle.toLowerCase().includes(needle)) {
      return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "name") {
      const byName = a.projectTitle.localeCompare(b.projectTitle);
      return byName || a.id.localeCompare(b.id);
    }
    const aTime = Date.parse(a.createdAt);
    const bTime = Date.parse(b.createdAt);
    const byTime = sort === "oldest" ? aTime - bTime : bTime - aTime;
    return byTime || a.id.localeCompare(b.id);
  });

  const page = Math.max(1, query.page ?? 1);
  const start = (page - 1) * pageSize;
  const projects = new Map<string, string>();
  for (const item of items) {
    if (item.projectId) {
      projects.set(item.projectId, item.projectTitle);
    }
  }

  return {
    items: sorted.slice(start, start + pageSize),
    total: sorted.length,
    page,
    pageSize,
    counts,
    projects: [...projects.entries()]
      .map(([id, title]) => ({ id, title }))
      .sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id)),
  };
}
