import type { Metadata } from "next";
import Link from "next/link";
import { STUDIO_PUBLIC_FAQ } from "@/lib/studio-public-faq";

export const metadata: Metadata = {
  title: "FAQ | HomeCheff Studio",
  description:
    "Plain-language Studio FAQ: plans, credits, AI limits, music, cancellation and support — aligned with Production.",
  robots: { index: true, follow: true },
};

export default function StudioFaqPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-zinc-800">
      <h1 className="text-3xl font-semibold text-zinc-900">FAQ — HomeCheff Studio</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600">
        Answers match current Production behaviour. They do not create new commercial rights. See{" "}
        <Link href="/terms" className="underline">
          Terms
        </Link>
        ,{" "}
        <Link href="/privacy" className="underline">
          Privacy
        </Link>{" "}
        and{" "}
        <Link href="/help" className="underline">
          Help
        </Link>
        .
      </p>
      <div className="mt-10 space-y-8">
        {STUDIO_PUBLIC_FAQ.map((item) => (
          <section key={item.id} id={item.id} className="scroll-mt-24">
            <h2 className="text-lg font-semibold text-zinc-900">{item.question}</h2>
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-line">{item.answer}</p>
            {item.legalSource ? (
              <p className="mt-2 text-xs text-zinc-500">Source: {item.legalSource}</p>
            ) : null}
          </section>
        ))}
      </div>
      <nav className="mt-12 flex flex-wrap gap-4 border-t border-zinc-200 pt-6 text-sm">
        <Link href="/pricing" className="underline">
          Pricing
        </Link>
        <Link href="/cookies" className="underline">
          Cookies
        </Link>
        <a href="mailto:support@homecheff.eu" className="underline">
          Contact
        </a>
      </nav>
    </main>
  );
}
