"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { TranslationKey } from "@/i18n";
import { useActiveTranslator } from "@/i18n/client";

type EmptyStateProps = {
  titleKey: TranslationKey;
  hintKey?: TranslationKey;
  ctaKey?: TranslationKey;
  ctaHref?: string;
  icon?: ReactNode;
};

export function MotionEmptyState({ titleKey, hintKey, ctaKey, ctaHref, icon }: EmptyStateProps) {
  const t = useActiveTranslator();

  return (
    <div className="rounded-2xl border border-dashed border-[#006D52]/25 bg-gradient-to-br from-[#006D52]/5 to-white px-6 py-10 text-center">
      {icon ?
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#006D52]/10 text-xl">
          {icon}
        </div>
      : null}
      <p className="text-base font-semibold text-zinc-900">{t(titleKey)}</p>
      {hintKey ?
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-600">{t(hintKey)}</p>
      : null}
      {ctaKey && ctaHref ?
        <Link
          href={ctaHref}
          prefetch={false}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[#006D52] px-5 py-2 text-sm font-semibold text-white hover:bg-[#005a44]"
        >
          {t(ctaKey)}
        </Link>
      : null}
    </div>
  );
}

export function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="h-5 w-2/3 rounded bg-zinc-100" />
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full rounded bg-zinc-100" />
            <div className="h-3 w-5/6 rounded bg-zinc-100" />
          </div>
          <div className="mt-6 flex gap-2">
            <div className="h-9 w-20 rounded-full bg-zinc-100" />
            <div className="h-9 w-16 rounded-full bg-zinc-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function VersionListSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      {[0, 1].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="aspect-video w-full rounded-xl bg-zinc-100 sm:max-w-[240px]" />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="h-5 w-1/2 rounded bg-zinc-100" />
              <div className="h-3 w-1/3 rounded bg-zinc-100" />
              <div className="flex gap-2 pt-2">
                <div className="h-9 w-20 rounded-full bg-zinc-100" />
                <div className="h-9 w-24 rounded-full bg-zinc-100" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function WorkspaceLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6" aria-busy="true">
      <div className="grid animate-pulse grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <div className="hidden space-y-2 lg:block">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-10 rounded-lg bg-zinc-100" />
          ))}
        </div>
        <div className="min-h-[50vh] rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="h-6 w-1/3 rounded bg-zinc-100" />
          <div className="mt-6 space-y-3">
            <div className="h-24 rounded-xl bg-zinc-100" />
            <div className="h-24 rounded-xl bg-zinc-100" />
          </div>
        </div>
        <div className="hidden space-y-3 lg:block">
          <div className="h-4 w-2/3 rounded bg-zinc-100" />
          <div className="h-32 rounded-xl bg-zinc-100" />
        </div>
      </div>
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <main className="mx-auto min-h-[40vh] w-full max-w-3xl px-6 py-10 sm:px-10" aria-busy="true">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-24 rounded bg-zinc-100" />
        <div className="h-8 max-w-md rounded-lg bg-zinc-100" />
        <div className="h-48 rounded-2xl bg-zinc-100" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-20 rounded-xl bg-zinc-100" />
          <div className="h-20 rounded-xl bg-zinc-100" />
        </div>
      </div>
    </main>
  );
}
