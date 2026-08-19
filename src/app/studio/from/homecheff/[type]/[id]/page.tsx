import { StudioPx4ContextualIntentChooser } from "@/components/studio/studio-px4-contextual-intent-chooser";
import { StudioPx4SourceBanner } from "@/components/studio/studio-px4-source-banner";
import { redirectUnauthenticatedPrivate } from "@/lib/identity/sso/private-entry";
import { prisma } from "@/lib/prisma";
import { fetchHomecheffOwnerSourceContext } from "@/lib/studio-px4-homecheff-fetch";
import {
  isPx4OpaqueId,
  isPx4SourceType,
  studioPx4CanonicalPath,
  type Px4ResolveResult,
} from "@/lib/studio-px4-source-context";
import { getAuthenticatedUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ type: string; id: string }> };

export default async function StudioPx4HomecheffFromPage({ params }: Props) {
  const { type: rawType, id: rawId } = await params;
  const type = rawType.trim().toLowerCase();
  const id = rawId.trim();
  const returnTo = studioPx4CanonicalPath(isPx4SourceType(type) ? type : "product", id);

  const user = await getAuthenticatedUser();
  if (!user) {
    await redirectUnauthenticatedPrivate(returnTo);
  }

  let result: Px4ResolveResult = { ok: false, reason: "invalid" };
  if (user && isPx4SourceType(type) && isPx4OpaqueId(id)) {
    const linked = await prisma.user.findUnique({
      where: { id: user.id },
      select: { centralUserId: true },
    });
    const centralUserId = linked?.centralUserId?.trim() ?? "";
    result = centralUserId
      ? await fetchHomecheffOwnerSourceContext({
          centralUserId,
          sourceType: type,
          sourceId: id,
        })
      : { ok: false, reason: "unresolved" };
  } else if (user) {
    result = { ok: false, reason: "unresolved" };
  }

  const quickVideoHref =
    result.ok && result.context.media.length > 0
      ? `/studio/from/homecheff/${type}/${id}/quick-video`
      : "/studio/photo-video";

  return (
    <main className="min-h-[70vh] flex-1 bg-gradient-to-b from-zinc-50 to-white">
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
        <StudioPx4SourceBanner result={result} />
        <StudioPx4ContextualIntentChooser quickVideoHref={quickVideoHref} />
      </div>
    </main>
  );
}
