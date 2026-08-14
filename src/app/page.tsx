import { HomePage } from "@/components/landing/home-page";
import { maybeSilentHydratePublicStudio } from "@/lib/identity/sso/public-hydrate";

export const dynamic = "force-dynamic";

/**
 * SP.2B.7 — public root stays public, but one silent SSO attempt hydrates
 * studio_session when a HomeCheff central session already exists.
 * Prefer middleware hard 307; this is a belt-and-suspenders server path.
 */
export default async function Home() {
  await maybeSilentHydratePublicStudio("/");
  return <HomePage />;
}
