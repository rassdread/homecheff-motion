"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useActiveTranslator } from "@/i18n/client";
import { readHcProjectWorkflowStatus } from "@/lib/hc-project-lifecycle";
import { fetchRecentLibraryAdditions } from "@/lib/library-consistency-client";
import {
  getRecentProjectsClientSnapshot,
  getRecentProjectsServerSnapshot,
  subscribeRecentProjects,
} from "@/lib/universe-home-sections-snapshot";
import { UniverseProductionLine } from "@/components/suite/universe/universe-production-line";
import { UniverseHomeGettingStarted } from "@/components/suite/universe/universe-home-getting-started";
import type { LibraryConsistencyRecord } from "@/types/library-consistency";

const EMPTY_LIBRARY_RECORDS: LibraryConsistencyRecord[] = [];

export function UniverseHomeSections() {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const isAuthenticated = Boolean(session.resolved && session.user);
  const [libraryRecords, setLibraryRecords] = useState<LibraryConsistencyRecord[]>(EMPTY_LIBRARY_RECORDS);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    void (async () => {
      // SP.2D-F: recent slice only — do not trigger fat library-consistency query bootstrap.
      const records = await fetchRecentLibraryAdditions(8);
      setLibraryRecords(records);
    })();
  }, [isAuthenticated]);

  const recentProjects = useSyncExternalStore(
    subscribeRecentProjects,
    getRecentProjectsClientSnapshot,
    getRecentProjectsServerSnapshot
  );

  const recentAssets = useMemo(
    () =>
      [...libraryRecords]
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        .slice(0, 4),
    [libraryRecords]
  );

  return (
    <div className="universe-home-sections space-y-10">
      <section className="home-row" data-testid="universe-home-recent-projects">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">
          {t("universe.home.recentProjects.title" as never)}
        </h2>
        {recentProjects.length === 0 ? (
          <p className="mt-3 text-sm text-white/55">{t("universe.home.recentProjects.empty" as never)}</p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {recentProjects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects?hcProject=${project.id}`}
                  className="block rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white/85 hover:bg-white/10"
                >
                  <span className="font-medium">{project.title}</span>
                  <span className="mt-1 block text-xs text-white/50">
                    {readHcProjectWorkflowStatus(project)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="home-row" data-testid="universe-home-recent-assets">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">
          {t("universe.home.recentAssets.title" as never)}
        </h2>
        {recentAssets.length === 0 ? (
          <p className="mt-3 text-sm text-white/55">{t("universe.home.recentAssets.empty" as never)}</p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {recentAssets.map((asset) => (
              <li key={asset.id}>
                <Link
                  href="/library"
                  className="block rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white/85 hover:bg-white/10"
                >
                  <span className="font-medium">{asset.assetName}</span>
                  <span className="mt-1 block text-xs text-white/50">{asset.category}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="home-row" data-testid="universe-home-capabilities">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">
          {t("universe.home.capabilities.title" as never)}
        </h2>
        <p className="mt-3 text-sm text-white/65">{t("universe.home.capabilities.lead" as never)}</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {(
            [
              "universe.home.capabilities.motion",
              "universe.home.capabilities.editor",
              "universe.home.capabilities.studio",
              "universe.home.capabilities.publish",
            ] as const
          ).map((key) => (
            <li key={key} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/78">
              {t(key as never)}
            </li>
          ))}
        </ul>
      </section>

      <section className="home-row" data-testid="universe-home-why-studio">
        <UniverseProductionLine />
      </section>

      <UniverseHomeGettingStarted isAuthenticated={isAuthenticated} />
    </div>
  );
}
