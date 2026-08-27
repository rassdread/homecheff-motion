import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy notice | HomeCheff Studio",
  description:
    "How HomeCheff Studio processes account, project, media and billing data. LEGAL_REVIEW_RECOMMENDED.",
  robots: { index: true, follow: true },
};

export default function StudioPrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-zinc-800">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
        LEGAL_REVIEW_RECOMMENDED — operational product notice
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-zinc-900">Privacy notice — HomeCheff Studio</h1>
      <p className="mt-4 text-sm leading-relaxed text-zinc-600">
        HomeCheff Studio is the CREATE layer of the HomeCheff ecosystem, operated under the HomeCheff
        brand by <strong>Arrias Beheer B.V.</strong> Ecosystem Privacy Policy:{" "}
        <a className="underline" href="https://homecheff.eu/privacy">
          homecheff.eu/privacy
        </a>
        . Growth operational notice:{" "}
        <a className="underline" href="https://growth.homecheff.eu/privacy">
          growth.homecheff.eu/privacy
        </a>
        .
      </p>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">What Studio processes</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>Account identity via HomeCheff authentication / SSO.</li>
          <li>Billing via Stripe (no full card numbers stored by HomeCheff).</li>
          <li>Projects, uploads (images/video/audio), prompts, exports and generation job metadata.</li>
          <li>
            Third-party AI / media providers may process prompts and media you submit in order to
            generate results — provider terms may also apply.
          </li>
          <li>Optional anonymous usage analytics where enabled in account privacy settings.</li>
        </ul>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">Your content</h2>
        <p className="text-sm leading-relaxed">
          You should only upload material you have rights to use. Studio needs a limited licence to
          store, process and render your content to provide the service. HomeCheff does not claim
          unnecessary ownership of your original uploads. AI outputs may contain errors, may not be
          unique, and are not guaranteed commercially clear in every jurisdiction — review before
          publishing.
        </p>
        <p className="text-sm text-amber-900">
          LEGAL_REVIEW_RECOMMENDED: jurisdiction-specific AI IP and likeness/personality rights.
        </p>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">Retention & deletion</h2>
        <p className="text-sm leading-relaxed">
          Cancelling a subscription does not by itself delete projects. Billing records may be
          retained. Contact{" "}
          <a className="underline" href="mailto:support@homecheff.eu">
            support@homecheff.eu
          </a>{" "}
          for account/data requests.
        </p>
      </section>

      <nav className="mt-12 flex flex-wrap gap-4 border-t border-zinc-200 pt-6 text-sm">
        <Link href="/terms" className="underline">
          Terms
        </Link>
        <Link href="/cookies" className="underline">
          Cookies
        </Link>
        <Link href="/help" className="underline">
          Help
        </Link>
        <Link href="/pricing" className="underline">
          Pricing
        </Link>
      </nav>
    </main>
  );
}
