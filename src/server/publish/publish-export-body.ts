import type { PublishProject } from "@/types/publish-overlay";

export async function loadPublishProjectFromBody(request: Request): Promise<PublishProject | null> {
  try {
    const body = (await request.json()) as { project?: PublishProject };
    if (!body.project?.id || !body.project.videoUrl) {
      return null;
    }
    return body.project;
  } catch {
    return null;
  }
}
