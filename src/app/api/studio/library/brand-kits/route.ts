import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  createBrandKit,
  listBrandKitsForOwner,
  type StudioBrandKitPayload,
} from "@/server/studio-library/brand-kit-service";

export async function GET() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const rows = await listBrandKitsForOwner(user.id);
  return NextResponse.json({
    brandKits: rows.map((k) => ({
      id: k.id,
      name: k.name,
      description: k.description,
      projectId: k.projectId,
      kit: k.kitJson,
      favorite: k.favorite,
      status: k.status,
      createdAt: k.createdAt.toISOString(),
      updatedAt: k.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON.", code: "validation" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name : "";
  const kit =
    body.kit && typeof body.kit === "object" && !Array.isArray(body.kit)
      ? (body.kit as StudioBrandKitPayload)
      : {};

  try {
    const row = await createBrandKit({
      ownerId: user.id,
      name,
      description: typeof body.description === "string" ? body.description : "",
      projectId: typeof body.projectId === "string" ? body.projectId : null,
      kit,
    });
    return NextResponse.json(
      {
        brandKit: {
          id: row.id,
          name: row.name,
          description: row.description,
          projectId: row.projectId,
          kit: row.kitJson,
          favorite: row.favorite,
          status: row.status,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed.", code: "validation" },
      { status: 400 }
    );
  }
}
