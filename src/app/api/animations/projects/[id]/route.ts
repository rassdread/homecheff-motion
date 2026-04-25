import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;

  const project = await prisma.animationProject.findUnique({
    where: { id },
    include: {
      images: {
        orderBy: { order: "asc" },
      },
      transitions: {
        orderBy: { order: "asc" },
      },
      exports: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json(project);
}
