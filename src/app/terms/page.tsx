import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms | HomeCheff Studio",
  description:
    "Studio uses HomeCheff ecosystem Subscription Terms and Credits Terms for paid plans.",
  robots: { index: true, follow: true },
};

export default function StudioTermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-zinc-800">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
        LEGAL_REVIEW_RECOMMENDED — points to published ecosystem commercial Terms
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-zinc-900">Terms — HomeCheff Studio</h1>
      <p className="mt-4 text-sm leading-relaxed">
        Paid HomeCheff Studio subscriptions are governed by the HomeCheff ecosystem{" "}
        <strong>Subscription Terms</strong> and <strong>HC Credits Terms</strong> published for
        Growth & Studio central billing:
      </p>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm">
        <li>
          <a className="underline" href="https://growth.homecheff.eu/legal/terms">
            Subscription Terms (Growth & Studio)
          </a>
        </li>
        <li>
          <a className="underline" href="https://growth.homecheff.eu/legal/credits-terms">
            HC Credits Terms
          </a>
        </li>
        <li>
          <a className="underline" href="https://homecheff.eu/terms">
            Marketplace / ecosystem Terms (homecheff.eu)
          </a>
        </li>
      </ul>
      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">AI and content rights (product policy)</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>You must have rights to everything you upload (media, music, logos, trademarks, likenesses).</li>
          <li>
            HomeCheff receives only the rights necessary to process, store, render and deliver the
            Studio service — not a broader ownership grab of your originals.
          </li>
          <li>
            AI-assisted output can contain errors, may not be unique, and is not guaranteed free of
            third-party rights in every jurisdiction. Review before commercial publication.
          </li>
          <li>
            HomeCheff does <strong>not</strong> state that AI output is always exclusively owned by
            the user. Copyright status can be jurisdiction-sensitive —{" "}
            <span className="text-amber-900">AI_IP_COUNSEL_REVIEW_REQUIRED</span>.
          </li>
          <li>Illegal, infringing or abusive use is not permitted.</li>
          <li>Provider availability and exact generation success are not guaranteed.</li>
        </ul>
      </section>
      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">Studio product notes (Production)</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>
            Certified NL B2C subscription prices: Creator €15 / Pro €29 / Studio €79 per month
            (VAT-inclusive presentation on Pricing), with monthly HC grants of 900 / 1,800 / 5,000
            respectively. Prepaid credit packs remain available separately.
          </li>
          <li>
            Failed generations are typically refunded automatically when the product marks a failed
            job; cancelled work that already started may still consume credits.
          </li>
          <li>
            Free Music (when enabled) is a curated CC0 catalog for Studio audiovisual creation
            (Quick Video). HomeCheff does not own the tracks and does not promise Content ID
            immunity. Upload only music you have rights to under My music when using your own
            audio.
          </li>
          <li>
            Affiliate creatives in Studio are creative templates — Studio does not currently host a
            Studio hosts an affiliate explanation at{" "}
            <a href="/affiliate" className="underline">
              /affiliate
            </a>
            . Live Studio commission payouts (including HC packs) stay gated until certified.
            Marketplace and Growth affiliate rules are
            product-specific.
          </li>
        </ul>
      </section>
      <nav className="mt-12 flex flex-wrap gap-4 border-t border-zinc-200 pt-6 text-sm">
        <Link href="/privacy" className="underline">
          Privacy
        </Link>
        <Link href="/cookies" className="underline">
          Cookies
        </Link>
        <Link href="/pricing" className="underline">
          Pricing
        </Link>
        <Link href="/help" className="underline">
          Help
        </Link>
      </nav>
    </main>
  );
}
