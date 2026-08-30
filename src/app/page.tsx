import { HomePage } from "@/components/landing/home-page";
import { maybeSilentHydrateWhenEcosystemSessionLikely } from "@/lib/identity/sso/ecosystem-epoch-hydrate";

export const dynamic = "force-dynamic";

/**
 * SEO 0 — public marketing homepage for cold anonymous / crawlers.
 * If hc_eco_epoch indicates a HomeCheff IdP session → silent Studio auto-entry.
 */
export default async function Home() {
  await maybeSilentHydrateWhenEcosystemSessionLikely("/");
  return <HomePage />;
}
