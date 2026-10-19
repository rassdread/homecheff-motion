import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { findFilmForStoryboard } from "@/server/studio/studio-film-preparation";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { id } = await context.params;
  const film = await findFilmForStoryboard(user.id, id);
  if (!film) return NextResponse.json({ film: null });
  return NextResponse.json({ film: { id: film.id, title: film.title, href: `/studio/projects/${film.id}?section=scenes` } });
}
