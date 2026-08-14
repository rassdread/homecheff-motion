import { HomePage } from "@/components/landing/home-page";
import { maybeSilentHydratePublicStudio } from "@/lib/identity/sso/public-hydrate";

/**
 * SP.2B.7 — public root stays public, but one silent SSO attempt hydrates
 * studio_session when a HomeCheff central session already exists.
 */
export default async function Home() {
  await maybeSilentHydratePublicStudio("/");
  return <HomePage />;
}
