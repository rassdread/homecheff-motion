import type { Metadata } from "next";
import Link from "next/link";
import { StudioSiteFooter } from "@/components/layout/studio-site-footer";
import { StudioAffiliateDashboardClient } from "@/components/account/studio-affiliate-dashboard-client";

export const metadata: Metadata = {
  title: "Studio affiliate dashboard | HomeCheff Studio",
  description: "Bekijk je Studio-referrals en ecosysteem affiliate-inkomsten.",
  robots: { index: false, follow: false },
};

export default function StudioAffiliateDashboardPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              HomeCheff Studio · Affiliate
            </p>
            <h1 className="mt-1 text-2xl font-semibold">Je Studio-referrals en inkomsten</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Je ziet hier ook inkomsten die dezelfde aangebrachte leden op andere HomeCheff-platformen
              genereren.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Terug naar Studio
          </Link>
        </div>
        <StudioAffiliateDashboardClient />
        <p className="mt-6 text-sm">
          <Link href="/affiliate" className="font-medium text-zinc-800 underline-offset-2 hover:underline">
            Hoe werkt affiliate verdienen in Studio?
          </Link>
        </p>
      </main>
      <StudioSiteFooter />
    </div>
  );
}
