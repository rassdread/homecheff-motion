import { AppCard } from "@/components/ui/app-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { getActiveTranslator } from "@/i18n";
import { brand } from "@/lib/brand";

export default function Home() {
  const t = getActiveTranslator();

  return (
    <main className={`flex-1 ${brand.softGradientBg}`}>
      <section className="mx-auto flex w-full max-w-6xl flex-col px-6 py-16 sm:px-10 sm:py-20">
        <AppCard className="mx-auto w-full max-w-4xl bg-white p-8 text-center shadow-[0_20px_60px_-30px_rgba(16,185,129,0.35)] sm:p-12">
          <div className="mx-auto mb-5 flex w-fit items-center gap-3 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg border border-emerald-100 bg-white">
              <div
                className={`absolute inset-0 bg-gradient-to-br ${brand.accentGradient} opacity-90`}
              />
            </div>
            <p className="text-sm font-semibold tracking-wide text-emerald-700">
              {brand.productName}
            </p>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            {t("landing.headline")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-zinc-600 sm:text-lg">
            {t("landing.subtext")}
          </p>

          <div className="mt-8 flex flex-col items-center gap-4">
            <GradientButton href="/animate/instant" className="px-7">
              {t("landing.cta")}
            </GradientButton>
            <p className="text-xs text-zinc-500">
              {t("landing.mascotPlaceholder")}
            </p>
          </div>
        </AppCard>
      </section>
    </main>
  );
}
