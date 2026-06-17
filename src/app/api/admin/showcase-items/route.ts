import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import { validateShowcaseItemInput } from "@/lib/showcase-media-rules";
import {
  createStudioShowcaseItem,
  listStudioShowcaseItemsAdmin,
} from "@/server/studio/studio-showcase-item-service";
import type { StudioShowcaseItemInput } from "@/types/studio-showcase-item";
import { SHOWCASE_PAGE_KEYS, SHOWCASE_SERVICE_KEYS } from "@/types/studio-showcase-item";

function parseActiveParam(raw: string | null): boolean | null {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return null;
}

function isValidPageKey(value: string): boolean {
  return (SHOWCASE_PAGE_KEYS as readonly string[]).includes(value);
}

function isValidServiceKey(value: string | null | undefined): boolean {
  if (!value?.trim()) return true;
  return (SHOWCASE_SERVICE_KEYS as readonly string[]).includes(value.trim());
}

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }

  const url = new URL(request.url);
  const items = await listStudioShowcaseItemsAdmin({
    pageKey: url.searchParams.get("pageKey"),
    serviceKey: url.searchParams.get("serviceKey"),
    active: parseActiveParam(url.searchParams.get("active")),
    locale: url.searchParams.get("locale"),
  });

  return NextResponse.json({ ok: true, items }, { status: 200 });
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }

  const body = (await request.json()) as StudioShowcaseItemInput;
  const validation = validateShowcaseItemInput(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.errorKey }, { status: 400 });
  }
  if (!isValidPageKey(body.pageKey)) {
    return NextResponse.json({ error: "admin.showcase.errors.invalidPageKey" }, { status: 400 });
  }
  if (!isValidServiceKey(body.serviceKey)) {
    return NextResponse.json({ error: "admin.showcase.errors.invalidServiceKey" }, { status: 400 });
  }

  const item = await createStudioShowcaseItem(body, gate.id);
  return NextResponse.json({ ok: true, item }, { status: 201 });
}
