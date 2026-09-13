import Link from "next/link";
import { HomePage } from "@/components/landing/home-page";
import { maybeSilentHydrateWhenEcosystemSessionLikely } from "@/lib/identity/sso/ecosystem-epoch-hydrate";

export const dynamic = "force-dynamic";

/**
 * SEO 0 — public marketing homepage for cold anonymous / crawlers.
 * If hc_eco_epoch indicates a HomeCheff IdP session → silent Studio auto-entry.
 */
export default async function Home() {
  await maybeSilentHydrateWhenEcosystemSessionLikely("/");
  return (
    <>
      <HomePage />
      {/* Crawlable entity brief — visible, not cloaked; keeps client hero unchanged. */}
      <section
        aria-labelledby="studio-entity-heading"
        className="border-t border-zinc-200/80 bg-zinc-50/90 px-6 py-10 text-zinc-700"
      >
        <div className="mx-auto max-w-3xl space-y-3 text-sm leading-relaxed">
          <h2 id="studio-entity-heading" className="text-base font-semibold text-zinc-900">
            What is HomeCheff Studio?
          </h2>
          <p>
            HomeCheff Studio is the CREATE layer of HomeCheff — an ecosystem for local
            entrepreneurship, creation and earning. Studio helps people and businesses create
            promotional images, video, motion and related content for products, services and
            businesses.
          </p>
          <p>
            HomeCheff connects Marketplace, HomeCheff Studio, HomeCheff Growth and
            Affiliate/Partners in one system. Loop: CREATE → SELL → GROW → PROMOTE → EARN →
            REPEAT.
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="https://homecheff.eu/ecosystem" className="font-medium text-zinc-900 underline-offset-2 hover:underline">
              Ecosystem
            </Link>
            <Link href="https://homecheff.eu/" className="font-medium text-zinc-900 underline-offset-2 hover:underline">
              Marketplace
            </Link>
            <Link href="https://growth.homecheff.eu/" className="font-medium text-zinc-900 underline-offset-2 hover:underline">
              Growth
            </Link>
            <Link href="https://homecheff.eu/affiliate" className="font-medium text-zinc-900 underline-offset-2 hover:underline">
              Affiliate
            </Link>
            <Link href="/about" className="font-medium text-zinc-900 underline-offset-2 hover:underline">
              About
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
