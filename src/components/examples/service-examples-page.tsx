"use client";

import Link from "next/link";
import { SpaceGallery } from "@/components/examples/space-gallery";
import { useActiveTranslator } from "@/i18n/client";
import { listExamplesForService, type HomeCheffExampleService } from "@/lib/homecheff-examples";
import { studioVisual } from "@/lib/studio-visual-tokens";

const BACK_HREF: Record<HomeCheffExampleService, string> = {
  editor: "/editor",
  motion: "/motion",
  publish: "/publish",
  studio: "/studio",
  home: "/",
};

const BACK_KEY: Record<HomeCheffExampleService, string> = {
  editor: "examples.back.editor",
  motion: "examples.back.motion",
  publish: "examples.back.publish",
  studio: "examples.back.studio",
  home: "examples.back.home",
};

type Props = {
  service: HomeCheffExampleService;
};

export function ServiceExamplesPage({ service }: Props) {
  const t = useActiveTranslator();
  const examples = listExamplesForService(service);

  return (
    <main className={`min-h-screen ${studioVisual.pageBg}`}>
      <section className="mx-auto max-w-4xl px-6 py-10">
        <Link
          href={BACK_HREF[service]}
          className="text-sm font-semibold text-emerald-300 hover:text-emerald-200"
          data-testid="examples-back-nav"
        >
          ← {t(BACK_KEY[service] as never)}
        </Link>
        <header className="mt-6">
          <p className={`text-xs font-semibold uppercase tracking-widest ${studioVisual.eyebrowOnDark}`}>
            {t("landing.shared.examples" as never)}
          </p>
          <h1 className={`mt-2 text-2xl font-bold ${studioVisual.headingOnDark}`}>
            {t(`examples.page.title.${service}` as never)}
          </h1>
          <p className={`mt-2 text-sm ${studioVisual.bodyOnDark}`}>
            {t(`examples.page.subtitle.${service}` as never)}
          </p>
        </header>
        {examples.length > 0 ?
          <div className="mt-8">
            <SpaceGallery examples={examples} />
          </div>
        : (
          <p className={`mt-8 text-sm ${studioVisual.bodyOnDark}`}>{t("examples.page.empty" as never)}</p>
        )}
      </section>
    </main>
  );
}
