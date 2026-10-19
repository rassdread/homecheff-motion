import { NextResponse } from "next/server";
import { isProjectMediaSection } from "@/lib/studio-project-media-library";
import type { ProjectMediaSort, ProjectMediaStatus } from "@/lib/studio-project-media-library";
import { requireActiveUser } from "@/server/auth/permissions";
import { listProjectMediaLibraryPage } from "@/server/studio/studio-owned-project-media";

const STATUSES = new Set(["all", "completed", "processing", "failed", "archived"]);
const SORTS = new Set(["newest", "oldest", "name"]);

export async function GET(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const url = new URL(request.url);
  const sectionParam = url.searchParams.get("section");
  const section = isProjectMediaSection(sectionParam) ? sectionParam : "all";
  const statusParam = url.searchParams.get("status") ?? "all";
  const status = STATUSES.has(statusParam) ? (statusParam as ProjectMediaStatus | "all") : "all";
  const sortParam = url.searchParams.get("sort") ?? "newest";
  const sort = SORTS.has(sortParam) ? (sortParam as ProjectMediaSort) : "newest";
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "24");
  const untitled = (url.searchParams.get("untitled") ?? "Naamloze video").slice(0, 80);

  const result = await listProjectMediaLibraryPage({
    ownerId: user.id,
    untitledLabel: untitled,
    section,
    q: (url.searchParams.get("q") ?? "").slice(0, 120),
    projectId: (url.searchParams.get("projectId") ?? "").slice(0, 80),
    status,
    sort,
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 24,
  });

  return NextResponse.json({ ok: true, ...result });
}
