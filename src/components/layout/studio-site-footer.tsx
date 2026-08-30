import Link from "next/link";
import { brand } from "@/lib/brand";

/**
 * Site legal/trust footer for marketing and account shells.
 * Intentionally lightweight — no fake security claims.
 */
export function StudioSiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 px-4 py-8 text-sm text-zinc-700">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 sm:flex-row sm:justify-between">
        <div>
          <p className="font-semibold text-zinc-900">{brand.studioProductName}</p>
          <p className="mt-1 text-xs text-zinc-500">
            Part of HomeCheff · CREATE layer · Arrias Beheer B.V.
          </p>
          <p className="mt-2 max-w-md text-xs text-zinc-500">
            HomeCheff — Everybody Eats. Opportunity across CREATE · SELL · GROW · PROMOTE — not
            guaranteed income. (NL: Iedereen eet mee.)
          </p>
        </div>
        <nav aria-label="Legal" className="grid grid-cols-2 gap-x-8 gap-y-2 sm:text-right">
          <Link href="/pricing" className="underline-offset-2 hover:underline">
            Pricing
          </Link>
          <Link href="/faq" className="underline-offset-2 hover:underline">
            FAQ
          </Link>
          <Link href="/help" className="underline-offset-2 hover:underline">
            Help
          </Link>
          <Link href="/terms" className="underline-offset-2 hover:underline">
            Terms
          </Link>
          <Link href="/privacy" className="underline-offset-2 hover:underline">
            Privacy
          </Link>
          <Link href="/cookies" className="underline-offset-2 hover:underline">
            Cookies
          </Link>
          <Link href="/about" className="underline-offset-2 hover:underline">
            About
          </Link>
          <a href="https://homecheff.eu/ecosystem" className="underline-offset-2 hover:underline">
            Ecosystem
          </a>
          <a href="https://growth.homecheff.eu/legal/credits-terms" className="underline-offset-2 hover:underline">
            HC Credits
          </a>
          <a href="mailto:support@homecheff.eu" className="underline-offset-2 hover:underline">
            Contact
          </a>
          <a href="https://homecheff.eu/affiliate" className="underline-offset-2 hover:underline">
            Affiliate
          </a>
        </nav>
      </div>
    </footer>
  );
}
