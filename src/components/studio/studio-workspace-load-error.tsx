"use client";

import Link from "next/link";
import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioWorkspaceLoadFailure } from "@/lib/studio-workspace-load-error";
import { loginHref } from "@/lib/auth-login-href";

type Props = {
  failure: StudioWorkspaceLoadFailure;
  onRetry: () => void;
  retrying?: boolean;
};

export function StudioWorkspaceLoadError({ failure, onRetry, retrying = false }: Props) {
  const t = useActiveTranslator();

  const titleKey =
    failure.kind === "auth"
      ? "studio.workspace.error.authTitle"
      : failure.kind === "not_found"
        ? "studio.workspace.error.notFoundTitle"
        : failure.kind === "network" && failure.accessControl
          ? "studio.workspace.error.networkTitle"
          : "studio.workspace.error.loadTitle";

  const bodyKey =
    failure.kind === "auth"
      ? "studio.workspace.error.authBody"
      : failure.kind === "not_found"
        ? "studio.workspace.error.notFoundBody"
        : failure.kind === "network" && failure.accessControl
          ? "studio.workspace.error.networkBody"
          : "studio.workspace.error.loadBody";

  return (
    <section className="mx-auto max-w-lg px-6 py-16">
      <AppCard className="bg-white p-8 text-center">
        <h1 className="text-xl font-semibold text-zinc-900">{t(titleKey)}</h1>
        <p className="mt-2 text-sm text-zinc-600">{failure.message || t(bodyKey)}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="min-h-11 rounded-full bg-[#006D52] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#005a44] disabled:opacity-60"
          >
            {retrying ? t("button.loading") : t("studio.workspace.error.retry")}
          </button>
          <Link
            href="/studio/storyboards"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-200 px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            {t("studio.workspace.error.backToStoryboards")}
          </Link>
          {failure.kind === "auth" ?
            <Link
              href={loginHref("/studio")}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#006D52]/40 px-5 py-2.5 text-sm font-semibold text-[#006D52] hover:bg-[#006D52]/5"
            >
              {t("nav.login")}
            </Link>
          : null}
        </div>
      </AppCard>
    </section>
  );
}
