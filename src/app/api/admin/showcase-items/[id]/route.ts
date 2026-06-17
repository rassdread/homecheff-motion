import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import {
  deleteStudioShowcaseItem,
  reorderStudioShowcaseItems,
  updateStudioShowcaseItem,
} from "@/server/studio/studio-showcase-item-service";
import type { StudioShowcaseItemInput } from "@/types/studio-showcase-item";
import { SHOWCASE_PAGE_KEYS, SHOWCASE_SERVICE_KEYS } from "@/types/studio-showcase-item";

type RouteContext = { params: Promise<{ id: string }> };

function isValidPageKey(value: string): boolean {
  return (SHOWCASE_PAGE_KEYS as readonly string[]).includes(value);
}

function isValidServiceKey(value: string | null | undefined): boolean {
  if (!value?.trim()) return true;
  return (SHOWCASE_SERVICE_KEYS as readonly string[]).includes(value.trim());
}

export async function PATCH(request: Request, context: RouteContext) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }

  const { id } = await context.params;
  const body = (await request.json()) as Partial<StudioShowcaseItemInput> & {
    reorderIds?: string[];
    reorderPageKey?: string;
  };

  if (body.reorderIds && body.reorderPageKey) {
    const items = await reorderStudioShowcaseItems(body.reorderIds, body.reorderPageKey);
    return NextResponse.json({ ok: true, items }, { status: 200 });
  }

  if (body.title !== undefined && !body.title.trim()) {
    return NextResponse.json({ error: "admin.showcase.errors.titleRequired" }, { status: 400 });
  }
  if (body.mediaUrl !== undefined && !body.mediaUrl.trim()) {
    return NextResponse.json({ error: "admin.showcase.errors.mediaRequired" }, { status: 400 });
  }
  if (body.mediaType !== undefined && body.mediaType !== "image" && body.mediaType !== "video") {
    return NextResponse.json({ error: "admin.showcase.errors.invalidMediaType" }, { status: 400 });
  }

  if (body.pageKey !== undefined && !isValidPageKey(body.pageKey)) {
    return NextResponse.json({ error: "admin.showcase.errors.invalidPageKey" }, { status: 400 });
  }
  if (body.serviceKey !== undefined && !isValidServiceKey(body.serviceKey)) {
    return NextResponse.json({ error: "admin.showcase.errors.invalidServiceKey" }, { status: 400 });
  }

  const item = await updateStudioShowcaseItem(id, body);
  if (!item) {
    return NextResponse.json({ error: "admin.showcase.errors.notFound" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, item }, { status: 200 });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }

  const { id } = await context.params;
  const deleted = await deleteStudioShowcaseItem(id);
  if (!deleted) {
    return NextResponse.json({ error: "admin.showcase.errors.notFound" }, { status: 404 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
