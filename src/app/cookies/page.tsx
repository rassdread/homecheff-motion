import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie notice | HomeCheff Studio",
  description: "Essential session cookies and optional analytics on HomeCheff Studio.",
  robots: { index: true, follow: true },
};

export default function StudioCookiesPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-zinc-800">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
        LEGAL_REVIEW_RECOMMENDED — operational cookie notice
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-zinc-900">Cookie notice — HomeCheff Studio</h1>
      <section className="mt-8 space-y-3 text-sm leading-relaxed">
        <h2 className="text-xl font-semibold">Essential</h2>
        <p>
          Authentication / SSO session cookies and security cookies required to run Studio. These
          are not marketing trackers.
        </p>
        <h2 className="text-xl font-semibold pt-4">Optional analytics</h2>
        <p>
          Account privacy settings may allow anonymous usage analytics. Stripe may set cookies
          during Checkout / Customer Portal.
        </p>
        <p className="text-amber-900">
          LEGAL_REVIEW_RECOMMENDED: Studio does not yet ship a full CMP equivalent to Growth’s
          analytics consent banner; prefer essential-only until counsel confirms categories.
        </p>
      </section>
      <nav className="mt-12 flex flex-wrap gap-4 border-t border-zinc-200 pt-6 text-sm">
        <Link href="/privacy" className="underline">
          Privacy
        </Link>
        <Link href="/terms" className="underline">
          Terms
        </Link>
        <a className="underline" href="mailto:support@homecheff.eu">
          support@homecheff.eu
        </a>
      </nav>
    </main>
  );
}
